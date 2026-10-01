from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TransactionBase(BaseModel):
    date: Date

    merchant: str = Field(
        min_length=1,
        max_length=255,
    )

    category: str = Field(
        min_length=1,
        max_length=100,
    )

    bank: str = Field(
        min_length=1,
        max_length=100,
    )

    type: Literal["income", "expense"]

    amount: Decimal = Field(
        gt=0,
        decimal_places=2,
    )


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: Date | None = None

    merchant: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    bank: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    type: Literal["income", "expense"] | None = None

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
    )


class TransactionRead(TransactionBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True,
    )