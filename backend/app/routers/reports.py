from fastapi import APIRouter, Header
from app.database import supabase
from typing import List

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{arena_id}", )
async def get_arena_reports(arena_id: str, user_id: str = Header(...)):
    result = (
        supabase.table("daily_reports")
        .select("*")
        .eq("arena_id", arena_id)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )
    return result.data
