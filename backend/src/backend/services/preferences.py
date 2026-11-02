from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from backend.models.preferences import Preferences
from backend.schemas.preferences import PreferencesWrite


def get_preferences(db: Session) -> PreferencesWrite:
    row = db.get(Preferences, 1)
    return PreferencesWrite.model_validate(row) if row else PreferencesWrite()


def local_today(db: Session):
    return datetime.now(ZoneInfo(get_preferences(db).time_zone)).date()
