from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.subscription import SubscriptionPayment
from backend.schemas.subscription import (
    PaymentCreate, PaymentResponse, PaymentResult, SubscriptionCreate,
    SubscriptionOverview, SubscriptionResponse, SubscriptionSummary, SubscriptionUpdate,
)
from backend.services import subscriptions as service

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(include_archived: bool = False, db: Session = Depends(get_db)):
    return service.overview(db, include_archived).items


@router.get("/overview", response_model=SubscriptionOverview)
def subscription_overview(include_archived: bool = False, db: Session = Depends(get_db)):
    return service.overview(db, include_archived)


@router.get("/summary", response_model=SubscriptionSummary)
def subscription_summary(db: Session = Depends(get_db)):
    return service.overview(db).summary


@router.post("", response_model=SubscriptionResponse, status_code=201)
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db)):
    return service.save_subscription(db, data)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def read_subscription(subscription_id: int, db: Session = Depends(get_db)):
    return service.response_for(db, service.get_subscription(db, subscription_id))


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(subscription_id: int, data: SubscriptionUpdate, db: Session = Depends(get_db)):
    return service.save_subscription(db, data, subscription_id)


@router.delete("/{subscription_id}", status_code=204)
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    item = service.get_subscription(db, subscription_id, lock=True)
    if db.scalar(select(func.count(SubscriptionPayment.id)).where(SubscriptionPayment.subscription_id == item.id)):
        raise HTTPException(409, "This subscription has payment history. Archive it instead.")
    db.delete(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This subscription has payment history. Archive it instead.") from None
    return Response(status_code=204)


@router.get("/{subscription_id}/payments", response_model=list[PaymentResponse])
def payment_history(subscription_id: int, db: Session = Depends(get_db)):
    service.get_subscription(db, subscription_id)
    return db.scalars(select(SubscriptionPayment).where(SubscriptionPayment.subscription_id == subscription_id)
                      .order_by(SubscriptionPayment.paid_on.desc(), SubscriptionPayment.id.desc())).all()


@router.post("/{subscription_id}/payments", response_model=PaymentResult, status_code=201,
             responses={200: {"description": "Identical payment already recorded"}},
             summary="Record a payment and advance one billing period",
             description="Records a manual confirmation; does not charge a card or create a ledger transaction.")
def record_payment(subscription_id: int, data: PaymentCreate, response: Response, db: Session = Depends(get_db)):
    result, created = service.record_payment(db, subscription_id, data)
    response.status_code = 201 if created else 200
    return result
