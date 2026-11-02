"""Additive backup merge. Existing records win; related IDs are remapped."""

from collections import defaultdict, deque
from dataclasses import dataclass
import json

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import insert, select, text
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.schemas.backup import BackupFile, MAX_BACKUP_BYTES
from backend.services.backup import BACKUP_MODELS


def read_backup(file) -> BackupFile:
    contents = file.read(MAX_BACKUP_BYTES + 1)
    if len(contents) > MAX_BACKUP_BYTES:
        raise HTTPException(413, "Choose a JSON backup no larger than 50 MB.")
    try:
        # Reject duplicate JSON object keys instead of silently dropping records.
        def unique_object(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError("Duplicate JSON keys.")
                result[key] = value
            return result
        payload = json.loads(contents.decode("utf-8-sig"), object_pairs_hook=unique_object)
        return BackupFile.model_validate(payload)
    except ValidationError as failure:
        problem = failure.errors(include_input=False, include_url=False)[0]
        location = ".".join(str(part) for part in problem["loc"])
        raise HTTPException(422, f"Invalid backup at {location}: {problem['msg']}") from None
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise HTTPException(422, "Choose a valid Finance Engine JSON backup from Download All Data.") from None


def identity(table, row):
    # Names/settings and one-per-period records retain their current values.
    fields = {
        "categories": ("name",), "bank_styles": ("name",),
        "budgets": ("month", "year", "category"),
        "transaction_rules": ("match_text",),
        "goals": ("name", "type"),
        "subscriptions": ("name", "billing_cycle", "billing_anchor_date", "payment_method_label"),
        "subscription_payments": ("subscription_id", "due_date"),
        "transactions": ("date", "merchant", "category", "bank", "type", "amount"),
        "goal_entries": ("goal_id", "type", "date", "note", "amount"),
    }[table]
    return tuple(row[field].lower() if table == "categories" else row[field] for field in fields)


@dataclass
class MergePlan:
    inserts: dict[str, list[dict]]
    counts: dict[str, dict[str, int]]


def plan_merge(db: Session, backup: BackupFile) -> MergePlan:
    inserts, counts, mappings = {}, {}, {}
    # Category names are stable keys. Integer IDs are only local to a database.
    for model in BACKUP_MODELS:
        table = model.__table__
        name = table.name
        existing = [dict(row) for row in db.execute(select(table).order_by(*table.primary_key.columns)).mappings()]
        primary = "name" if name in ("categories", "bank_styles") else "id"
        next_id = max((row["id"] for row in existing), default=0) + 1 if primary == "id" else 0
        buckets = defaultdict(deque)
        for row in existing:
            buckets[identity(name, row)].append(row[primary])
        mappings[name] = {}
        inserts[name] = []
        source = getattr(backup.data, name)
        for record in source:
            row = record.model_dump()
            old_key = row[primary]
            if row.get("category") is not None:
                row["category"] = mappings["categories"][row["category"]]
            if name == "goal_entries":
                row["goal_id"] = mappings["goals"][row["goal_id"]]
            if name == "subscription_payments":
                row["subscription_id"] = mappings["subscriptions"][row["subscription_id"]]
            matches = buckets[identity(name, row)]
            if matches:
                # Consume matches so identical legitimate transactions/parents
                # keep their multiplicity, including on repeated imports.
                mappings[name][old_key] = matches.popleft()
                continue
            if primary == "id":
                if next_id > 2_147_483_647:
                    raise HTTPException(409, "No more record IDs are available.")
                row[primary] = next_id
                next_id += 1
            mappings[name][old_key] = row[primary]
            inserts[name].append(row)
        counts[name] = {"new": len(inserts[name]), "skipped": len(source) - len(inserts[name])}
    return MergePlan(inserts, counts)


def merge_backup(db: Session, backup: BackupFile):
    try:
        if db.get_bind().dialect.name == "postgresql":
            # Serialize a merge with other imports and ordinary edits. The table
            # names below are application constants, never file-controlled SQL.
            names = ", ".join(model.__tablename__ for model in BACKUP_MODELS)
            db.execute(text(f"LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE"))
        # Recompute after locking; a preview is not permission to overwrite later changes.
        plan = plan_merge(db, backup)
        for model in BACKUP_MODELS:
            table = model.__table__
            rows = plan.inserts[table.name]
            for start in range(0, len(rows), 1000):
                db.execute(insert(table), rows[start:start + 1000])
            if rows and "id" in table.c and db.get_bind().dialect.name == "postgresql":
                # Explicit remapped IDs must not collide with the next ordinary
                # insert. Never move an existing sequence backwards.
                db.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                    f"GREATEST((SELECT max(id) FROM {table.name}), "
                    f"nextval(pg_get_serial_sequence('{table.name}', 'id'))), true)"
                ))
        db.commit()
        return {"counts": plan.counts, "browser_data": backup.browser_data}
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "The backup conflicts with saved data. Nothing was imported. Preview it again.") from None
    except OperationalError:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(500, "Unable to save the backup. Nothing was imported. Please try again.") from None
