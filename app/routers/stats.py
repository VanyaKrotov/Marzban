from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import Session, crud, get_db
from app.dependencies import validate_dates
from app.models.admin import Admin
from app.models.stats import StatsGranularity, StatsHistoryResponse
from app.utils import responses

router = APIRouter(
    tags=["Statistics"],
    prefix="/api",
    responses={401: responses._401, 403: responses._403},
)


@router.get("/stats/history", response_model=StatsHistoryResponse)
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

    return crud.get_stats_history(db, start_date, end_date, granularity)
