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
    """每整點檢查哪些競技場的 report_hour 等於目前 UTC 小時，並生成戰報"""
    from datetime import datetime, timezone
    current_utc_hour = datetime.now(timezone.utc).hour
    today = date.today()

    active_arenas = (
        supabase.table("arenas")
        .select("id, report_hour")
        .eq("status", "active")
        .eq("report_hour", current_utc_hour)
        .execute()
    )

    for arena in active_arenas.data:
        try:
            await generate_daily_report(arena["id"], today)
            logger.info(f"Generated report for arena {arena['id']} (report_hour={current_utc_hour} UTC)")
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
        CronTrigger(minute=0),   # every hour on the hour
        id="daily_reports",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")
