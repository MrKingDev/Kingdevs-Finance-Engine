from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.services.categories import resolve_category

from backend.database import get_db
from backend.models.budget import Budget
from backend.models.transaction import Transaction
from backend.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
)

router = APIRouter(
    prefix="/budgets",
    tags=["Budgets"],
)


def get_month_date_range(
    year: int,
    month: int,
) -> tuple[date, date]:
    """
    Returns the first and last date for the requested month.
    """

    first_day = date(
        year,
        month,
        1,
    )

    last_day_number = monthrange(
        year,
        month,
    )[1]

    last_day = date(
        year,
        month,
        last_day_number,
    )

    return first_day, last_day


def calculate_budget_response(
    db: Session,
    budget: Budget,
) -> BudgetResponse:
    """
    Calculate spent, remaining, and usage percentage
    from transaction data.
    """

    first_day, last_day = get_month_date_range(
        budget.year,
        budget.month,
    )

    spent_query = select(
        func.coalesce(
            func.sum(Transaction.amount),
            0,
        )
    ).where(
        Transaction.type == "expense",
        Transaction.date >= first_day,
        Transaction.date <= last_day,
    )
    if budget.category is not None:
        spent_query = spent_query.where(Transaction.category == budget.category)

    spent_result = db.scalar(spent_query)

    spent = Decimal(
        str(spent_result or 0)
    )

    budget_amount = Decimal(
        str(budget.amount)
    )

    remaining = budget_amount - spent

    if budget_amount > 0:
        usage_percentage = float(
            (spent / budget_amount) * 100
        )
    else:
        usage_percentage = 0.0

    return BudgetResponse(
        category=budget.category,
        id=budget.id,
        month=budget.month,
        year=budget.year,
        budget=budget_amount,
        spent=spent,
        remaining=remaining,
        usage_percentage=usage_percentage,
    )


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
):
    category = resolve_category(db, budget_data.category) if budget_data.category is not None else None
    existing_budget = db.scalar(
        select(Budget).where(
            Budget.month == budget_data.month,
            Budget.year == budget_data.year,
            Budget.category == category,
        )
    )

    if existing_budget:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category, month and year.",
        )

    budget = Budget(
        category=category,
        month=budget_data.month,
        year=budget_data.year,
        amount=budget_data.amount,
    )

    db.add(budget)

    try:
        db.commit()
        db.refresh(budget)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category, month and year.",
        )

    return calculate_budget_response(
        db,
        budget,
    )


@router.get(
    "",
    response_model=list[BudgetResponse],
)
def get_budgets(
    db: Session = Depends(get_db),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
):
    query = select(Budget).order_by(Budget.year.desc(), Budget.month.desc(), Budget.category)
    if month is not None:
        query = query.where(Budget.month == month)
    if year is not None:
        query = query.where(Budget.year == year)
    budgets = db.scalars(query).all()

    return [
        calculate_budget_response(
            db,
            budget,
        )
        for budget in budgets
    ]


@router.get(
    "/{budget_id}",
    response_model=BudgetResponse,
)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = db.get(
        Budget,
        budget_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    return calculate_budget_response(
        db,
        budget,
    )


@router.put(
    "/{budget_id}",
    response_model=BudgetResponse,
)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
):
    budget = db.get(
        Budget,
        budget_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    update_data = budget_data.model_dump(
        exclude_unset=True,
    )
    if update_data.get("category") is not None:
        update_data["category"] = resolve_category(db, update_data["category"])

    for field, value in update_data.items():
        setattr(
            budget,
            field,
            value,
        )

    try:
        db.commit()
        db.refresh(budget)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A budget already exists for this category, month and year.",
        )

    return calculate_budget_response(
        db,
        budget,
    )


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    budget = db.get(
        Budget,
        budget_id,
    )

    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    db.delete(budget)
    db.commit()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )
