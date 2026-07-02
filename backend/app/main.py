import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend_api")

app = FastAPI(title="Smart Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    logger.info("Health check endpoint verified.")
    return {
        "status": "healthy",
        "message": "FastAPI backend service is running smoothly"
    }