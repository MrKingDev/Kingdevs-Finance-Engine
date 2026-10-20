"""Opt-in fictional display data. Run only against the dedicated demo database."""

import argparse
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
import os

from sqlalchemy import select, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session

from backend.database.database import get_database_url, get_session_factory
from backend.models.budget import Budget
from backend.models.category import Category
from backend.models.subscription import Subscription, SubscriptionPayment
from backend.models.transaction import Transaction
from backend.models.goal import Goal, GoalEntry

CATEGORIES = {
    "Income": "emerald", "Housing": "indigo", "Groceries": "blue", "Dining": "orange",
    "Transportation": "teal", "Utilities": "amber", "Shopping": "pink", "Entertainment": "purple",
    "Health": "red", "Travel": "sky", "Subscriptions": "fuchsia", "Other": "lime",
}
# Day, merchant, category, type, amount. Every name and transaction is fictional.
MONTHLY_TRANSACTIONS = [
    (1, "Northstar Studio payroll", "Income", "income", "2750.00"),
    (1, "Willow Apartments rent", "Housing", "expense", "1550.00"),
    (2, "Green Basket Market", "Groceries", "expense", "112.45"),
    (3, "Harbor Coffee", "Dining", "expense", "12.80"),
    (4, "Metro Transit pass", "Transportation", "expense", "75.00"),
    (5, "City Energy", "Utilities", "expense", "94.60"),
    (6, "CloudBox", "Subscriptions", "expense", "9.99"),
    (7, "Juniper Kitchen", "Dining", "expense", "54.25"),
    (8, "Fresh Corner Market", "Groceries", "expense", "86.30"),
    (9, "Horizon Internet", "Utilities", "expense", "65.00"),
    (10, "Studio Supply", "Shopping", "expense", "74.90"),
    (11, "Oak Wellness pharmacy", "Health", "expense", "28.50"),
    (12, "Tune Garden", "Subscriptions", "expense", "10.99"),
    (13, "Riverside Cinema", "Entertainment", "expense", "32.00"),
    (14, "Green Basket Market", "Groceries", "expense", "108.75"),
    (15, "Northstar Studio payroll", "Income", "income", "2750.00"),
    (16, "Pine Design freelance", "Income", "income", "420.00"),
    (17, "Harbor Coffee", "Dining", "expense", "16.40"),
    (18, "City Fuel", "Transportation", "expense", "46.75"),
    (19, "Stream House", "Subscriptions", "expense", "15.49"),
    (20, "Seaside Books", "Shopping", "expense", "42.60"),
    (21, "Fresh Corner Market", "Groceries", "expense", "94.15"),
    (22, "Juniper Kitchen", "Dining", "expense", "68.20"),
    (23, "City Water", "Utilities", "expense", "38.50"),
    (24, "Summit Day Trip", "Travel", "expense", "125.00"),
    (25, "Community Museum", "Entertainment", "expense", "24.00"),
    (27, "Little Things gifts", "Other", "expense", "35.00"),
    (28, "Green Basket Market", "Groceries", "expense", "59.85"),
]


def assert_demo_database(url: URL, enabled: str | None):
    if enabled != "true" or url.database != "finance_engine_demo":
        raise RuntimeError("Sample data requires DEMO_MODE=true and the dedicated finance_engine_demo database. No data was changed.")


def month_at(day: date, offset: int) -> date:
    index = day.year * 12 + day.month - 1 + offset
    return date(index // 12, index % 12 + 1, 1)


def seed_demo(db: Session, as_of: date) -> bool:
    """Called inside one transaction after CLI safeguards. Never replace existing finances."""
    if db.bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(71025001)"))
    if any(db.scalar(select(model.id).limit(1)) is not None for model in (Transaction, Budget, Subscription, Goal)):
        return False
    for name, color in CATEGORIES.items():
        if db.get(Category, name) is None:
            db.add(Category(name=name, color=f"chart-{color}-2"))
    db.flush()
    for offset in range(-5, 1):
        month = month_at(as_of, offset)
        last_day = as_of.day if offset == 0 else monthrange(month.year, month.month)[1]
        for day, merchant, category, kind, amount in MONTHLY_TRANSACTIONS:
            # Spread a complete illustrative month across elapsed days for a useful current-month display.
            display_day = max(1, (day * last_day + 27) // 28)
            value = Decimal(amount)
            if kind == "expense" and category not in {"Housing", "Subscriptions"}:
                value = (value * (Decimal("1") + Decimal(offset % 4 - 1) / 20)).quantize(Decimal("0.01"))
            db.add(Transaction(date=month.replace(day=display_day), merchant=merchant, category=category,
                               bank="Demo Checking" if kind == "income" or category == "Housing" else "Demo Card",
                               type=kind, amount=value, pie_color=f"var(--chart-{CATEGORIES[category]}-2)"))
        for category, amount in [(None, "3600.00"), ("Housing", "1600.00"), ("Groceries", "450.00"),
                                 ("Dining", "250.00"), ("Shopping", "150.00"), ("Utilities", "220.00"),
                                 ("Subscriptions", "80.00")]:
            db.add(Budget(month=month.month, year=month.year, category=category, amount=Decimal(amount)))

    for name, price, cycle, delta in [
        ("Tune Garden", "10.99", "monthly", 0), ("Stream House", "15.49", "monthly", 3),
        ("CloudBox", "9.99", "monthly", 7), ("Focus Planner", "48.00", "annual", 20),
        ("Move Club", "24.00", "monthly", -2),
    ]:
        due = as_of + timedelta(days=delta)
        previous = month_at(due, -12 if cycle == "annual" else -1)
        previous = previous.replace(day=min(due.day, monthrange(previous.year, previous.month)[1]))
        subscription = Subscription(name=name, amount=Decimal(price), billing_cycle=cycle,
                                    category="Subscriptions", next_due_date=due, billing_anchor_date=previous,
                                    payment_method_label="Demo Card", is_active=True)
        db.add(subscription)
        db.flush()
        db.add(SubscriptionPayment(subscription_id=subscription.id, due_date=previous,
                                   paid_on=previous, amount=Decimal(price)))
    for name, kind, target, contributed in [
        ("Emergency fund", "Savings", "10000", "6800"),
        ("Japan adventure", "Savings", "4500", "1825"),
        ("Student loan freedom", "Debt Payoff", "8000", "5600"),
    ]:
        goal = Goal(name=name, type=kind, target_amount=Decimal(target))
        db.add(goal)
        db.flush()
        for entry_type, amount in [("income", "5920"), ("expense", "3400"), ("contribution", contributed)]:
            db.add(GoalEntry(goal_id=goal.id, type=entry_type, date=as_of,
                             note="Demo starting balance", amount=Decimal(amount)))
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today(), help="Anchor date, YYYY-MM-DD (default: today)")
    args = parser.parse_args()
    if not 2001 <= args.as_of.year <= 2099:
        parser.error("Choose a year from 2001 through 2099.")
    try:
        assert_demo_database(get_database_url(), os.environ.get("DEMO_MODE"))
    except RuntimeError as error:
        parser.exit(1, str(error) + "\n")
    with get_session_factory().begin() as db:
        created = seed_demo(db, args.as_of)
    print("Created demo data: 168 transactions, 42 budgets, 12 categories, 5 subscriptions with payments, and 3 goals with entries."
          if created else "Demo database already contains financial records; left unchanged.")


if __name__ == "__main__":
    main()
