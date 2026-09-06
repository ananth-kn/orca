import sys
from pathlib import Path
import os
import uvicorn
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent
app_dir = backend_dir / "app"
for p in (str(backend_dir), str(app_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    print(f"🌊 Starting ORCA Marine Intelligence API on http://{host}:{port} ...")
    print(f"📖 Swagger API Docs available at http://localhost:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
