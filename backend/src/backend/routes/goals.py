from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.goal import Goal, GoalEntry
from backend.schemas.goal import GoalCreate, GoalEntryCreate, GoalEntryResponse, GoalResponse

router = APIRouter(prefix="/goals", tags=["Goals"])


def goal_query():
    # Aggregate from durable entries rather than updating counters that can lose concurrent writes.
    totals = select(
        GoalEntry.goal_id,
        *[
            func.sum(case((GoalEntry.type == kind, GoalEntry.amount), else_=0)).label(label)
            for kind, label in [("contribution", "contributed"), ("income", "documented_income"),
                                ("expense", "necessary_expenses")]
        ],
    ).group_by(GoalEntry.goal_id).subquery()
    return select(
        Goal.id, Goal.name, Goal.type, Goal.target_amount, Goal.target_date,
        func.coalesce(totals.c.contributed, 0).label("contributed"),
        func.coalesce(totals.c.documented_income, 0).label("documented_income"),
        func.coalesce(totals.c.necessary_expenses, 0).label("necessary_expenses"),
    ).outerjoin(totals, totals.c.goal_id == Goal.id)


def require_goal(db: Session, goal_id: int, *, lock: bool = False):
    query = select(Goal).where(Goal.id == goal_id)
    goal = db.scalar(query.with_for_update() if lock else query)
    if goal is None:
        raise HTTPException(404, "Goal not found.")
    return goal


@router.get("", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db)):
    return db.execute(goal_query().order_by(Goal.id)).mappings().all()


@router.get("/{goal_id}", response_model=GoalResponse)
def read_goal(goal_id: int, db: Session = Depends(get_db)):
    result = db.execute(goal_query().where(Goal.id == goal_id)).mappings().first()
    if result is None:
        raise HTTPException(404, "Goal not found.")
    return result


@router.post("", response_model=GoalResponse, status_code=201)
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(**data.model_dump())
    db.add(goal)
    db.flush()
    result = read_goal(goal.id, db)
    db.commit()
    return result


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    db.delete(require_goal(db, goal_id, lock=True))
    db.commit()
    return Response(status_code=204)


@router.get("/{goal_id}/entries", response_model=list[GoalEntryResponse])
def list_entries(goal_id: int, db: Session = Depends(get_db)):
    require_goal(db, goal_id)
    return db.scalars(select(GoalEntry).where(GoalEntry.goal_id == goal_id)
                      .order_by(GoalEntry.date.desc(), GoalEntry.id.desc())).all()


@router.post("/{goal_id}/entries", response_model=GoalResponse, status_code=201,
             description="Records a goal entry and returns updated totals. Does not create a ledger transaction.")
def create_entry(goal_id: int, data: GoalEntryCreate, db: Session = Depends(get_db)):
    require_goal(db, goal_id, lock=True)
    db.add(GoalEntry(goal_id=goal_id, **data.model_dump()))
    db.flush()
    result = read_goal(goal_id, db)
    db.commit()
    return result
