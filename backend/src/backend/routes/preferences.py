from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.preferences import Preferences
from backend.schemas.preferences import CURRENCIES, REGIONS, TIME_ZONES, PreferencesWrite
from backend.services.preferences import get_preferences

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("/options")
def preference_options():
    return {"locale": REGIONS, "currency": CURRENCIES, "time_zone": TIME_ZONES}


@router.get("", response_model=PreferencesWrite)
def read_preferences(db: Session = Depends(get_db)):
    return get_preferences(db)


@router.put("", response_model=PreferencesWrite)
def save_preferences(data: PreferencesWrite, db: Session = Depends(get_db)):
    row = db.get(Preferences, 1)
    if row is None:
        row = Preferences(id=1)
        db.add(row)
    for field, value in data.model_dump().items():
        setattr(row, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Preferences changed elsewhere. Refresh and try again.") from None
    return data
