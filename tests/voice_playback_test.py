import array
import io
import math
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import voice_playback as audio


def wav(samples):
    data = array.array('h', samples)
    if sys.byteorder != 'little':
        data.byteswap()
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as output:
        output.setparams((1, 2, audio.RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(data.tobytes())
    return buffer.getvalue()


def read(content):
    with wave.open(io.BytesIO(content), 'rb') as source:
        result = array.array('h', source.readframes(source.getnframes()))
    if sys.byteorder != 'little':
        result.byteswap()
    return result


class PlaybackTests(unittest.TestCase):
    def test_quiet_and_loud_speech_have_consistent_level_without_clipping(self):
        levels = []
        for amplitude in (1000, 16000):
            samples = [round(amplitude * math.sin(i * 2 * math.pi * 250 / audio.RATE)) for i in range(audio.RATE)]
            output, info = audio.normalize_pcm_wav(wav(samples))
            levels.append(info['output_voiced_rms_dbfs'])
            self.assertLessEqual(max(abs(x) for x in read(output)), 32767 * 10 ** (-3 / 20) + 1)
        self.assertLess(abs(levels[0] - levels[1]), .02)
        self.assertAlmostEqual(levels[0], -20, places=1)

    def test_padding_preserves_every_original_sample_position_and_the_first_syllable(self):
        original = [1000, -1000, 500, -500] * 800
        output, info = audio.normalize_pcm_wav(wav(original))
        samples = read(output)
        lead = audio.RATE * audio.LEAD_MS // 1000
        tail = audio.RATE * audio.TAIL_MS // 1000
        self.assertEqual(len(samples), len(original) + lead + tail)
        self.assertTrue(all(x == 0 for x in samples[:lead]))
        gain = samples[lead] / original[0]
        for index, sample in enumerate(original):
            self.assertLessEqual(abs(samples[lead + index] - sample * gain), 1)
        self.assertTrue(all(x == 0 for x in samples[-tail:]))
        self.assertEqual(info['source_samples'], len(original))

    def test_silence_stays_silent_and_processed_audio_is_cached(self):
        original = wav([0] * audio.RATE)
        result, info = audio.normalize_pcm_wav(original)
        self.assertEqual(info['gain_db'], 0)
        self.assertTrue(all(x == 0 for x in read(result)))
        with tempfile.TemporaryDirectory() as folder, patch.object(audio, 'CACHE', Path(folder)), patch.object(audio, 'normalize_pcm_wav', wraps=audio.normalize_pcm_wav) as render:
            first = audio.prepare_playback(original)
            self.assertEqual(first, audio.prepare_playback(original))
            self.assertEqual(render.call_count, 1)

    def test_wrong_pcm_format_is_rejected(self):
        with self.assertRaises((wave.Error, EOFError)):
            audio.normalize_pcm_wav(b'bad audio')


if __name__ == '__main__':
    unittest.main()
