import anthropic
from app.config import settings
from app.database import supabase
from datetime import date
from typing import List


SYSTEM_PROMPT = """你是 HealthArena 的專屬戰地記者「戰神阿報」。
你的任務是每日生成競技場戰報，風格幽默犀利、偶爾出言嘲諷。

規則：
- 用繁體中文
- 語氣幽默風趣，像在幫朋友加油但順便損他一下
- 嘲諷要有創意，不能太毒，保持輕鬆娛樂感
- 每個成員都要提到，不能落下任何人
- 最後給每個人一個個人化建議，包裝成「戰神指令」
"""


def build_report_prompt(arena_name: str, members_stats: List[dict]) -> str:
    stats_text = ""
    for m in members_stats:
        stats_text += f"\n- {m['username']}：{m['stats_summary']}"

    return f"""競技場「{arena_name}」今日戰況報告

今日成員數據：{stats_text}

請生成今日戰報，包含：
1. 整體戰況描述（2-3句）
2. 每位成員的表現點評（幽默犀利）
3. 排名變化分析
4. 每人的「戰神指令」（個人化建議）
"""


async def generate_daily_report(arena_id: str, report_date: date) -> dict:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Fetch arena info
    arena = supabase.table("arenas").select("*").eq("id", arena_id).single().execute()
    arena_data = arena.data

    # Fetch members and their health data for today
    members = (
        supabase.table("arena_members")
        .select("user_id, profiles(username, avatar_url)")
        .eq("arena_id", arena_id)
        .execute()
    )

    members_stats = []
    for member in members.data:
        user_id = member["user_id"]
        username = member["profiles"]["username"] if member.get("profiles") else user_id[:8]

        health = (
            supabase.table("health_data")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", str(report_date))
            .execute()
        )

        if health.data:
            d = health.data[0]
            summary_parts = []
            if d.get("steps") is not None:
                summary_parts.append(f"步數 {d['steps']:,}")
            if d.get("weight") is not None:
                summary_parts.append(f"體重 {d['weight']}kg")
            if d.get("body_fat") is not None:
                summary_parts.append(f"體脂 {d['body_fat']}%")
            if d.get("water_ml") is not None:
                summary_parts.append(f"飲水 {d['water_ml']}ml")
            if d.get("cigarettes") is not None:
                summary_parts.append(f"吸菸 {d['cigarettes']} 根")
            stats_summary = "、".join(summary_parts) if summary_parts else "今日未回報（懶鬼）"
        else:
            stats_summary = "今日未回報（懶鬼）"

        members_stats.append({"username": username, "stats_summary": stats_summary})

    prompt = build_report_prompt(arena_data["name"], members_stats)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    report_content = message.content[0].text

    # Save to DB
    result = (
        supabase.table("daily_reports")
        .upsert({
            "arena_id": arena_id,
            "date": str(report_date),
            "content": report_content,
            "suggestions": [],
        }, on_conflict="arena_id,date")
        .execute()
    )

    return result.data[0]
