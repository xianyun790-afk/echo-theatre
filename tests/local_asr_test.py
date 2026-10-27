import importlib.util
import io
import unittest
import wave
from pathlib import Path

spec = importlib.util.spec_from_file_location('local_asr', Path(__file__).resolve().parents[1] / 'scripts/local_asr_server.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def wav(rate=16000, channels=1, frames=16000):
    data = io.BytesIO()
    with wave.open(data, 'wb') as file:
        file.setnchannels(channels)
        file.setsampwidth(2)
        file.setframerate(rate)
        file.writeframes(bytes(frames * channels * 2))
    return data.getvalue()

class AudioValidation(unittest.TestCase):
    def test_valid_pcm(self):
        self.assertEqual(len(module.read_pcm(wav())), 32000)
    def test_wrong_rate(self):
        with self.assertRaises(ValueError): module.read_pcm(wav(rate=48000))
    def test_wrong_channels(self):
        with self.assertRaises(ValueError): module.read_pcm(wav(channels=2))
    def test_malformed(self):
        with self.assertRaises(ValueError): module.read_pcm(b'not a recording')
    def test_too_long(self):
        with self.assertRaises(ValueError): module.read_pcm(wav(frames=16000*26))

if __name__ == '__main__': unittest.main()
