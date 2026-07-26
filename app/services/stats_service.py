from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Query

from app.db import Session, get_db
from app.dependencies import validate_dates
from app.models.admin import Admin
from app.models.stats import StatsGranularity
from app.db.crud import stats as stats_crud


def get_stats_history(
    granularity: StatsGranularity = Query(StatsGranularity.day),
    start: str = "",
    end: str = "",
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Return node traffic and user registration history for a date range."""
    if not start:
        duration = {
            StatsGranularity.hour: timedelta(days=2),
            StatsGranularity.day: timedelta(days=30),
            StatsGranularity.week: timedelta(weeks=12),
            StatsGranularity.month: timedelta(days=365),
        }[granularity]
        start = (datetime.now(timezone.utc) - duration).isoformat()

    start_date, end_date = validate_dates(start, end)
    if end_date - start_date > timedelta(days=366 * 3):
        raise HTTPException(
            status_code=400,
            detail="Statistics date range cannot exceed three years",
        )

    return stats_crud.get_stats_history(db, start_date, end_date, granularity)


def get_stats_summary(
    start: str = "",
    end: str = "",
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Return user status totals for users created in a date range."""
    if not start:
        start = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    start_date, end_date = validate_dates(start, end)
    if end_date - start_date > timedelta(days=366 * 3):
        raise HTTPException(
            status_code=400,
            detail="Statistics date range cannot exceed three years",
        )

    return stats_crud.get_stats_summary(db, start_date, end_date)
