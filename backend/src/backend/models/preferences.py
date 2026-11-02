from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


class Preferences(Base):
    __tablename__ = "preferences"
    __table_args__ = (CheckConstraint("id = 1", name="preferences_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    locale: Mapped[str] = mapped_column(String(20), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    time_zone: Mapped[str] = mapped_column(String(100), nullable=False)
