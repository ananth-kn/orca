import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    print(f"🌊 Starting ORCA Marine Intelligence API on http://{host}:{port} ...")
    print(f"📖 Swagger API Docs available at http://localhost:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
