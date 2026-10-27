"""Prepare the isolated offline Chinese recognizer from PyPI and the official Vosk model host."""
import pathlib
import subprocess
import sys
import urllib.request
import venv
import zipfile

root = pathlib.Path(__file__).resolve().parents[1] / '.local-asr'
root.mkdir(exist_ok=True)
environment = root / 'venv'
if not environment.exists():
    venv.create(environment, with_pip=True)
python = environment / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
subprocess.run([str(python), '-m', 'pip', 'install', 'vosk>=0.3.44,<0.4'], check=True)
model = root / 'vosk-model-small-cn-0.22'
if not model.exists():
    archive = root / 'vosk-model-small-cn-0.22.zip'
    urllib.request.urlretrieve('https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.zip', archive)
    with zipfile.ZipFile(archive) as package:
        for name in package.namelist():
            if not (root / name).resolve().is_relative_to(root.resolve()):
                raise ValueError('Unexpected archive path')
        package.extractall(root)
print('Local Chinese recognition is ready. Start the website with npm run dev -- --port 4177 --strictPort.')
