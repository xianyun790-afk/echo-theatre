"""Serve pre-rendered NIA role audio; gameplay never starts billable fixed-line generation."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.local-asr/nia/cache'
CAST = json.loads((ROOT / 'config/nia-voices.json').read_text())
SCRIPTS = json.loads((ROOT / 'config/voices.json').read_text())['clips']
QUESTION_ROLES = ('xu', 'shen', 'zhou', 'cheng', 'tang')


class TTSError(Exception):
    pass


def manifest():
    try:
        return json.loads((CACHE / 'manifest.json').read_text())
    except (OSError, ValueError):
        return {}


def entry_for(clip_id, role=None):
    if clip_id not in SCRIPTS:
        raise ValueError('Unknown clip')
    if role and (not clip_id.startswith('council-question-') or role not in QUESTION_ROLES):
        raise ValueError('Unknown speaker')
    clip = SCRIPTS[clip_id]
    role = role or clip['role']
    entry = manifest().get(clip_id + '@' + role, {})
    expected = {'id': clip_id, 'role': role, 'text': clip['text'],
                'voice_id': CAST['voices'][role]['voice_id'], 'model': CAST['model'],
                'language': CAST['language'], 'speech_rate': CAST['speech_rate']}
    if any(entry.get(key) != value for key, value in expected.items()) or not re.fullmatch(r'[0-9a-f]{64}\.wav', entry.get('file', '')):
        raise TTSError('这段角色配音尚未准备好，请继续阅读字幕。')
    return entry


def synthesize(clip_id, role=None):
    entry = entry_for(clip_id, role)
    try:
        audio = (CACHE / entry['file']).read_bytes()
    except OSError:
        raise TTSError('这段角色配音的本地文件缺失。') from None
    if len(audio) < 100 or not audio.startswith(b'RIFF'):
        raise TTSError('这段角色配音的本地文件损坏。')
    return audio, True


def status():
    count = 0
    for clip_id in SCRIPTS:
        for role in (None, *QUESTION_ROLES) if clip_id.startswith('council-question-') else (None,):
            try:
                entry = entry_for(clip_id, role)
                count += (CACHE / entry['file']).is_file()
            except (ValueError, TTSError):
                pass
    total = sum(1 + (len(QUESTION_ROLES) if clip_id.startswith('council-question-') else 0) for clip_id in SCRIPTS)
    return {'configured': count == total, 'provider': 'NIA', 'model': CAST['model'],
            'voice_name': CAST['voices']['narrator_host']['name'], 'dialogue': 'scripted',
            'roles_share_voice': False, 'generation_mode': 'cache-only',
            'cached_clips': count, 'total_clips': total,
            'voices': {role: {'name': v['name'], 'voice_id': v['voice_id']} for role, v in CAST['voices'].items()}}
