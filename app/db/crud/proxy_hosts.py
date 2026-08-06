"""Domain CRUD helpers extracted from the former app.db.crud module."""

from typing import List, Optional, Sequence

from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Query, Session, joinedload

from app.db.models.proxies import HostGroup, ProxyHost
from app.models.proxy import (
    HostGroupCreate,
    HostGroupModify,
    ProxyHost as ProxyHostModify,
    ProxyHostCreate,
    ProxyHostModify as ProxyHostV2Modify,
)

from app.db.crud import proxy_inbounds as inbound_crud

def _normalize_host_group_filter(
    group_id: Optional[str] = None,
    group_ids: Optional[Sequence[str]] = None,
) -> List[str]:
    normalized_group_ids = []
    for value in [group_id, *(group_ids or [])]:
        if value and value not in normalized_group_ids:
            normalized_group_ids.append(value)
    return normalized_group_ids


def _filter_hosts_by_groups(
    query: Query,
    group_id: Optional[str] = None,
    group_ids: Optional[Sequence[str]] = None,
) -> Query:
    normalized_group_ids = _normalize_host_group_filter(group_id, group_ids)
    if not normalized_group_ids:
        return query
    return (
        query
        .join(ProxyHost.groups)
        .filter(HostGroup.id.in_(normalized_group_ids))
        .distinct()
    )


def _filter_hosts_by_search(query: Query, search: Optional[str] = None) -> Query:
    term = search.strip() if search else ""
    if not term:
        return query
    pattern = f"%{term}%"
    return query.filter(
        or_(
            ProxyHost.remark.ilike(pattern),
            ProxyHost.address.ilike(pattern),
            cast(ProxyHost.port, String).ilike(pattern),
        )
    )


def get_hosts(
    db: Session,
    inbound_tag: str,
    group_id: Optional[str] = None,
    group_ids: Optional[Sequence[str]] = None,
    search: Optional[str] = None,
) -> List[ProxyHost]:
    """
    Retrieves hosts for a given inbound tag.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.

    Returns:
        List[ProxyHost]: List of hosts for the inbound.
    """
    inbound = inbound_crud.get_inbound(db, inbound_tag)
    if not inbound:
        return []
    query = (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound), joinedload(ProxyHost.groups))
        .filter(ProxyHost.inbound_id == inbound.id)
    )
    query = _filter_hosts_by_groups(query, group_id=group_id, group_ids=group_ids)
    query = _filter_hosts_by_search(query, search=search)
    return _sort_hosts_groups(query.order_by(ProxyHost.position, ProxyHost.id).all())


def get_hosts_v2(
    db: Session,
    group_id: Optional[str] = None,
    group_ids: Optional[Sequence[str]] = None,
    search: Optional[str] = None,
) -> List[ProxyHost]:
    query = (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound), joinedload(ProxyHost.groups))
    )
    query = _filter_hosts_by_groups(query, group_id=group_id, group_ids=group_ids)
    query = _filter_hosts_by_search(query, search=search)
    return _sort_hosts_groups(query.order_by(ProxyHost.position, ProxyHost.id).all())


def get_host_v2(db: Session, host_id: int) -> Optional[ProxyHost]:
    host = (
        db.query(ProxyHost)
        .options(joinedload(ProxyHost.inbound), joinedload(ProxyHost.groups))
        .filter(ProxyHost.id == host_id)
        .first()
    )
    if host:
        _sort_host_groups(host)
    return host


def _sort_host_groups(host: ProxyHost) -> ProxyHost:
    host.groups.sort(key=lambda group: group.id)
    return host


def _sort_hosts_groups(hosts: List[ProxyHost]) -> List[ProxyHost]:
    for host in hosts:
        _sort_host_groups(host)
    return hosts


def get_host_groups(db: Session) -> List[HostGroup]:
    return db.query(HostGroup).order_by(HostGroup.name, HostGroup.id).all()


def get_host_group(db: Session, group_id: str) -> Optional[HostGroup]:
    return db.query(HostGroup).filter(HostGroup.id == group_id).first()


def create_host_group(db: Session, group: HostGroupCreate) -> HostGroup:
    dbgroup = HostGroup(
        id=group.id,
        name=group.name,
        description=group.description,
        tags=group.tags,
    )
    db.add(dbgroup)
    db.commit()
    db.refresh(dbgroup)
    return dbgroup


def update_host_group(
    db: Session, dbgroup: HostGroup, group: HostGroupModify
) -> HostGroup:
    dbgroup.name = group.name
    dbgroup.description = group.description
    dbgroup.tags = group.tags
    db.commit()
    db.refresh(dbgroup)
    return dbgroup


def delete_host_group(db: Session, dbgroup: HostGroup) -> None:
    db.delete(dbgroup)
    db.commit()


def _get_existing_host_groups(db: Session, group_ids: List[str]) -> List[HostGroup]:
    unique_ids = list(dict.fromkeys(group_ids))
    if not unique_ids:
        return []
    groups = db.query(HostGroup).filter(HostGroup.id.in_(unique_ids)).all()
    if len(groups) != len(unique_ids):
        found_ids = {group.id for group in groups}
        missing_ids = [
            group_id for group_id in unique_ids if group_id not in found_ids
        ]
        raise ValueError(f"Host group not found: {', '.join(missing_ids)}")
    groups_by_id = {group.id: group for group in groups}
    return [groups_by_id[group_id] for group_id in unique_ids]


def set_host_groups(db: Session, dbhost: ProxyHost, group_ids: List[str]) -> ProxyHost:
    dbhost.groups = _get_existing_host_groups(db, group_ids)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def attach_host_groups(
    db: Session, dbhost: ProxyHost, group_ids: List[str]
) -> ProxyHost:
    groups = _get_existing_host_groups(db, group_ids)
    existing_ids = {group.id for group in dbhost.groups}
    for group in groups:
        if group.id not in existing_ids:
            dbhost.groups.append(group)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def detach_host_groups(
    db: Session, dbhost: ProxyHost, group_ids: List[str]
) -> ProxyHost:
    _get_existing_host_groups(db, group_ids)
    remove_ids = set(group_ids)
    dbhost.groups = [group for group in dbhost.groups if group.id not in remove_ids]
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def _apply_host_fields(dbhost: ProxyHost, host: ProxyHostModify) -> None:
    dbhost.remark = host.remark
    dbhost.address = host.address
    dbhost.port = host.port
    dbhost.path = host.path
    dbhost.sni = host.sni
    dbhost.host = host.host
    dbhost.security = host.security
    dbhost.alpn = host.alpn
    dbhost.fingerprint = host.fingerprint
    dbhost.allowinsecure = host.allowinsecure
    dbhost.is_disabled = host.is_disabled
    dbhost.mux_enable = host.mux_enable
    dbhost.fragment_setting = host.fragment_setting
    dbhost.noise_setting = host.noise_setting
    dbhost.random_user_agent = host.random_user_agent
    dbhost.use_sni_as_host = host.use_sni_as_host
    dbhost.sc_max_buffered_posts = host.sc_max_buffered_posts
    dbhost.x_padding_obfs_mode = host.x_padding_obfs_mode
    dbhost.uplink_http_method = host.uplink_http_method


def create_host_v2(db: Session, host: ProxyHostCreate) -> ProxyHost:
    inbound = inbound_crud.get_inbound_or_raise(db, host.inbound_tag)
    position = host.position
    if position is None:
        position = inbound_crud.get_next_host_position(db)
    dbhost = ProxyHost(inbound=inbound, position=position)
    _apply_host_fields(dbhost, host)
    dbhost.groups = _get_existing_host_groups(db, host.group_ids)
    db.add(dbhost)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def update_host_v2(
    db: Session, dbhost: ProxyHost, host: ProxyHostV2Modify
) -> ProxyHost:
    inbound = inbound_crud.get_inbound_or_raise(db, host.inbound_tag)
    dbhost.inbound = inbound
    if host.position is not None:
        dbhost.position = host.position
    _apply_host_fields(dbhost, host)
    dbhost.groups = _get_existing_host_groups(db, host.group_ids)
    db.commit()
    db.refresh(dbhost)
    return get_host_v2(db, dbhost.id)


def remove_host_v2(db: Session, dbhost: ProxyHost) -> None:
    db.delete(dbhost)
    db.commit()


def reorder_hosts_v2(db: Session, host_ids: List[int]) -> List[ProxyHost]:
    hosts = get_hosts_v2(db)
    existing_ids = {host.id for host in hosts}
    if len(host_ids) != len(set(host_ids)) or set(host_ids) != existing_ids:
        raise ValueError("Host order must contain every host exactly once")

    hosts_by_id = {host.id: host for host in hosts}
    for position, host_id in enumerate(host_ids):
        hosts_by_id[host_id].position = position

    db.commit()
    return get_hosts_v2(db)


def add_host(db: Session, inbound_tag: str, host: ProxyHostModify) -> List[ProxyHost]:
    """
    Adds a new host to a proxy inbound.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.
        host (ProxyHostModify): Host details to be added.

    Returns:
        List[ProxyHost]: Updated list of hosts for the inbound.
    """
    inbound = inbound_crud.get_inbound_or_raise(db, inbound_tag)
    inbound.hosts.append(
        ProxyHost(
            remark=host.remark,
            address=host.address,
            port=host.port,
            path=host.path,
            sni=host.sni,
            host=host.host,
            inbound=inbound,
            position=inbound_crud.get_next_host_position(db),
            security=host.security,
            alpn=host.alpn,
            fingerprint=host.fingerprint,
            allowinsecure=host.allowinsecure,
            is_disabled=host.is_disabled,
            mux_enable=host.mux_enable,
            fragment_setting=host.fragment_setting,
            noise_setting=host.noise_setting,
            random_user_agent=host.random_user_agent,
            use_sni_as_host=host.use_sni_as_host,
            sc_max_buffered_posts=host.sc_max_buffered_posts,
            x_padding_obfs_mode=host.x_padding_obfs_mode,
            uplink_http_method=host.uplink_http_method,
        )
    )
    db.commit()
    db.refresh(inbound)
    return get_hosts(db, inbound_tag)


def update_hosts(db: Session, inbound_tag: str, modified_hosts: List[ProxyHostModify]) -> List[ProxyHost]:
    """
    Updates hosts for a given inbound tag.

    Args:
        db (Session): Database session.
        inbound_tag (str): The tag of the inbound.
        modified_hosts (List[ProxyHostModify]): List of modified hosts.

    Returns:
        List[ProxyHost]: Updated list of hosts for the inbound.
    """
    inbound = inbound_crud.get_inbound_or_raise(db, inbound_tag)
    position = inbound_crud.get_next_host_position(db)
    inbound.hosts = [
        ProxyHost(
            remark=host.remark,
            address=host.address,
            port=host.port,
            path=host.path,
            sni=host.sni,
            host=host.host,
            inbound=inbound,
            position=position + index,
            security=host.security,
            alpn=host.alpn,
            fingerprint=host.fingerprint,
            allowinsecure=host.allowinsecure,
            is_disabled=host.is_disabled,
            mux_enable=host.mux_enable,
            fragment_setting=host.fragment_setting,
            noise_setting=host.noise_setting,
            random_user_agent=host.random_user_agent,
            use_sni_as_host=host.use_sni_as_host,
            sc_max_buffered_posts=host.sc_max_buffered_posts,
            x_padding_obfs_mode=host.x_padding_obfs_mode,
            uplink_http_method=host.uplink_http_method,
        ) for index, host in enumerate(modified_hosts)
    ]
    db.commit()
    db.refresh(inbound)
    return get_hosts(db, inbound_tag)
