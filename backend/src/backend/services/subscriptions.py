from calendar import monthrange
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models.subscription import Subscription, SubscriptionPayment
from backend.schemas.subscription import (
    PaymentCreate, PaymentResponse, PaymentResult, SubscriptionCreate,
    SubscriptionOverview, SubscriptionResponse, SubscriptionSummary, SubscriptionUpdate,
)
from backend.services.categories import resolve_category


def today() -> date:
    return datetime.now(timezone.utc).date()


def next_occurrence(current: date, anchor: date, cycle: str) -> date:
    if current.year >= 9999:
        raise HTTPException(422, "Choose a due date before year 9999.")
    if cycle == "annual":
        year, month = current.year + 1, anchor.month
    else:
        year, month = current.year + (current.month == 12), current.month % 12 + 1
    return date(year, month, min(anchor.day, monthrange(year, month)[1]))


def get_subscription(db: Session, subscription_id: int, *, lock: bool = False) -> Subscription:
    query = select(Subscription).where(Subscription.id == subscription_id)
    if lock:
        query = query.with_for_update()
    item = db.scalar(query)
    if item is None:
        raise HTTPException(404, "Subscription not found.")
    return item


def response_for(db: Session, item: Subscription, as_of: date | None = None, history=None) -> SubscriptionResponse:
    as_of = as_of or today()
    if history is None:
        history = db.execute(select(func.max(SubscriptionPayment.paid_on), func.count(SubscriptionPayment.id)).where(
            SubscriptionPayment.subscription_id == item.id
        )).one()
    status = "archived" if not item.is_active else (
        "overdue" if item.next_due_date < as_of else "due_today" if item.next_due_date == as_of else "upcoming"
    )
    return SubscriptionResponse(
        id=item.id, name=item.name, amount=item.amount, billing_cycle=item.billing_cycle,
        next_due_date=item.next_due_date, category=item.category, payment_method_label=item.payment_method_label,
        icon=item.icon, is_active=item.is_active, created_at=item.created_at, updated_at=item.updated_at,
        next_bill_status=status, following_due_date=next_occurrence(item.next_due_date, item.billing_anchor_date, item.billing_cycle),
        yearly_cost=item.amount * (12 if item.billing_cycle == "monthly" else 1),
        last_paid_on=history[0], payment_count=history[1],
    )


def overview(db: Session, include_archived: bool = False) -> SubscriptionOverview:
    as_of = today()
    query = select(Subscription).order_by(Subscription.next_due_date, Subscription.id)
    if not include_archived:
        query = query.where(Subscription.is_active.is_(True))
    items = db.scalars(query).all()
    history = {sid: (last_paid, count) for sid, last_paid, count in db.execute(
        select(SubscriptionPayment.subscription_id, func.max(SubscriptionPayment.paid_on), func.count(SubscriptionPayment.id))
        .group_by(SubscriptionPayment.subscription_id)
    )}
    responses = [response_for(db, item, as_of, history.get(item.id, (None, 0))) for item in items]
    active = [item for item in responses if item.is_active]
    yearly = sum((item.yearly_cost for item in active), Decimal("0.00"))
    return SubscriptionOverview(items=responses, summary=SubscriptionSummary(
        as_of_date=as_of, active_count=len(active), yearly_cost=yearly,
        monthly_average=(yearly / 12).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        overdue_count=sum(item.next_bill_status == "overdue" for item in active),
        due_today_count=sum(item.next_bill_status == "due_today" for item in active),
        upcoming_count=sum(item.next_bill_status == "upcoming" for item in active),
    ))


def save_subscription(db: Session, data: SubscriptionCreate | SubscriptionUpdate, subscription_id: int | None = None):
    item = get_subscription(db, subscription_id, lock=True) if subscription_id is not None else Subscription()
    values = data.model_dump(exclude_unset=True)
    if values.get("category") is not None:
        values["category"] = resolve_category(db, values["category"])
    due = values.get("next_due_date", item.next_due_date)
    cycle = values.get("billing_cycle", item.billing_cycle)
    schedule_changed = subscription_id is None or due != item.next_due_date or cycle != item.billing_cycle
    if schedule_changed:
        last_due = db.scalar(select(func.max(SubscriptionPayment.due_date)).where(
            SubscriptionPayment.subscription_id == subscription_id
        )) if subscription_id is not None else None
        if last_due is not None and due <= last_due:
            raise HTTPException(422, "Next due date must follow the last recorded billing occurrence.")
        # Validate the schedule before committing; the response computes this too.
        next_occurrence(due, due, cycle)
        item.billing_anchor_date = due
    for key, value in values.items():
        setattr(item, key, value)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "The subscription could not be saved. Refresh and try again.") from None
    db.refresh(item)
    return response_for(db, item)


def record_payment(db: Session, subscription_id: int, data: PaymentCreate) -> tuple[PaymentResult, bool]:
    item = get_subscription(db, subscription_id, lock=True)
    previous = db.scalar(select(SubscriptionPayment).where(
        SubscriptionPayment.subscription_id == subscription_id, SubscriptionPayment.due_date == data.due_date
    ))
    if previous:
        if previous.paid_on != data.paid_on or previous.amount != data.amount:
            raise HTTPException(409, "A different payment is already recorded for this due date.")
        return PaymentResult(payment=PaymentResponse.model_validate(previous), subscription=response_for(db, item)), False
    if not item.is_active:
        raise HTTPException(409, "Restore this subscription before recording a payment.")
    if data.paid_on > today():
        raise HTTPException(422, "Payment date cannot be in the future.")
    if data.due_date != item.next_due_date:
        raise HTTPException(409, "The due date changed. Refresh before recording another payment.")
    following = next_occurrence(item.next_due_date, item.billing_anchor_date, item.billing_cycle)
    # Also ensure the next saved occurrence remains representable in responses.
    next_occurrence(following, item.billing_anchor_date, item.billing_cycle)
    payment = SubscriptionPayment(subscription_id=item.id, **data.model_dump())
    db.add(payment)
    item.next_due_date = following
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A payment was already recorded. Refresh the subscription.") from None
    db.refresh(payment)
    db.refresh(item)
    return PaymentResult(payment=PaymentResponse.model_validate(payment), subscription=response_for(db, item)), True
