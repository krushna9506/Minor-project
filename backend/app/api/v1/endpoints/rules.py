from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.services.auth import get_current_active_user
from app.models.user import User
from app.models.rule import Rule, RuleCreate, RuleUpdate
from app.db.mongodb import db
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[Rule])
async def get_rules(current_user: User = Depends(get_current_active_user)):
    items = await db.db.rules.find({}).to_list(length=None)
    for it in items:
        if "_id" in it:
            it["id"] = str(it["_id"])
            del it["_id"]
    return items


@router.post("/", response_model=Rule)
async def create_rule(rule: RuleCreate, current_user: User = Depends(get_current_active_user)):
    doc = rule.dict()
    doc["created_by"] = str(current_user.id)
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = None
    result = await db.db.rules.insert_one(doc)
    created = await db.db.rules.find_one({"_id": result.inserted_id})
    if created and "_id" in created:
        created["id"] = str(created["_id"])
        del created["_id"]
    return created


@router.put("/{rule_id}", response_model=Rule)
async def update_rule(rule_id: str, rule_update: RuleUpdate, current_user: User = Depends(get_current_active_user)):
    try:
        obj_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    existing = await db.db.rules.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")
    update_data = {k: v for k, v in rule_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.db.rules.update_one({"_id": obj_id}, {"$set": update_data})
    updated = await db.db.rules.find_one({"_id": obj_id})
    if updated and "_id" in updated:
        updated["id"] = str(updated["_id"])
        del updated["_id"]
    return updated


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, current_user: User = Depends(get_current_active_user)):
    try:
        obj_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    existing = await db.db.rules.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.db.rules.delete_one({"_id": obj_id})
    return {"message": "Rule deleted", "id": rule_id}
