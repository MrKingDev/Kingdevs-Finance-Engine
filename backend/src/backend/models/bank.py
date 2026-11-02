from sqlalchemy import Boolean, String, false
from sqlalchemy.orm import Mapped, mapped_column
from backend.database.base import Base


class BankStyle(Base):
    __tablename__ = "bank_styles"
    # Normalized names also match historical transactions with different casing.
    name: Mapped[str] = mapped_column(String(100), primary_key=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
