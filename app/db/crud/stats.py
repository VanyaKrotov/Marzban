"""Domain CRUD helpers extracted from the former app.db.crud module."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.nodes import Node
from app.db.models.usages import NodeUsage
from app.db.models.users import User
from app.models.stats import (
    NodeTrafficPoint,
    NodeTrafficSeries,
    StatsGranularity,
    StatsHistoryResponse,
    StatsSummaryResponse,
    UserGrowthPoint,
)
from app.models.user import UserStatus

def _stats_bucket_start(
    value: datetime,
    granularity: StatsGranularity,
    local_timezone: ZoneInfo,
) -> datetime:
    value = value.replace(tzinfo=timezone.utc).astimezone(local_timezone)
    if granularity == StatsGranularity.hour:
        return value.replace(minute=0, second=0, microsecond=0)
    if granularity == StatsGranularity.week:
        return (value - timedelta(days=value.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
    if granularity == StatsGranularity.month:
        return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_stats_bucket(value: datetime, granularity: StatsGranularity) -> datetime:
    if granularity == StatsGranularity.hour:
        return (value.astimezone(timezone.utc) + timedelta(hours=1)).astimezone(
            value.tzinfo
        )
    if granularity == StatsGranularity.day:
        return value + timedelta(days=1)
    if granularity == StatsGranularity.week:
        return value + timedelta(weeks=1)
    if value.month == 12:
        return value.replace(year=value.year + 1, month=1)
    return value.replace(month=value.month + 1)


def get_stats_history(
    db: Session,
    start: datetime,
    end: datetime,
    granularity: StatsGranularity,
    local_timezone: ZoneInfo,
) -> StatsHistoryResponse:
    """Aggregate recorded traffic and user registrations into time buckets."""
    query_start = start.astimezone(timezone.utc).replace(tzinfo=None)
    query_end = end.astimezone(timezone.utc).replace(tzinfo=None)
    first_bucket = _stats_bucket_start(query_start, granularity, local_timezone)
    last_bucket = _stats_bucket_start(query_end, granularity, local_timezone)

    buckets = []
    bucket = first_bucket
    while bucket <= last_bucket:
        buckets.append(bucket)
        bucket = _next_stats_bucket(bucket, granularity)

    nodes = db.query(Node).order_by(Node.name).all()
    traffic_by_node = {
        node.id: {period: [0, 0] for period in buckets}
        for node in nodes
    }
    usage_rows = db.query(NodeUsage).filter(
        NodeUsage.created_at >= query_start,
        NodeUsage.created_at <= query_end,
        NodeUsage.node_id.isnot(None),
    )
    for usage in usage_rows:
        if usage.node_id not in traffic_by_node:
            continue
        period = _stats_bucket_start(usage.created_at, granularity, local_timezone)
        values = traffic_by_node[usage.node_id].get(period)
        if values is not None:
            values[0] += usage.uplink or 0
            values[1] += usage.downlink or 0

    traffic = [
        NodeTrafficSeries(
            node_id=node.id,
            node_name=node.name,
            points=[
                NodeTrafficPoint(
                    period=period,
                    uplink=values[0],
                    downlink=values[1],
                    total=values[0] + values[1],
                )
                for period, values in traffic_by_node[node.id].items()
            ],
        )
        for node in nodes
    ]

    user_counts = {period: 0 for period in buckets}
    created_rows = db.query(User.created_at).filter(
        User.created_at >= query_start,
        User.created_at <= query_end,
    )
    for (created_at,) in created_rows:
        period = _stats_bucket_start(created_at, granularity, local_timezone)
        if period in user_counts:
            user_counts[period] += 1

    running_total = db.query(func.count(User.id)).filter(
        User.created_at < query_start
    ).scalar() or 0
    users = []
    previous_count = None
    for period, count in user_counts.items():
        running_total += count
        growth_percent = None
        if previous_count is not None:
            if previous_count:
                growth_percent = round(
                    ((count - previous_count) / previous_count) * 100,
                    2,
                )
            else:
                growth_percent = 100.0 if count else 0.0
        users.append(
            UserGrowthPoint(
                period=period,
                count=count,
                total=running_total,
                growth_percent=growth_percent,
            )
        )
        previous_count = count

    return StatsHistoryResponse(
        start=start,
        end=end,
        granularity=granularity,
        traffic=traffic,
        users=users,
    )


def get_stats_summary(
    db: Session,
    start: datetime,
    end: datetime,
) -> StatsSummaryResponse:
    """Return current user status counts for users created in the selected date range."""
    query_start = start.astimezone(timezone.utc).replace(tzinfo=None)
    query_end = end.astimezone(timezone.utc).replace(tzinfo=None)

    base_query = db.query(User).filter(
        User.created_at >= query_start,
        User.created_at <= query_end,
    )
    online_since = datetime.utcnow() - timedelta(minutes=5)

    return StatsSummaryResponse(
        start=start,
        end=end,
        total_user=base_query.count(),
        online_users=base_query.filter(
            User.online_at.isnot(None),
            User.online_at >= online_since,
        ).count(),
        users_active=base_query.filter(User.status == UserStatus.active).count(),
        users_disabled=base_query.filter(User.status == UserStatus.disabled).count(),
        users_expired=base_query.filter(User.status == UserStatus.expired).count(),
        users_limited=base_query.filter(User.status == UserStatus.limited).count(),
    )
