from fastapi import APIRouter, HTTPException, Header
from app.models.schemas import ArenaCreate, ArenaResponse, ArenaStatus
from app.database import supabase
from typing import List
from datetime import date
import uuid
import random
import string


def compute_arena_status(arena: dict) -> str:
    today = date.today().isoformat()
    if arena["status"] == ArenaStatus.FINISHED.value:
        return ArenaStatus.FINISHED.value
    if today < arena["start_date"]:
        return ArenaStatus.PENDING.value
    if today > arena["end_date"]:
        return ArenaStatus.FINISHED.value
    return ArenaStatus.ACTIVE.value


def sync_statuses(arenas: list) -> list:
    """Update status in DB for any arena whose status has drifted, return updated list."""
    updated = []
    for a in arenas:
        correct = compute_arena_status(a)
        if a["status"] != correct:
            supabase.table("arenas").update({"status": correct}).eq("id", a["id"]).execute()
            a = {**a, "status": correct}
        updated.append(a)
    return updated

router = APIRouter(prefix="/arenas", tags=["arenas"])


def generate_invite_code(length=8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/", response_model=ArenaResponse)
async def create_arena(arena: ArenaCreate, user_id: str = Header(...)):
    import traceback
    try:
     return await _create_arena(arena, user_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def _create_arena(arena: ArenaCreate, user_id: str):
    result = (
        supabase.table("arenas")
        .insert({
            "creator_id": user_id,
            "name": arena.name,
            "description": arena.description,
            "rules": arena.rules.model_dump(mode="json"),
            "reward_winner": arena.reward_winner,
            "penalty_loser": arena.penalty_loser,
            "start_date": str(arena.start_date),
            "end_date": str(arena.end_date),
            "max_members": arena.max_members,
            "report_hour": arena.report_hour,
            "status": ArenaStatus.PENDING.value,
            "invite_code": generate_invite_code(),
        })
        .execute()
    )
    arena_data = result.data[0]

    # Auto-join creator
    supabase.table("arena_members").insert({
        "arena_id": arena_data["id"],
        "user_id": user_id,
    }).execute()

    return arena_data


@router.get("/", response_model=List[ArenaResponse])
async def list_my_arenas(user_id: str = Header(...)):
    memberships = (
        supabase.table("arena_members")
        .select("arena_id")
        .eq("user_id", user_id)
        .execute()
    )
    arena_ids = [m["arena_id"] for m in memberships.data]
    if not arena_ids:
        return []
    result = supabase.table("arenas").select("*").in_("id", arena_ids).execute()
    return sync_statuses(result.data)


@router.post("/join/{invite_code}", response_model=ArenaResponse)
async def join_arena(invite_code: str, user_id: str = Header(...)):
    arena = (
        supabase.table("arenas")
        .select("*")
        .eq("invite_code", invite_code)
        .single()
        .execute()
    )
    if not arena.data:
        raise HTTPException(status_code=404, detail="競技場不存在")

    arena_data = arena.data
    if arena_data["status"] == ArenaStatus.FINISHED:
        raise HTTPException(status_code=400, detail="競技場已結束")

    # Check max members
    if arena_data["max_members"]:
        count = (
            supabase.table("arena_members")
            .select("*", count="exact")
            .eq("arena_id", arena_data["id"])
            .execute()
        )
        if count.count >= arena_data["max_members"]:
            raise HTTPException(status_code=400, detail="競技場已滿員")

    supabase.table("arena_members").upsert({
        "arena_id": arena_data["id"],
        "user_id": user_id,
    }, on_conflict="arena_id,user_id").execute()

    return arena_data


@router.get("/{arena_id}/leaderboard")
async def get_leaderboard(arena_id: str, user_id: str = Header(...)):
    result = (
        supabase.table("arena_leaderboard")
        .select("*")
        .eq("arena_id", arena_id)
        .order("total_score", desc=True)
        .execute()
    )
    return result.data
