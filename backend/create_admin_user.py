import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
import bcrypt

async def create_admin():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["timetable_system1"]
    
    # Hash admin password
    password = "admin123"
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Check if admin already exists
    existing = await db.users.find_one({"email": "admin@example.com"})
    if existing:
        print("Admin user already exists!")
        client.close()
        return
    
    # Create admin user
    admin_user = {
        "email": "admin@example.com",
        "full_name": "Administrator",
        "hashed_password": hashed_password,
        "is_active": True,
        "is_admin": True,
        "role": "admin",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(admin_user)
    print(f"✅ Admin user created successfully!")
    print(f"   Email: admin@example.com")
    print(f"   Password: admin123")
    print(f"   ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
