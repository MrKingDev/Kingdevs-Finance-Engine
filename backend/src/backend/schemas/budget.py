from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.schemas.category import CategoryName


class BudgetCreate(BaseModel):
    category: CategoryName | None = None
    month: int = Field(
        ge=1,
        le=12,
    )

    year: int = Field(
        ge=2000,
        le=2100,
    )

    amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )


class BudgetUpdate(BaseModel):
    # Omitted preserves the category; null intentionally changes to an overall budget.
    category: CategoryName | None = None
    month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    year: int | None = Field(
        default=None,
        ge=2000,
        le=2100,
    )

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    @field_validator("month", "year", "amount")
    @classmethod
    def reject_explicit_null(cls, value: int | Decimal | None) -> int | Decimal:
        if value is None:
            raise ValueError("Omit unchanged fields; budget fields cannot be null.")
        return value


class BudgetResponse(BaseModel):
    category: str | None
    id: int

    month: int

    year: int

    budget: Decimal

    spent: Decimal

    remaining: Decimal

    usage_percentage: float

    model_config = ConfigDict(
        from_attributes=True,
    )
