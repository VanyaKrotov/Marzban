from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.db.models.proxies import ProxyHost
from app.db.models.settings import SubscriptionBalancer
from app.models.settings import SubscriptionBalancerCreate, SubscriptionBalancerModify


def get_subscription_balancers(db: Session) -> list[SubscriptionBalancer]:
    return (
        db.query(SubscriptionBalancer)
        .options(selectinload(SubscriptionBalancer.hosts))
        .order_by(SubscriptionBalancer.position, SubscriptionBalancer.id)
        .all()
    )


def get_subscription_balancer(db: Session, balancer_id: int) -> SubscriptionBalancer | None:
    return (
        db.query(SubscriptionBalancer)
        .options(selectinload(SubscriptionBalancer.hosts))
        .filter(SubscriptionBalancer.id == balancer_id)
        .first()
    )


def _get_hosts(db: Session, host_ids: list[int]) -> list[ProxyHost]:
    unique_ids = list(dict.fromkeys(host_ids))
    if not unique_ids:
        return []
    hosts = db.query(ProxyHost).filter(ProxyHost.id.in_(unique_ids)).all()
    hosts_by_id = {host.id: host for host in hosts}
    missing_ids = [host_id for host_id in unique_ids if host_id not in hosts_by_id]
    if missing_ids:
        raise ValueError(f"Hosts {missing_ids} don't exist")
    return [hosts_by_id[host_id] for host_id in unique_ids]


def create_subscription_balancer(
    db: Session, balancer: SubscriptionBalancerCreate
) -> SubscriptionBalancer:
    data = balancer.model_dump(exclude={"host_ids"})
    max_position = db.query(func.max(SubscriptionBalancer.position)).scalar()
    next_position = (max_position if max_position is not None else -1) + 1
    db_balancer = SubscriptionBalancer(**data, position=next_position)
    db_balancer.hosts = _get_hosts(db, balancer.host_ids)
    db.add(db_balancer)
    db.commit()
    return get_subscription_balancer(db, db_balancer.id)


def update_subscription_balancer(
    db: Session,
    db_balancer: SubscriptionBalancer,
    balancer: SubscriptionBalancerModify,
) -> SubscriptionBalancer:
    for field, value in balancer.model_dump(exclude={"host_ids"}).items():
        setattr(db_balancer, field, value)
    db_balancer.hosts = _get_hosts(db, balancer.host_ids)
    db.commit()
    return get_subscription_balancer(db, db_balancer.id)


def delete_subscription_balancer(db: Session, db_balancer: SubscriptionBalancer) -> None:
    db.delete(db_balancer)
    db.commit()


def reorder_subscription_balancers(
    db: Session, balancer_ids: list[int]
) -> list[SubscriptionBalancer]:
    balancers = get_subscription_balancers(db)
    existing_ids = {balancer.id for balancer in balancers}
    if len(balancer_ids) != len(set(balancer_ids)) or set(balancer_ids) != existing_ids:
        raise ValueError("Balancer order must contain every balancer exactly once")

    balancers_by_id = {balancer.id: balancer for balancer in balancers}
    for position, balancer_id in enumerate(balancer_ids):
        balancers_by_id[balancer_id].position = position

    db.commit()
    return get_subscription_balancers(db)
