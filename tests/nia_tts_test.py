import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('nia_tts', root / 'scripts/nia_tts.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class NiaCacheTests(unittest.TestCase):
    def entry(self, clip_id, role):
        return {'id': clip_id, 'role': role, 'text': m.SCRIPTS[clip_id]['text'],
                'voice_id': m.CAST['voices'][role]['voice_id'], 'model': m.CAST['model'],
                'language': m.CAST['language'], 'speech_rate': m.CAST['speech_rate'],
                'file': 'a' * 64 + '.wav'}

    def test_wrong_speaker_and_paths_cannot_read_other_files(self):
        for clip, role in (('../.env.local', None), ('n01-return', 'xu'), ('council-question-tape', 'liang')):
            with self.assertRaises(ValueError):
                m.synthesize(clip, role)
        entry = self.entry('n01-return', 'narrator_host')
        entry['file'] = '../../.env.local'
        with patch.object(m, 'manifest', return_value={'n01-return@narrator_host': entry}), self.assertRaises(m.TTSError):
            m.entry_for('n01-return')

    def test_stale_voice_or_text_is_not_silently_used(self):
        for key in ('text', 'voice_id', 'model', 'speech_rate'):
            e = self.entry('n01-return', 'narrator_host')
            e[key] = 'stale'
            with patch.object(m, 'manifest', return_value={'n01-return@narrator_host': e}), self.assertRaises(m.TTSError):
                m.entry_for('n01-return')

    def test_cached_role_audio_is_served_without_cloud_access(self):
        clip = 'council-question-tape'
        entry = self.entry(clip, 'xu')
        with tempfile.TemporaryDirectory() as folder, patch.object(m, 'CACHE', Path(folder)):
            (Path(folder) / entry['file']).write_bytes(b'RIFF' + b'x' * 100)
            (Path(folder) / 'manifest.json').write_text(json.dumps({clip + '@xu': entry}))
            audio, cached = m.synthesize(clip, 'xu')
            self.assertTrue(cached)
            self.assertEqual(audio[:4], b'RIFF')
            with self.assertRaises(m.TTSError):
                m.synthesize(clip, 'shen')

if __name__ == '__main__': unittest.main()

class ActTwoCatalogTests(unittest.TestCase):
    def test_status_counts_the_expanded_catalog_without_a_fixed_58_gate(self):
        with patch.object(m, 'entry_for', side_effect=m.TTSError('not cached')):
            status = m.status()
        self.assertEqual(status['total_clips'], 82)
        self.assertEqual(status['cached_clips'], 0)
        self.assertFalse(status['configured'])
        self.assertEqual(sum(clip.startswith('a2-') for clip in m.SCRIPTS), 24)
