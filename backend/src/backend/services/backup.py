"""Complete, versioned export of saved application records, with exact money values."""

import json
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import (
    BankStyle, Budget, Category, Goal, GoalEntry, Subscription,
    SubscriptionPayment, Transaction, TransactionRule, Preferences,
)


BACKUP_MODELS = (
    Category, BankStyle, Transaction, Budget, TransactionRule,
    Goal, GoalEntry, Subscription, SubscriptionPayment, Preferences,
)


def encode_value(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"Unsupported backup value: {type(value).__name__}")


def full_backup(db: Session) -> bytes:
    # Keep related tables in one snapshot even if transactions/payments change
    # during the export. This session is fresh from the request dependency.
    if db.get_bind().dialect.name == "postgresql":
        db.connection(execution_options={"isolation_level": "REPEATABLE READ"})

    data = {}
    for model in BACKUP_MODELS:
        table = model.__table__
        rows = db.execute(select(table).order_by(*table.primary_key.columns))
        data[table.name] = [dict(row) for row in rows.mappings()]

    return json.dumps({
        "format": "kingdevs-finance-engine",
        "version": 1,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }, default=encode_value, ensure_ascii=False, indent=2).encode("utf-8")
