"""Prepare the fixed first-act lines once; the local server reuses existing cached audio."""
import json
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
clips = json.loads((root / 'config/voices.json').read_text())['clips']
report = []
for clip in clips:
    try:
        with urllib.request.urlopen('http://127.0.0.1:4177/api/tts/' + clip, timeout=75) as response:
            content = response.read()
            if response.headers.get_content_type() != 'audio/mpeg' or len(content) < 100:
                raise ValueError('Invalid audio')
            report.append({'clip': clip, 'ok': True, 'bytes': len(content), 'cached': response.headers.get('X-Voice-Cache') == 'hit'})
        print(f'{len(report)}/{len(clips)} {clip}: ready', flush=True)
    except Exception as error:
        report.append({'clip': clip, 'ok': False, 'error': type(error).__name__})
        print(f'{len(report)}/{len(clips)} {clip}: failed', flush=True)
(root / 'docs/voice-cache-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
if not all(item['ok'] for item in report):
    raise SystemExit(1)
