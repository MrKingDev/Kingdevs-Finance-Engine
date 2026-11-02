"""Bounded read-only context. Totals aggregate every matching transaction."""
from calendar import monthrange
from datetime import date
from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.models.transaction import Transaction
from backend.models.budget import Budget
from backend.models.subscription import Subscription
from backend.models.goal import Goal
from backend.routes.goals import goal_query


def financial_context(db: Session, year: int, month: int) -> dict:
    start, end = date(year, month, 1), date(year, month, monthrange(year, month)[1])
    period = (Transaction.date >= start, Transaction.date <= end)
    totals = {row.type: row.total for row in db.execute(select(Transaction.type, func.sum(Transaction.amount).label("total")).where(*period).group_by(Transaction.type))}
    income, expenses = totals.get("income", Decimal(0)), totals.get("expense", Decimal(0))
    count = db.scalar(select(func.count()).select_from(Transaction).where(*period))
    categories = db.execute(select(Transaction.category, func.sum(Transaction.amount).label("spent")).where(*period, Transaction.type == "expense").group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc(), Transaction.category).limit(31)).mappings().all()
    transactions = db.execute(select(Transaction.id, Transaction.date, Transaction.merchant, Transaction.bank, Transaction.category, Transaction.type, Transaction.amount).where(*period).order_by(Transaction.date.desc(), Transaction.id.desc()).limit(30)).mappings().all()
    budgets = db.scalars(select(Budget).where(Budget.year == year, Budget.month == month).order_by(Budget.id).limit(31)).all()
    budget_rows = []
    for budget in budgets[:30]:
        query = select(func.coalesce(func.sum(Transaction.amount), 0)).where(*period, Transaction.type == "expense")
        if budget.category is not None:
            query = query.where(Transaction.category == budget.category)
        spent = db.scalar(query)
        budget_rows.append({"id": budget.id, "category": budget.category, "amount": budget.amount, "spent": spent, "remaining": budget.amount - spent})
    subscriptions = db.execute(select(Subscription.name, Subscription.amount, Subscription.billing_cycle, Subscription.next_due_date, Subscription.category).where(Subscription.is_active.is_(True)).order_by(Subscription.next_due_date, Subscription.id).limit(31)).mappings().all()
    goals = db.execute(goal_query().order_by(Goal.id).limit(31)).mappings().all()
    return {
        "period": {"start": start, "end": end},
        "totals": {"income": income, "expenses": expenses, "net_cash_flow": income - expenses, "transaction_count": count},
        "expense_categories": [dict(row) for row in categories[:30]],
        "recent_transactions": [dict(row) for row in transactions],
        "monthly_budgets": budget_rows,
        "current_active_subscriptions": [dict(row) for row in subscriptions[:30]],
        "current_goals": [dict(row) for row in goals[:30]],
        "coverage": {"totals": "All transactions in selected month; net cash flow is not an account balance.",
                     "transactions_shown": len(transactions), "transactions_omitted": max(0, count - len(transactions)),
                     "categories_truncated": len(categories) > 30, "budgets_truncated": len(budgets) > 30,
                     "subscriptions_truncated": len(subscriptions) > 30, "goals_truncated": len(goals) > 30,
                     "subscriptions_and_goals": "Current saved state, not a historical snapshot. Goal contributions are separate from ledger transactions."},
    }
