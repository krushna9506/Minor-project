from fastapi import APIRouter

api_router = APIRouter()

# Import all API routers
from app.api.v1.endpoints import (
    users, 
    auth, 
    programs, 
    courses,
    timetable,
    timetable_templates,
    constraints,
    faculty,
    student_groups,
    rooms
)
from app.api.v1.endpoints import rules
from app.api.v1.endpoints import ai

# Include all routers
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(programs.router, prefix="/programs", tags=["Programs"])
api_router.include_router(courses.router, prefix="/courses", tags=["Courses"])
api_router.include_router(faculty.router, prefix="/faculty", tags=["Faculty"])
api_router.include_router(student_groups.router, prefix="/student-groups", tags=["Student Groups"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(timetable.router, prefix="/timetable", tags=["Timetable"])
api_router.include_router(timetable_templates.router, prefix="/timetable-templates", tags=["Timetable Templates"])
api_router.include_router(constraints.router, prefix="/constraints", tags=["Constraints"])
api_router.include_router(rules.router, prefix="/rules", tags=["Rules"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistance"])
