"""SenseAudio TTS for fixed first-act scripts. Credentials never leave the server."""
import hashlib
import copy
import json
import os
import re
import threading
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'config/voices.json').read_text())
CACHE = ROOT / '.local-asr/senseaudio/cache'
GATE = threading.Lock()


class TTSError(Exception):
    pass


def api_key():
    path = ROOT / '.env.local'
    found = re.search(r'(?m)^SENSEAUDIO_API_KEY=(.+)$', path.read_text()) if path.exists() else None
    return found.group(1).strip() if found else os.environ.get('SENSEAUDIO_API_KEY', '').strip()


def status():
    return {'configured': bool(api_key()), 'provider': 'SenseAudio', 'model': CONFIG['model'],
            'voice_name': CONFIG['voices']['narrator_host']['name'],
            'dialogue': 'scripted', 'roles_share_voice': True,
            'generation_mode': 'cache-only' if CONFIG.get('cache_only') else 'online'}


def request_spec(clip_id, role=None):
    if clip_id not in CONFIG['clips']:
        raise ValueError('Unknown voice clip')
    clip = CONFIG['clips'][clip_id]
    if role and (not clip_id.startswith('council-question-') or role not in ('xu', 'shen', 'zhou', 'cheng', 'tang')):
        raise ValueError('Unknown speaker')
    voice = CONFIG['voices'][role or clip['role']]
    return {
        'model': CONFIG['model'], 'text': clip['text'], 'stream': False,
        'voice_setting': {'voice_id': voice['voice_id'], 'speed': voice['speed'], 'vol': 1, 'pitch': voice['pitch']},
        'audio_setting': {'format': 'mp3', 'sample_rate': 32000, 'bitrate': 128000, 'channel': 1},
    }


def cached_same_voice(spec):
    """Keep exact text and voice identity; only reuse previously rendered prosody."""
    candidates = list(CONFIG['voices'].values()) + [{'speed': 0.94, 'pitch': -1}]
    for voice in candidates:
        if voice.get('voice_id', spec['voice_setting']['voice_id']) != spec['voice_setting']['voice_id']:
            continue
        candidate = copy.deepcopy(spec)
        candidate['voice_setting'].update(speed=voice['speed'], pitch=voice['pitch'])
        digest = hashlib.sha256(json.dumps(candidate, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        path = CACHE / (digest + '.mp3')
        if path.exists():
            return path.read_bytes()
    return None


def synthesize(clip_id, role=None):
    spec = request_spec(clip_id, role)
    digest = hashlib.sha256(json.dumps(spec, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (digest + '.mp3')
    with GATE:
        if path.exists():
            return path.read_bytes(), True
        if CONFIG.get('cache_only'):
            fallback = cached_same_voice(spec)
            if fallback:
                return fallback, True
            raise TTSError('当前使用本地配音，这段音频尚未缓存；可以继续阅读字幕。')
        key = api_key()
        if not key:
            raise TTSError('SenseAudio 尚未配置，请检查本机服务端密钥。')
        request = urllib.request.Request(
            'https://api.senseaudio.cn/v1/t2a_v2', data=json.dumps(spec).encode(),
            headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'},
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                raw = response.read(20 * 1024 * 1024)
            result = json.loads(raw)
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                raise TTSError('SenseAudio 密钥鉴权失败，请检查本项目的服务端配置。') from None
            raise TTSError('SenseAudio 请求失败，请检查账号额度和音色权限。') from None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            raise TTSError('SenseAudio 暂时无法连接，请稍后重试。') from None
        code = result.get('base_resp', {}).get('status_code', 0)
        if code:
            if '冻结' in str(result.get('base_resp', {}).get('status_msg', '')):
                fallback = cached_same_voice(spec)
                if fallback:
                    return fallback, True
                raise TTSError('SenseAudio 计费账户已被冻结，暂时无法生成新配音；请恢复账户后重试。')
            if str(code) == '403':
                raise TTSError('当前账号没有所选音色的调用权限，请更换已授权音色。')
            raise TTSError('SenseAudio 合成失败，请检查账号额度和音色配置。')
        try:
            content = bytes.fromhex(result.get('data', {}).get('audio', ''))
        except (ValueError, TypeError):
            content = b''
        if len(content) < 100:
            raise TTSError('SenseAudio 未返回有效音频，请重试。')
        temporary = path.with_suffix('.tmp')
        temporary.write_bytes(content)
        temporary.replace(path)
        return content, False
