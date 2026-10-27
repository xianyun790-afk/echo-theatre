"""Local playback preparation: retain speech samples, normalize level, pad the edges."""
import array
import hashlib
import io
import json
import math
import shutil
import subprocess
import sys
import tempfile
import threading
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.local-asr/senseaudio/playback'
PROFILE = 'clear-pcm-v1'
RATE = 32000
LEAD_MS = 120
TAIL_MS = 80
TARGET_RMS_DB = -20
PEAK_CEILING_DB = -3
GATE = threading.Lock()


def normalize_pcm_wav(content):
    with wave.open(io.BytesIO(content), 'rb') as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (1, 2, RATE) or source.getcomptype() != 'NONE':
            raise ValueError('Playback preparation requires mono 32kHz PCM16 WAV')
        samples = array.array('h', source.readframes(source.getnframes()))
    if sys.byteorder != 'little':
        samples.byteswap()
    if not samples or len(samples) > RATE * 120:
        raise ValueError('Invalid speech duration')
    peak = max(abs(sample) for sample in samples)
    frame_size = RATE // 100
    active_energy = active_samples = 0
    for offset in range(0, len(samples), frame_size):
        frame = samples[offset:offset + frame_size]
        energy = sum(sample * sample for sample in frame)
        if math.sqrt(energy / len(frame)) >= 64:
            active_energy += energy
            active_samples += len(frame)
    rms = math.sqrt(active_energy / active_samples) if active_samples else 0
    target = 32768 * 10 ** (TARGET_RMS_DB / 20)
    ceiling = 32767 * 10 ** (PEAK_CEILING_DB / 20)
    gain = min(target / rms, ceiling / peak, 6.0) if rms and peak else 1.0
    # No trimming, time stretching, pitch shifting or phoneme-dependent processing.
    # Silence absorbs playback startup timing; the first original syllable stays intact.
    normalized = array.array('h', [0] * (RATE * LEAD_MS // 1000))
    normalized.extend(round(sample * gain) for sample in samples)
    normalized.extend([0] * (RATE * TAIL_MS // 1000))
    if sys.byteorder != 'little':
        normalized.byteswap()
    result = io.BytesIO()
    with wave.open(result, 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(normalized.tobytes())
    db = lambda amplitude: round(20 * math.log10(amplitude / 32768), 2) if amplitude else None
    return result.getvalue(), {
        'profile': PROFILE, 'gain_db': round(20 * math.log10(gain), 2),
        'source_peak_dbfs': db(peak), 'output_peak_dbfs': db(peak * gain),
        'source_voiced_rms_dbfs': db(rms), 'output_voiced_rms_dbfs': db(rms * gain),
        'lead_ms': LEAD_MS, 'tail_ms': TAIL_MS,
        'source_samples': len(samples), 'output_samples': len(normalized),
    }


def prepare_playback(content):
    digest = hashlib.sha256(PROFILE.encode() + content).hexdigest()
    path = CACHE / (digest + '.wav')
    with GATE:
        if path.exists():
            return path.read_bytes()
        CACHE.mkdir(parents=True, exist_ok=True)
        pcm = content
        if not content.startswith(b'RIFF'):
            with tempfile.TemporaryDirectory(prefix='echo-speech-') as folder:
                source, output = Path(folder) / 'source.mp3', Path(folder) / 'decoded.wav'
                source.write_bytes(content)
                if shutil.which('afconvert'):
                    command = ['afconvert', '-f', 'WAVE', '-d', 'LEI16@32000', '-c', '1', str(source), str(output)]
                elif shutil.which('ffmpeg'):
                    command = ['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-ar', str(RATE), '-ac', '1', '-c:a', 'pcm_s16le', str(output)]
                else:
                    raise RuntimeError('Local audio decoder unavailable')
                subprocess.run(command, check=True, capture_output=True, timeout=15)
                pcm = output.read_bytes()
        rendered, metadata = normalize_pcm_wav(pcm)
        temporary = path.with_suffix('.tmp')
        temporary.write_bytes(rendered)
        temporary.replace(path)
        path.with_suffix('.json').write_text(json.dumps(metadata, indent=2) + '\n')
        return rendered
