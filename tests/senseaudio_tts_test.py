import importlib.util
import io
import json
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('senseaudio_tts', root / 'scripts/senseaudio_tts.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class VoiceServiceTests(unittest.TestCase):
    def setUp(self):
        online = patch.dict(module.CONFIG, {'cache_only': False})
        online.start()
        self.addCleanup(online.stop)

    def test_cache_only_never_calls_cloud_with_exact_or_older_voice_cache(self):
        for old in (False, True):
            with self.subTest(old=old), tempfile.TemporaryDirectory() as temporary, patch.object(module, 'CACHE', Path(temporary)), patch.dict(module.CONFIG, {'cache_only': True}), patch.object(module.urllib.request, 'urlopen') as remote, patch.object(module, 'api_key') as credential:
                requested = module.request_spec('n01-return')
                if old:
                    requested['voice_setting'].update(speed=0.94, pitch=-1)
                digest = hashlib.sha256(json.dumps(requested, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
                (Path(temporary) / (digest + '.mp3')).write_bytes(b'local-existing-audio')
                content, cached = module.synthesize('n01-return')
                self.assertEqual(content, b'local-existing-audio')
                self.assertTrue(cached)
                remote.assert_not_called()
                credential.assert_not_called()

    def test_cache_only_missing_audio_returns_clear_error_without_cloud(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(module, 'CACHE', Path(temporary)), patch.dict(module.CONFIG, {'cache_only': True}), patch.object(module.urllib.request, 'urlopen') as remote:
            with self.assertRaisesRegex(module.TTSError, '尚未缓存'):
                module.synthesize('n01-return')
            remote.assert_not_called()

    def test_narrator_uses_natural_speed_and_unshifted_pitch(self):
        voice = module.request_spec('n01-return')['voice_setting']
        self.assertEqual(voice['speed'], 1)
        self.assertEqual(voice['pitch'], 0)

    def test_frozen_account_can_reuse_identical_text_and_voice_without_poisoning_new_cache(self):
        requested = module.request_spec('council-question-tape')
        previous = module.request_spec('council-question-tape')
        previous['voice_setting'].update(speed=0.94, pitch=-1)
        digest = lambda spec: hashlib.sha256(json.dumps(spec, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        payload = json.dumps({'base_resp': {'status_code': 400, 'status_msg': '计费账户已被冻结'}}).encode()
        with tempfile.TemporaryDirectory() as temporary, patch.object(module, 'CACHE', Path(temporary)), patch.object(module, 'api_key', return_value='server-only-test-key'), patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(payload)):
            (Path(temporary) / (digest(previous) + '.mp3')).write_bytes(b'previous-valid-clip')
            content, cached = module.synthesize('council-question-tape')
            self.assertEqual(content, b'previous-valid-clip')
            self.assertTrue(cached)
            self.assertFalse((Path(temporary) / (digest(requested) + '.mp3')).exists())

    def test_catalog_only_accepts_known_clips_and_council_speakers(self):
        with self.assertRaises(ValueError):
            module.request_spec('../.env.local')
        with self.assertRaises(ValueError):
            module.request_spec('stool', 'xu')
        with self.assertRaises(ValueError):
            module.request_spec('council-question-print', 'unknown')
        self.assertEqual(module.request_spec('council-question-print', 'xu')['text'],
                         module.CONFIG['clips']['council-question-print']['text'])

    def test_success_is_cached_without_another_cloud_request(self):
        payload = json.dumps({'base_resp': {'status_code': 0}, 'data': {'audio': (b'ID3' + b'x' * 200).hex()}}).encode()
        with tempfile.TemporaryDirectory() as temporary, patch.object(module, 'CACHE', Path(temporary)), patch.object(module, 'api_key', return_value='server-only-test-key'), patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(payload)) as remote:
            content, cached = module.synthesize('stool')
            repeated, repeated_cache = module.synthesize('stool')
            self.assertFalse(cached)
            self.assertTrue(repeated_cache)
            self.assertEqual(content, repeated)
            self.assertEqual(remote.call_count, 1)

    def test_permission_denial_returns_a_clear_error_without_cached_audio(self):
        payload = json.dumps({'base_resp': {'status_code': 403, 'status_msg': 'no access'}}).encode()
        with tempfile.TemporaryDirectory() as temporary, patch.object(module, 'CACHE', Path(temporary)), patch.object(module, 'api_key', return_value='server-only-test-key'), patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(payload)):
            with self.assertRaises(module.TTSError):
                module.synthesize('stool')
            self.assertEqual(list(Path(temporary).glob('*.mp3')), [])

    def test_project_key_overrides_an_unrelated_shell_credential(self):
        with tempfile.TemporaryDirectory() as temporary:
            Path(temporary, '.env.local').write_text('SENSEAUDIO_API_KEY=project-test-key\n')
            with patch.object(module, 'ROOT', Path(temporary)), patch.dict(module.os.environ, {'SENSEAUDIO_API_KEY': 'unrelated-shell-key'}):
                self.assertEqual(module.api_key(), 'project-test-key')


if __name__ == '__main__':
    unittest.main()
