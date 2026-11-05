"""Extract only the pinned PostgreSQL runtime, excluding optional GUI tools."""
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parents[1] / ".local"
with zipfile.ZipFile(root / "postgresql.zip") as archive:
    for entry in archive.infolist():
        if entry.filename.startswith(("pgsql/bin/", "pgsql/lib/", "pgsql/share/")):
            target = (root / entry.filename).resolve()
            if not target.is_relative_to(root.resolve()):
                raise ValueError("Archive path escapes runtime directory")
            archive.extract(entry, root)
