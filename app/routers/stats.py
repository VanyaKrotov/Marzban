
from fastapi import APIRouter

from app.models.stats import StatsHistoryResponse, StatsSummaryResponse
from app.utils import responses
from app.services import stats_service as service

router = APIRouter(
    tags=["Statistics"],
    prefix="/api",
    responses={401: responses._401, 403: responses._403},
)

router.get("/stats/history", response_model=StatsHistoryResponse)(service.get_stats_history)

router.get("/stats/summary", response_model=StatsSummaryResponse)(service.get_stats_summary)
