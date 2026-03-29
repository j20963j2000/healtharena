from fastapi import APIRouter, HTTPException, Header
from app.models.schemas import HealthDataCreate, HealthDataResponse
from app.database import supabase
from datetime import date
from typing import List, Optional

router = APIRouter(prefix="/health", tags=["health"])


@router.post("/", response_model=HealthDataResponse)
async def upsert_health_data(data: HealthDataCreate, user_id: str = Header(...)):
    result = (
        supabase.table("health_data")
        .upsert({
            "user_id": user_id,
            "date": str(data.date),
            "steps": data.steps,
            "weight": data.weight,
            "body_fat": data.body_fat,
            "water_ml": data.water_ml,
            "cigarettes": data.cigarettes,
            "source": data.source,
        }, on_conflict="user_id,date")
        .execute()
    )
    return result.data[0]


@router.get("/", response_model=List[HealthDataResponse])
async def get_health_data(
    user_id: str = Header(...),
    start: Optional[date] = None,
    end: Optional[date] = None,
):
    query = supabase.table("health_data").select("*").eq("user_id", user_id)
    if start:
        query = query.gte("date", str(start))
    if end:
        query = query.lte("date", str(end))
    result = query.order("date", desc=True).execute()
    return result.data
