import json
import os
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import inspect
from sqlalchemy.engine import make_url

from app.db.base import engine
from config import (
    CUSTOM_TEMPLATES_DIRECTORY,
    SQLALCHEMY_DATABASE_URL,
    XRAY_ASSETS_PATH,
    XRAY_JSON,
)


BACKUP_VERSION = 1
SQL_BACKUP_FILENAME = "marzbannext_database.sql"
FULL_BACKUP_PREFIX = "marzbannext_full_backup"


def _timestamp() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def database_backup_filename() -> str:
    return f"marzbannext_database_{_timestamp()}.sql"


def full_backup_filename() -> str:
    return f"{FULL_BACKUP_PREFIX}_{_timestamp()}.zip"


def _is_sqlite() -> bool:
    return SQLALCHEMY_DATABASE_URL.startswith("sqlite")


def _sqlite_database_path() -> Path:
    url = make_url(SQLALCHEMY_DATABASE_URL)
    database = url.database or ""
    if not database:
        raise HTTPException(
            status_code=500,
            detail="SQLite database path is not configured",
        )
    return Path(database).expanduser().resolve()


def _dump_sqlite_database() -> bytes:
    database_path = _sqlite_database_path()
    if not database_path.exists():
        raise HTTPException(status_code=500, detail="SQLite database file not found")

    connection = sqlite3.connect(str(database_path))
    try:
        sql = "\n".join(connection.iterdump()) + "\n"
    finally:
        connection.close()
    return sql.encode("utf-8")


def _quote_mysql_identifier(value: str) -> str:
    return f"`{value.replace('`', '``')}`"


def _mysql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bytes):
        return f"X'{value.hex()}'"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)

    text = str(value)
    text = (
        text.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\0", "\\0")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\x1a", "\\Z")
    )
    return f"'{text}'"


def _dump_mysql_database() -> bytes:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    lines = [
        "-- MarzbanNext database backup",
        "SET FOREIGN_KEY_CHECKS=0;",
        "SET NAMES utf8mb4;",
        "",
    ]

    with engine.connect() as connection:
        for table_name in table_names:
            quoted_table = _quote_mysql_identifier(table_name)
            create_row = connection.exec_driver_sql(
                f"SHOW CREATE TABLE {quoted_table}"
            ).first()
            if not create_row:
                continue

            lines.extend(
                [
                    f"DROP TABLE IF EXISTS {quoted_table};",
                    f"{create_row[1]};",
                    "",
                ]
            )

            columns = [column["name"] for column in inspector.get_columns(table_name)]
            if not columns:
                continue

            quoted_columns = ", ".join(
                _quote_mysql_identifier(column) for column in columns
            )
            rows = connection.exec_driver_sql(
                f"SELECT {quoted_columns} FROM {quoted_table}"
            )
            for row in rows:
                values = ", ".join(_mysql_literal(value) for value in row)
                lines.append(
                    f"INSERT INTO {quoted_table} ({quoted_columns}) VALUES ({values});"
                )
            lines.append("")

    lines.append("SET FOREIGN_KEY_CHECKS=1;")
    return ("\n".join(lines) + "\n").encode("utf-8")


def dump_database_sql() -> bytes:
    if _is_sqlite():
        return _dump_sqlite_database()
    return _dump_mysql_database()


def _restore_sqlite_database(sql_content: bytes) -> None:
    database_path = _sqlite_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(suffix=".sqlite3", dir=str(database_path.parent))
    os.close(fd)
    try:
        connection = sqlite3.connect(temp_path)
        try:
            connection.executescript(sql_content.decode("utf-8"))
            connection.commit()
        finally:
            connection.close()
        engine.dispose()
        os.replace(temp_path, database_path)
    except Exception:
        try:
            os.unlink(temp_path)
        except FileNotFoundError:
            pass
        raise


def _split_sql_statements(sql: str) -> list[str]:
    statements = []
    buffer = []
    quote = None
    escaped = False
    index = 0

    while index < len(sql):
        char = sql[index]
        next_char = sql[index + 1] if index + 1 < len(sql) else ""

        if quote:
            buffer.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            index += 1
            continue

        if char == "-" and next_char == "-":
            index = sql.find("\n", index)
            if index == -1:
                break
            continue

        if char == "#":
            index = sql.find("\n", index)
            if index == -1:
                break
            continue

        if char == "/" and next_char == "*":
            end = sql.find("*/", index + 2)
            if end == -1:
                break
            index = end + 2
            continue

        if char in {"'", '"', "`"}:
            quote = char
            buffer.append(char)
            index += 1
            continue

        if char == ";":
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
            index += 1
            continue

        buffer.append(char)
        index += 1

    statement = "".join(buffer).strip()
    if statement:
        statements.append(statement)
    return statements


def _restore_mysql_database(sql_content: bytes) -> None:
    statements = _split_sql_statements(sql_content.decode("utf-8"))
    with engine.begin() as connection:
        connection.exec_driver_sql("SET FOREIGN_KEY_CHECKS=0")
        for statement in statements:
            connection.exec_driver_sql(statement)
        connection.exec_driver_sql("SET FOREIGN_KEY_CHECKS=1")
    engine.dispose()


def restore_database_sql(sql_content: bytes) -> None:
    if not sql_content.strip():
        raise HTTPException(status_code=422, detail="SQL backup file is empty")
    try:
        if _is_sqlite():
            _restore_sqlite_database(sql_content)
        else:
            _restore_mysql_database(sql_content)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database restore failed: {exc}")


def _candidate_backup_paths() -> list[Path]:
    candidates = [
        Path(".env"),
        Path("docker-compose.yml"),
        Path(XRAY_JSON),
    ]
    if CUSTOM_TEMPLATES_DIRECTORY:
        candidates.append(Path(CUSTOM_TEMPLATES_DIRECTORY))
    if XRAY_ASSETS_PATH:
        candidates.append(Path(XRAY_ASSETS_PATH))

    result = []
    seen = set()
    for candidate in candidates:
        path = candidate.expanduser().resolve()
        if path.exists() and path not in seen:
            result.append(path)
            seen.add(path)
    return result


def _is_skipped_path(path: Path) -> bool:
    skipped_parts = {
        ".git",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".venv",
        "__pycache__",
        "backup",
        "node_modules",
    }
    return any(part in skipped_parts for part in path.parts)


def create_full_backup_archive() -> str:
    fd, archive_path = tempfile.mkstemp(prefix=f"{FULL_BACKUP_PREFIX}_", suffix=".zip")
    os.close(fd)

    manifest = {
        "version": BACKUP_VERSION,
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "database": SQL_BACKUP_FILENAME,
        "entries": [],
    }

    with zipfile.ZipFile(
        archive_path, "w", compression=zipfile.ZIP_DEFLATED
    ) as archive:
        archive.writestr(SQL_BACKUP_FILENAME, dump_database_sql())

        for index, source in enumerate(_candidate_backup_paths()):
            root = f"files/{index}"
            if source.is_file():
                archive_path_name = f"{root}/{source.name}"
                archive.write(source, archive_path_name)
                manifest["entries"].append(
                    {
                        "kind": "file",
                        "source": str(source),
                        "archive_path": archive_path_name,
                    }
                )
                continue

            manifest["entries"].append(
                {
                    "kind": "directory",
                    "source": str(source),
                    "archive_path": root,
                }
            )
            for file_path in source.rglob("*"):
                if not file_path.is_file() or _is_skipped_path(file_path):
                    continue
                relative_path = file_path.relative_to(source).as_posix()
                archive.write(file_path, f"{root}/{relative_path}")

        archive.writestr("manifest.json", json.dumps(manifest, indent=2))

    return archive_path


def _safe_archive_member_path(value: str) -> str:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise HTTPException(
            status_code=422,
            detail="Backup archive contains unsafe paths",
        )
    return path.as_posix()


def restore_full_backup_archive(archive_path: str) -> None:
    try:
        with zipfile.ZipFile(archive_path) as archive:
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
            if manifest.get("version") != BACKUP_VERSION:
                raise HTTPException(
                    status_code=422,
                    detail="Unsupported backup archive version",
                )

            database_member = _safe_archive_member_path(manifest.get("database") or "")
            restore_database_sql(archive.read(database_member))

            for entry in manifest.get("entries", []):
                source = Path(entry["source"]).expanduser().resolve()
                member_root = _safe_archive_member_path(entry["archive_path"])
                if entry.get("kind") == "file":
                    source.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(member_root) as src, open(source, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    continue

                if entry.get("kind") == "directory":
                    source.mkdir(parents=True, exist_ok=True)
                    prefix = f"{member_root.rstrip('/')}/"
                    for member in archive.namelist():
                        if not member.startswith(prefix) or member.endswith("/"):
                            continue
                        relative_path = Path(member[len(prefix):])
                        if relative_path.is_absolute() or ".." in relative_path.parts:
                            raise HTTPException(
                                status_code=422,
                                detail="Backup archive contains unsafe paths",
                            )
                        target = source / relative_path
                        target.parent.mkdir(parents=True, exist_ok=True)
                        with archive.open(member) as src, open(target, "wb") as dst:
                            shutil.copyfileobj(src, dst)
    except HTTPException:
        raise
    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="Invalid backup archive")
    except KeyError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Backup archive is missing {exc}",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Backup restore failed: {exc}")
