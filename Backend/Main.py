from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# This allows your React app (on port 5173) to talk to this API
# EXAMPLE OF WHAT API LOOKS LIKE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "The Python backend is ALIVE!"}

@app.get("/api/status")
async def get_status():
    return {"status": "Connected to FastAPI", "database": "Ready to setup"}