from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.base import Base, SessionLocal, engine  # noqa: F401


class GetDB:  # Context Manager
    def __init__(self):
        self.db = SessionLocal()

    def __enter__(self):
        return self.db

    def __exit__(self, exc_type, exc_value, traceback):
        if isinstance(exc_value, SQLAlchemyError):
            self.db.rollback()  # rollback on exception

        self.db.close()


def get_db():  # Dependency
    with GetDB() as db:
        yield db


# Import models after DB lifecycle helpers are available. Some Pydantic models
# import get_db during SQLAlchemy model module initialization.
import app.db.models  # noqa: E402,F401


__all__ = [
    "Base",
    "Session",
    "SessionLocal",
    "engine",
    "GetDB",
    "get_db",
]
