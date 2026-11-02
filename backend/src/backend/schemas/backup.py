"""The version 1 backup format, validated before any saved records change."""

import json
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, field_validator, model_validator

from backend.schemas.budget import BudgetCreate
from backend.schemas.category import CategoryCreate
from backend.schemas.goal import GoalCreate, GoalEntryCreate
from backend.schemas.subscription import PaymentCreate, SubscriptionCreate
from backend.schemas.transaction import TransactionCreate
from backend.schemas.transaction_rule import RuleWrite
from backend.schemas.preferences import PreferencesWrite

RecordID = Annotated[int, Field(strict=True, gt=0, le=2_147_483_647)]
MAX_BACKUP_BYTES = 50_000_000


class BackupCategory(CategoryCreate):
    model_config = ConfigDict(extra="forbid")


class BackupBank(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=100)
    color: str | None = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    display_name: str | None = Field(min_length=1, max_length=100)
    hidden: StrictBool

    @field_validator("name")
    @classmethod
    def normalized_name(cls, value):
        if not value.strip() or value != value.strip().lower():
            raise ValueError("Bank keys must be normalized names.")
        return value


class BackupTransaction(TransactionCreate):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    id: RecordID


class BackupBudget(BudgetCreate):
    model_config = ConfigDict(extra="forbid")
    id: RecordID


class BackupRule(RuleWrite):
    id: RecordID
    enabled: StrictBool


class BackupGoal(GoalCreate):
    id: RecordID


class BackupEntry(GoalEntryCreate):
    id: RecordID
    goal_id: RecordID


class BackupSubscription(SubscriptionCreate):
    id: RecordID
    billing_anchor_date: date
    is_active: StrictBool
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def check_dates(self):
        if self.next_due_date < self.billing_anchor_date:
            raise ValueError("Subscription due date precedes its billing anchor.")
        return self


class BackupPayment(PaymentCreate):
    id: RecordID
    subscription_id: RecordID
    created_at: datetime


class BackupPreferences(PreferencesWrite):
    id: Annotated[int, Field(strict=True, ge=1, le=1)]


class BackupData(BaseModel):
    model_config = ConfigDict(extra="forbid")
    categories: list[BackupCategory]
    bank_styles: list[BackupBank]
    transactions: list[BackupTransaction]
    budgets: list[BackupBudget]
    transaction_rules: list[BackupRule]
    goals: list[BackupGoal]
    goal_entries: list[BackupEntry]
    subscriptions: list[BackupSubscription]
    subscription_payments: list[BackupPayment]
    # Optional for compatibility with backups created before preferences existed.
    preferences: list[BackupPreferences] = Field(default_factory=list, max_length=1)

    @model_validator(mode="after")
    def validate_links_and_keys(self):
        for name in type(self).model_fields:
            rows = getattr(self, name)
            keys = [row.name.lower() if name in ("categories", "bank_styles") else row.id for row in rows]
            if len(set(keys)) != len(keys):
                raise ValueError(f"Duplicate record keys in {name}.")
        categories = {row.name for row in self.categories}
        for row in [*self.transactions, *self.budgets, *self.transaction_rules, *self.subscriptions]:
            if row.category is not None and row.category not in categories:
                raise ValueError("A record references a category missing from this backup.")
        for rows, parent_ids, field in [
            (self.goal_entries, {row.id for row in self.goals}, "goal_id"),
            (self.subscription_payments, {row.id for row in self.subscriptions}, "subscription_id"),
        ]:
            if any(getattr(row, field) not in parent_ids for row in rows):
                raise ValueError(f"A record references a missing {field}.")
        for name, keys in [
            ("budgets", [(row.month, row.year, row.category) for row in self.budgets]),
            ("transaction rules", [row.match_text for row in self.transaction_rules]),
            ("subscription payments", [(row.subscription_id, row.due_date) for row in self.subscription_payments]),
        ]:
            if len(set(keys)) != len(keys):
                raise ValueError(f"Conflicting {name} in this backup.")
        return self


class WishlistItem(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    price: float = Field(ge=0)
    purpose: str
    category: str
    importance: int = Field(ge=1, le=10)
    value: int = Field(ge=1, le=10)
    frequency: int = Field(ge=1, le=10)
    quality: int = Field(ge=1, le=10)
    longevity: int = Field(ge=1, le=10)
    urgency: int = Field(ge=1, le=10)
    deadline: str
    notes: str

    @field_validator("deadline")
    @classmethod
    def check_deadline(cls, value):
        if value:
            date.fromisoformat(value)
        return value


class BackupFile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format: Literal["kingdevs-finance-engine"]
    version: StrictInt
    exported_at: datetime
    data: BackupData
    browser_data: dict[str, str | None] = Field(default_factory=dict)

    @field_validator("version")
    @classmethod
    def supported_version(cls, value):
        if value != 1:
            raise ValueError("This backup version is not supported.")
        return value

    @field_validator("browser_data")
    @classmethod
    def validate_browser_data(cls, values):
        if set(values) - {"what-to-buy-items", "what-to-buy-budget", "theme"}:
            raise ValueError("Unsupported browser data in backup.")
        if values.get("theme") not in (None, "light", "dark", "system"):
            raise ValueError("Invalid saved theme.")
        if values.get("what-to-buy-items") is not None:
            items = json.loads(values["what-to-buy-items"])
            if not isinstance(items, list):
                raise ValueError("The wish list must contain an array of items.")
            parsed = [WishlistItem.model_validate(item) for item in items]
            if len({item.id for item in parsed}) != len(parsed):
                raise ValueError("Duplicate wish list IDs.")
        if values.get("what-to-buy-budget") is not None:
            from math import isfinite
            amount = float(values["what-to-buy-budget"])
            if not isfinite(amount) or amount < 0:
                raise ValueError("Invalid wish list budget.")
        return values
