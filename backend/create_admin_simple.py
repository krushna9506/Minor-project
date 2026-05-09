import asyncio
import sys
from datetime import datetime
from bson import ObjectId
import bcrypt
from app.db.mongodb import db, connect_to_mongo

async def create_admin():
    try:
        print("🔄 Connecting to MongoDB...")
        await connect_to_mongo()
        
        if db.db is None:
            print("❌ Failed to connect to database. Please check your MongoDB connection.")
            print("💡 Make sure MongoDB is running on localhost:27017")
            return
        
        print("✅ Connected to database successfully!")
        
        email = "admin@example.com"
        password = "admin123"
        
        print(f"🔍 Checking if admin user exists...")
        existing = await db.db.users.find_one({"email": email})
        if existing:
            print("❌ Admin user already exists.")
            print(f"📧 Email: {email}")
            print(f"🆔 User ID: {existing.get('_id')}")
            return

        print("🔐 Creating admin user...")
        # Hash password using bcrypt directly
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

        admin_user = {
            "email": email,
            "full_name": "System Administrator",
            "hashed_password": hashed_password,
            "is_active": True,
            "is_admin": True,
            "role": "admin",
            "created_at": datetime.utcnow()
        }

        result = await db.db.users.insert_one(admin_user)
        print("✅ Admin user created successfully!")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")
        print(f"🆔 User ID: {result.inserted_id}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        print(f"📋 Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_admin())
