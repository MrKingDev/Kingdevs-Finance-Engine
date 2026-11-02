import base64
import binascii
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Money = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2, allow_inf_nan=False)]
Cycle = Literal["monthly", "annual"]


class SubscriptionFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("icon", check_fields=False)
    @classmethod
    def validate_icon(cls, value):
        if value is None:
            return value
        try:
            header, encoded = value.split(",", 1)
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ValueError("Choose a valid PNG, JPEG, or WebP icon.") from None
        valid = (
            (header == "data:image/png;base64" and raw.startswith(b"\x89PNG\r\n\x1a\n"))
            or (header == "data:image/jpeg;base64" and raw.startswith(b"\xff\xd8\xff"))
            or (header == "data:image/webp;base64" and raw.startswith(b"RIFF") and raw[8:12] == b"WEBP")
        )
        if not valid or len(raw) > 2 * 1024 * 1024:
            raise ValueError("Use a PNG, JPEG, or WebP icon no larger than 2 MiB.")
        return value


class SubscriptionCreate(SubscriptionFields):
    name: str = Field(min_length=1, max_length=120)
    amount: Money
    billing_cycle: Cycle
    next_due_date: date
    category: str | None = Field(default=None, min_length=1, max_length=100)
    payment_method_label: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=2_800_000)


class SubscriptionUpdate(SubscriptionFields):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Money | None = None
    billing_cycle: Cycle | None = None
    next_due_date: date | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    payment_method_label: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=2_800_000)
    is_active: bool | None = None

    @field_validator("name", "amount", "billing_cycle", "next_due_date", "is_active")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Omit unchanged fields; this field cannot be null.")
        return value


class SubscriptionResponse(SubscriptionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    currency: str = "USD"
    created_at: datetime
    updated_at: datetime
    next_bill_status: Literal["overdue", "due_today", "upcoming", "archived"]
    following_due_date: date
    yearly_cost: Decimal
    last_paid_on: date | None
    payment_count: int


class SubscriptionSummary(BaseModel):
    currency: str = "USD"
    as_of_date: date
    active_count: int
    overdue_count: int
    due_today_count: int
    upcoming_count: int
    yearly_cost: Decimal
    monthly_average: Decimal


class SubscriptionOverview(BaseModel):
    items: list[SubscriptionResponse]
    summary: SubscriptionSummary


class PaymentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    due_date: date
    paid_on: date
    amount: Money


class PaymentResponse(PaymentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    subscription_id: int
    created_at: datetime


class PaymentResult(BaseModel):
    payment: PaymentResponse
    subscription: SubscriptionResponse
