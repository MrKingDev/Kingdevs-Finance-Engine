from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Money = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2, allow_inf_nan=False)]


class GoalCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    type: Literal["Savings", "Debt Payoff"]
    target_amount: Money
    target_date: date | None = None


class GoalResponse(GoalCreate):
    id: int
    contributed: Decimal
    documented_income: Decimal
    necessary_expenses: Decimal


class GoalEntryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    type: Literal["income", "expense", "contribution"]
    date: date
    note: str = Field(default="", max_length=500)
    amount: Money


class GoalEntryResponse(GoalEntryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    goal_id: int
