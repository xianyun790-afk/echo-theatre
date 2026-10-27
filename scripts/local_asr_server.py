"""Loopback-only ASR and TTS. Microphone input stays in memory; generated TTS is cached."""
import argparse
import io
import json
import subprocess
import threading
import time
import wave
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 1024 * 1024


def read_pcm(payload):
    try:
        with wave.open(io.BytesIO(payload), 'rb') as audio:
            if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 16000 or audio.getcomptype() != 'NONE':
                raise ValueError('需要16kHz、单声道、16bit PCM WAV。')
            if audio.getnframes() > 16000 * 25 or audio.getnframes() < 1600:
                raise ValueError('请说出一段0.1至25秒的问题。')
            return audio.readframes(audio.getnframes())
    except (wave.Error, EOFError) as exc:
        raise ValueError('音频格式无法识别。') from exc


def main():
    from nia_tts import status as tts_status, synthesize, TTSError, CAST, SCRIPTS
    from voice_playback import prepare_playback, PROFILE
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4178)
    parser.add_argument('--model', default=str(ROOT / '.local-asr/vosk-model-small-cn-0.22'))
    args = parser.parse_args()
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    model = Model(args.model)
    gate = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def reply(self, code, data):
            payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            if self.path == '/api/voice/status':
                self.reply(200, {'ready': True, 'engine': 'vosk-local', 'language': 'zh-CN', 'tts': tts_status()})
            elif self.path.startswith('/api/tts/'):
                origin = self.headers.get('Origin')
                if self.headers.get('Sec-Fetch-Site') == 'cross-site' or (origin and origin not in ('http://127.0.0.1:4177', 'http://localhost:4177')):
                    return self.reply(403, {'error': '仅接受本地试玩页面的请求。'})
                parsed = urlparse(self.path)
                clip_id = parsed.path.removeprefix('/api/tts/')
                role = parse_qs(parsed.query).get('speaker', [None])[0]
                try:
                    content, cached = synthesize(clip_id, role)
                except ValueError:
                    return self.reply(404, {'error': '没有这段配音。'})
                except TTSError as exc:
                    return self.reply(502, {'error': str(exc)})
                try:
                    content = prepare_playback(content)
                except (RuntimeError, ValueError, OSError, wave.Error, EOFError, subprocess.SubprocessError):
                    return self.reply(502, {'error': '本地配音处理失败，请重试或继续阅读字幕。'})
                self.send_response(200)
                self.send_header('Content-Type', 'audio/wav')
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Cache-Control', 'private, max-age=3600')
                self.send_header('X-Voice-Provider', 'NIA')
                self.send_header('X-Voice-Cache', 'hit' if cached else 'miss')
                self.send_header('X-Voice-Id', CAST['voices'][role or SCRIPTS[clip_id]['role']]['voice_id'])
                self.send_header('X-Voice-Playback', PROFILE)
                self.end_headers()
                try:
                    self.wfile.write(content)
                except (BrokenPipeError, ConnectionResetError):
                    pass
            else:
                self.reply(404, {'error': 'Unknown endpoint'})

        def do_POST(self):
            if self.path != '/api/transcribe':
                return self.reply(404, {'error': 'Unknown endpoint'})
            origin = self.headers.get('Origin')
            if origin and origin not in ('http://127.0.0.1:4177', 'http://localhost:4177'):
                return self.reply(403, {'error': '仅接受本地试玩页面的请求。'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length <= 0 or length > MAX_BYTES:
                    return self.reply(413, {'error': '音频过长，请分段提问。'})
                pcm = read_pcm(self.rfile.read(length))
            except (ValueError, OSError) as exc:
                return self.reply(400, {'error': str(exc)})
            if not gate.acquire(blocking=False):
                return self.reply(429, {'error': '上一段语音正在识别，请稍后重试。'})
            try:
                began = time.monotonic()
                recognizer = KaldiRecognizer(model, 16000)
                parts = []
                for offset in range(0, len(pcm), 8000):
                    if recognizer.AcceptWaveform(pcm[offset:offset + 8000]):
                        parts.append(json.loads(recognizer.Result()).get('text', ''))
                parts.append(json.loads(recognizer.FinalResult()).get('text', ''))
                text = ''.join(parts).replace(' ', '').strip()
                self.reply(200, {'text': text, 'engine': 'vosk-local', 'seconds': round(time.monotonic() - began, 2)})
            except Exception:
                self.reply(500, {'error': '本地识别失败，请重试。'})
            finally:
                gate.release()

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Local Chinese ASR ready at http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
