import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
app_dir = backend_dir / "app"
for p in (str(backend_dir), str(app_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)