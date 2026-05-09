from typing import List, Optional
from fastapi import APIRouter, Query, Depends, HTTPException, status
from app.services.auth import get_current_active_user
from app.models.user import User
from app.models.room import Room, RoomCreate, RoomUpdate
from app.db.mongodb import db
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_rooms(
    building: Optional[str] = Query(None, description="Filter by building (optional)"),
    room_type: Optional[str] = Query(None, description="Filter by room type (optional)"),
    min_capacity: Optional[int] = Query(None, description="Minimum capacity (optional)"),
    current_user: User = Depends(get_current_active_user),
):
    """Get all rooms from the database (returns ALL by default, optional filters available)"""
    try:
        # Build filter query - return ALL rooms by default
        filter_query = {}
        
        # Optional filters - only apply if explicitly provided
        if building:
            filter_query["building"] = {"$regex": building, "$options": "i"}
        
        if room_type:
            filter_query["room_type"] = {"$regex": room_type, "$options": "i"}
            
        if min_capacity is not None:
            filter_query["capacity"] = {"$gte": min_capacity}
        
        print(f"🔍 Querying rooms with filter: {filter_query} (empty filter = ALL rooms)")
        
        # Query the database
        rooms = await db.db.rooms.find(filter_query).to_list(length=None)
        
        print(f"🏢 Found {len(rooms)} rooms in database")
        
        # Convert ObjectId to string for JSON serialization
        for room in rooms:
            if "_id" in room:
                room["id"] = str(room["_id"])
                del room["_id"]
            # Convert all ObjectId fields to strings
            for key, value in room.items():
                if isinstance(value, ObjectId):
                    room[key] = str(value)
        
        return rooms
        
    except Exception as e:
        print(f"❌ Error querying rooms: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch rooms: {str(e)}")


@router.post("/", response_model=dict)
async def create_room(
    room: RoomCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new room"""
    try:
        print(f"🚀 Creating room: {room.dict()}")
        
        # Check if room name already exists in the same building
        existing_room = await db.db.rooms.find_one({
            "name": room.name,
            "building": room.building
        })
        if existing_room:
            print(f"❌ Room {room.name} already exists in building {room.building}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room '{room.name}' already exists in building '{room.building}'"
            )
        
        # Convert room to dict and prepare for insertion
        room_dict = room.dict()
        room_dict["created_by"] = str(current_user.id)
        room_dict["created_at"] = datetime.utcnow()
        room_dict["updated_at"] = None
        
        # Insert the room
        result = await db.db.rooms.insert_one(room_dict)
        
        if result.inserted_id:
            # Fetch the created room
            created_room = await db.db.rooms.find_one({"_id": result.inserted_id})
            
            # Convert ObjectIds to strings for JSON response
            if "_id" in created_room:
                created_room["id"] = str(created_room["_id"])
                del created_room["_id"]
            if "created_by" in created_room:
                created_room["created_by"] = str(created_room["created_by"])
            
            print(f"✅ Room created successfully with ID: {created_room['id']}")
            return created_room
        else:
            print("❌ Failed to insert room into database")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create room"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create room: {str(e)}"
        )


@router.put("/{room_id}", response_model=dict)
async def update_room(
    room_id: str,
    room_update: RoomUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a room"""
    try:
        print(f"🔄 Updating room {room_id} with: {room_update.dict(exclude_unset=True)}")
        
        # Validate room_id format
        try:
            obj_id = ObjectId(room_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid room ID format"
            )
        
        # Check if room exists
        existing_room = await db.db.rooms.find_one({"_id": obj_id})
        if not existing_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Prepare update data
        update_data = room_update.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            # Check if name is being changed and if it already exists
            if "name" in update_data and update_data["name"] != existing_room["name"]:
                building = update_data.get("building", existing_room["building"])
                name_exists = await db.db.rooms.find_one({
                    "name": update_data["name"],
                    "building": building,
                    "_id": {"$ne": obj_id}
                })
                if name_exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Room '{update_data['name']}' already exists in building '{building}'"
                    )
            
            # Update the room
            result = await db.db.rooms.update_one(
                {"_id": obj_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                # Fetch updated room
                updated_room = await db.db.rooms.find_one({"_id": obj_id})
                
                # Convert ObjectIds to strings
                if "_id" in updated_room:
                    updated_room["id"] = str(updated_room["_id"])
                    del updated_room["_id"]
                if "created_by" in updated_room:
                    updated_room["created_by"] = str(updated_room["created_by"])
                
                print(f"✅ Room updated successfully")
                return updated_room
            else:
                print("⚠️ No changes made to room")
                # Return current room even if no changes
                existing_room["id"] = str(existing_room["_id"])
                del existing_room["_id"]
                if "created_by" in existing_room:
                    existing_room["created_by"] = str(existing_room["created_by"])
                return existing_room
        else:
            # No update data provided, return existing room
            existing_room["id"] = str(existing_room["_id"])
            del existing_room["_id"]
            if "created_by" in existing_room:
                existing_room["created_by"] = str(existing_room["created_by"])
            return existing_room
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update room: {str(e)}"
        )


@router.delete("/{room_id}")
async def delete_room(
    room_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a room"""
    try:
        print(f"🗑️ Deleting room {room_id}")
        
        # Validate room_id format
        try:
            obj_id = ObjectId(room_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid room ID format"
            )
        
        # Check if room exists
        existing_room = await db.db.rooms.find_one({"_id": obj_id})
        if not existing_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Soft delete by setting is_active to False
        result = await db.db.rooms.update_one(
            {"_id": obj_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Room soft deleted successfully")
            return {"message": "Room deleted successfully", "id": room_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete room"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete room: {str(e)}"
        )
