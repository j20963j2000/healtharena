from fastapi import APIRouter, Header
from app.database import supabase
from datetime import date, timedelta
from typing import Optional

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def calc_daily_goal_score(data: dict, goals: dict) -> float:
    """每項指標達標得1分"""
    score = 0.0
    for metric, goal in goals.items():
        val = data.get(metric)
        if val is None:
            continue
        if metric == "cigarettes":
            if val <= goal:
                score += 1
        else:
            if val >= goal:
                score += 1
    return score


def calc_improvement_score(today: dict, baseline: dict, metrics: list) -> float:
    """相對基準值的進步幅度加總"""
    score = 0.0
    for metric in metrics:
        t = today.get(metric)
        b = baseline.get(metric)
        if t is None or b is None or b == 0:
            continue
        if metric in ("weight", "body_fat", "cigarettes"):
            score += (b - t) / b * 100  # 越少越好
        else:
            score += (t - b) / b * 100  # 越多越好
    return score


@router.get("/{arena_id}")
async def get_leaderboard(arena_id: str, user_id: str = Header(...)):
    # Fetch arena rules
    arena = supabase.table("arenas").select("*").eq("id", arena_id).single().execute()
    if not arena.data:
        return []

    rules = arena.data["rules"]
    metrics: list = rules.get("metrics", [])
    scoring_methods: list = rules.get("scoring_methods", ["daily_goal"])
    daily_goals: dict = rules.get("daily_goal") or {}
    start_date: str = arena.data["start_date"]
    today = str(date.today())

    # Fetch all members
    members = (
        supabase.table("arena_members")
        .select("user_id, profiles(username, avatar_url)")
        .eq("arena_id", arena_id)
        .execute()
    )

    result = []
    for member in members.data:
        uid = member["user_id"]
        username = member["profiles"]["username"] if member.get("profiles") else uid[:8]
        avatar_url = member["profiles"].get("avatar_url") if member.get("profiles") else None

        # Today's data
        today_data_res = (
            supabase.table("health_data")
            .select("*")
            .eq("user_id", uid)
            .eq("date", today)
            .execute()
        )
        today_data = today_data_res.data[0] if today_data_res.data else {}

        # Baseline (first day or start_date)
        baseline_res = (
            supabase.table("health_data")
            .select("*")
            .eq("user_id", uid)
            .eq("date", start_date)
            .execute()
        )
        baseline = baseline_res.data[0] if baseline_res.data else {}

        # All data for cumulative scores
        all_data_res = (
            supabase.table("health_data")
            .select("*")
            .eq("user_id", uid)
            .gte("date", start_date)
            .lte("date", today)
            .execute()
        )
        all_data = all_data_res.data or []

        # Calculate scores
        total_score = 0.0

        if "daily_goal" in scoring_methods and daily_goals:
            total_score += sum(calc_daily_goal_score(d, daily_goals) for d in all_data)

        if "improvement" in scoring_methods and baseline:
            total_score += calc_improvement_score(today_data, baseline, metrics)

        result.append({
            "user_id": uid,
            "username": username,
            "avatar_url": avatar_url,
            "total_score": round(total_score, 2),
            "today_steps": today_data.get("steps", 0) or 0,
            "today_water": today_data.get("water_ml", 0) or 0,
            "weight": today_data.get("weight"),
            "body_fat": today_data.get("body_fat"),
            "today_data": {m: today_data.get(m) for m in metrics},
        })

    # Sort by score, then add rank
    result.sort(key=lambda x: x["total_score"], reverse=True)

    # final_ranking bonus: top gets members count pts, last gets 1
    if "final_ranking" in scoring_methods:
        n = len(result)
        for i, r in enumerate(result):
            r["total_score"] = round(r["total_score"] + (n - i), 2)

    for i, r in enumerate(result):
        r["rank"] = i + 1

    return result
