from datetime import date as Date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.schemas.category import CategoryName


class TransactionBase(BaseModel):
    date: Date

    merchant: str = Field(
        min_length=1,
        max_length=255,
    )

    category: CategoryName

    bank: str = Field(
        min_length=1,
        max_length=100,
    )

    type: Literal["income", "expense"]

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    pie_color: str = Field(
        default="var(--chart-1)",
        alias="pie-color",
        min_length=1,
        max_length=100,
    )

    model_config = ConfigDict(
        populate_by_name=True,
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

    category: CategoryName | None = None

    bank: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    type: Literal["income", "expense"] | None = None

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    pie_color: str | None = Field(
        default=None,
        alias="pie-color",
        min_length=1,
        max_length=100,
    )

    model_config = ConfigDict(
        populate_by_name=True,
    )

    @field_validator("date", "merchant", "category", "bank", "type", "amount", "pie_color")
    @classmethod
    def reject_explicit_null(cls, value):
        if value is None:
            raise ValueError("Omit unchanged fields; transaction fields cannot be null.")
        return value


class TransactionRead(TransactionBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
