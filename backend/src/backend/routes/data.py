from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Budget, Category, Transaction
from backend.schemas.data import ClearDataRequest, ClearDataResponse


router = APIRouter(
    prefix="/data",
    tags=["Data"],
)


@router.delete(
    "/clear",
    response_model=ClearDataResponse,
    summary="Clear saved transactions, budgets and categories",
    description="Requires the exact confirmation CLEAR. Deletes transactions, budgets and categories in one transaction. Goals and entries, subscriptions, payment history, import rules and browser-only tools remain; category links on subscriptions and rules become null.",
)
def clear_data(
    request: ClearDataRequest,
    db: Session = Depends(get_db),
):
    if request.confirmation != "CLEAR":
        raise HTTPException(
            status_code=400,
            detail="You must type CLEAR to confirm.",
        )

    try:
        # Both transactions and budgets reference categories. Keep all deletes
        # in one transaction, with the referenced categories deleted last.
        db.execute(delete(Transaction))
        db.execute(delete(Budget))
        db.execute(delete(Category))

        db.commit()

        return ClearDataResponse(
            message="Transactions, budgets, and categories cleared successfully."
        )

    except OperationalError:
        db.rollback()
        # Let the shared dependency report database unavailability as a safe 503.
        raise
    except SQLAlchemyError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to clear data.",
        ) from None
