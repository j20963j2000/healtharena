from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class HealthMetric(str, Enum):
    STEPS = "steps"
    WEIGHT = "weight"
    BODY_FAT = "body_fat"
    WATER_ML = "water_ml"
    CIGARETTES = "cigarettes"  # 0 = quit smoking


class ScoringMethod(str, Enum):
    DAILY_GOAL = "daily_goal"
    FINAL_RANKING = "final_ranking"
    IMPROVEMENT = "improvement"


class ArenaStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    FINISHED = "finished"


# --- Health Data ---
class HealthDataCreate(BaseModel):
    date: date
    steps: Optional[int] = None
    weight: Optional[float] = None
    body_fat: Optional[float] = None
    water_ml: Optional[int] = None
    cigarettes: Optional[int] = None
    source: str = "manual"  # manual | healthkit


class HealthDataResponse(HealthDataCreate):
    id: str
    user_id: str
    created_at: datetime


# --- Arena ---
class ArenaRule(BaseModel):
    metrics: List[HealthMetric]
    scoring_methods: List[ScoringMethod]
    daily_goal: Optional[dict] = None  # e.g. {"steps": 10000, "water_ml": 2000}


class ArenaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules: ArenaRule
    reward_winner: str
    penalty_loser: str
    start_date: date
    end_date: date
    max_members: Optional[int] = None  # None = unlimited


class ArenaResponse(ArenaCreate):
    id: str
    creator_id: str
    status: ArenaStatus
    invite_code: str
    created_at: datetime


# --- Daily Report ---
class DailyReportResponse(BaseModel):
    id: str
    arena_id: str
    date: date
    content: str
    suggestions: List[dict]
    created_at: datetime
