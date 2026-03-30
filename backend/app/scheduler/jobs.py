from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import supabase
from app.agents.daily_report import generate_daily_report
from app.routers.arenas import sync_statuses
from datetime import date
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def sync_arena_statuses():
    """每日 00:01 同步所有競技場狀態（pending→active→finished）"""
    all_arenas = supabase.table("arenas").select("*").neq("status", "finished").execute()
    updated = sync_statuses(all_arenas.data)
    logger.info(f"Synced status for {len(updated)} arenas")


async def run_daily_reports():
    """每日 22:00 為所有進行中的競技場生成戰報"""
    today = date.today()
    active_arenas = (
        supabase.table("arenas")
        .select("id")
        .eq("status", "active")
        .execute()
    )

    for arena in active_arenas.data:
        try:
            await generate_daily_report(arena["id"], today)
            logger.info(f"Generated report for arena {arena['id']}")
        except Exception as e:
            logger.error(f"Failed to generate report for arena {arena['id']}: {e}")


def start_scheduler():
    scheduler.add_job(
        sync_arena_statuses,
        CronTrigger(hour=0, minute=1),
        id="sync_statuses",
        replace_existing=True,
    )
    scheduler.add_job(
        run_daily_reports,
        CronTrigger(hour=22, minute=0),
        id="daily_reports",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")
