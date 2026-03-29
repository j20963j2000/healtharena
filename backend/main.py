from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, arenas, reports, leaderboard, friends
from app.scheduler.jobs import start_scheduler
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="HealthArena API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(arenas.router)
app.include_router(reports.router)
app.include_router(leaderboard.router)
app.include_router(friends.router)


@app.on_event("startup")
async def startup():
    start_scheduler()


@app.get("/")
async def root():
    return {"message": "HealthArena API is running 💪"}
