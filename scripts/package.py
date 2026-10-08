#!/usr/bin/env python3
"""Package only public static files and guides; no build or runtime packages."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
output = root / 'dist'
output.mkdir(exist_ok=True)
name = f'link-loom-v{version}.zip'
files = [root / name for name in ('index.html', 'styles.css', 'LICENSE', 'README.md', 'README.tr.md', 'CHANGELOG.md')]
for directory in ('src', 'assets', 'docs'):
    files.extend(path for path in (root / directory).rglob('*') if path.is_file())
target = output / name
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        if path.is_symlink():
            raise RuntimeError(f'Unexpected symlink: {path}')
        archive.write(path, path.relative_to(root).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    for path in files:
        assert archive.read(path.relative_to(root).as_posix()) == path.read_bytes()
    assert 'src/storage.js' in archive.namelist()
digest = hashlib.sha256(target.read_bytes()).hexdigest()
(output / 'SHA256SUMS.txt').write_text(f'{digest}  {name}\n')
print(f'Packaged {name}: {target.stat().st_size} bytes; static files and guides match source.')
