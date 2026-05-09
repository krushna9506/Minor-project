from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime
from app.db.mongodb import db

class TemplateService:
    """Service for managing timetable templates"""

    @staticmethod
    def _normalize_course_overrides(courses: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        normalized_courses: List[Dict[str, Any]] = []
        for idx, course in enumerate(courses or []):
            if not isinstance(course, dict):
                continue

            course_type = str(course.get("type") or course.get("course_type") or "Core")
            normalized_courses.append({
                "_id": course.get("id") or course.get("_id") or f"local_course_{idx}",
                "course_code": course.get("code") or course.get("course_code") or f"COURSE-{idx + 1}",
                "course_name": course.get("name") or course.get("course_name") or "Unnamed Course",
                "type": course_type,
                "course_type": course_type,
                "hours_per_week": int(course.get("hours_per_week") or 0),
                "min_per_session": int(course.get("min_per_session") or 50),
                "faculty_id": course.get("faculty_id") or "TBD",
                "is_lab": bool(course.get("is_lab")) or course_type.lower() in {"lab", "practical", "practical lab"},
                "lab_hours": int(course.get("lab_hours") or 0),
                "enrolledStudents": int(course.get("enrolledStudents") or course.get("student_strength") or 30),
            })
        return normalized_courses

    @staticmethod
    def _normalize_student_group_overrides(student_groups: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        normalized_groups: List[Dict[str, Any]] = []
        for idx, group in enumerate(student_groups or []):
            if not isinstance(group, dict):
                continue

            normalized_groups.append({
                "_id": group.get("id") or group.get("_id") or f"local_group_{idx}",
                "name": group.get("name") or f"Group {idx + 1}",
                "course_ids": group.get("course_ids") or [],
                "student_strength": int(group.get("student_strength") or 30),
                "program_id": group.get("program_id"),
                "group_type": group.get("group_type") or "Regular Class",
                "section": group.get("section") or "A",
            })
        return normalized_groups

    @staticmethod
    def _normalize_room_overrides(rooms: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        normalized_rooms: List[Dict[str, Any]] = []
        for idx, room in enumerate(rooms or []):
            if not isinstance(room, dict):
                continue

            normalized_rooms.append({
                "_id": room.get("id") or room.get("_id") or f"local_room_{idx}",
                "name": room.get("name") or room.get("room_name") or f"Room-{idx + 1}",
                "room_name": room.get("room_name") or room.get("name") or f"Room-{idx + 1}",
                "room_type": room.get("room_type") or room.get("type") or "Classroom",
                "capacity": int(room.get("capacity") or 30),
                "is_lab": bool(room.get("is_lab")) or "lab" in str(room.get("room_type") or room.get("type") or "").lower(),
            })
        return normalized_rooms

    @staticmethod
    def _normalize_faculty_overrides(faculty_members: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        normalized_faculty: List[Dict[str, Any]] = []
        for idx, faculty in enumerate(faculty_members or []):
            if not isinstance(faculty, dict):
                continue

            normalized_faculty.append({
                "_id": faculty.get("id") or faculty.get("_id") or f"local_faculty_{idx}",
                "name": faculty.get("name") or f"Faculty {idx + 1}",
            })
        return normalized_faculty
    
    @staticmethod
    async def get_template_by_program_semester(
        program_id: str,
        semester: int
    ) -> Optional[Dict[str, Any]]:
        """Get template by program and semester."""
        try:
            template = await db.db.timetable_templates.find_one({
                "program_id": ObjectId(program_id),
                "semester": semester,
                "is_active": True
            })
            return template
        except Exception as e:
            print(f"Error fetching template: {e}")
            return None

    @staticmethod
    async def create_default_template(
        program_id: str,
        semester: int,
        created_by: str,
        rule_id: str = None
    ) -> Dict[str, Any]:
        """Create a default template when none exists or when specifically requested based on a rule."""
        try:
            from datetime import timedelta
            
            # Defaults
            start_str = "10:00"
            end_str = "16:00"
            lunch_str = "12:30"
            session_dur = 50
            lunch_dur = 30
            interval = 0
            
            # Override with Rule if provided
            if rule_id:
                rule = await db.db.rules.find_one({"_id": ObjectId(rule_id)})
                if rule and rule.get("params"):
                    params = rule["params"]
                    start_str = params.get("college_start_time", start_str)
                    end_str = params.get("college_end_time", end_str)
                    lunch_str = params.get("lunch_time", lunch_str)
                    interval = params.get("interval_between_classes", interval)

            def format_time(dt):
                h = dt.strftime("%I").lstrip("0")
                if h == "": h = "0"
                m = dt.strftime("%M")
                return f"{h}:{m}"

            start_dt = datetime.strptime(start_str.zfill(5), "%H:%M")
            end_dt = datetime.strptime(end_str.zfill(5), "%H:%M")
            lunch_dt = datetime.strptime(lunch_str.zfill(5), "%H:%M")
            
            default_time_slots = []
            curr = start_dt
            
            while curr < end_dt:
                # Lunch check logic
                if curr == lunch_dt or (curr < lunch_dt and curr + timedelta(minutes=session_dur) > lunch_dt):
                    l_end = lunch_dt + timedelta(minutes=lunch_dur)
                    default_time_slots.append({
                        "start_time": format_time(lunch_dt),
                        "end_time": format_time(l_end),
                        "duration_minutes": lunch_dur,
                        "slot_type": "break"
                    })
                    curr = l_end
                    continue
                    
                l_end = curr + timedelta(minutes=session_dur)
                if l_end > end_dt:
                    break
                    
                # Store Theory Slot
                default_time_slots.append({
                    "start_time": format_time(curr),
                    "end_time": format_time(l_end),
                    "duration_minutes": session_dur,
                    "slot_type": "lecture"
                })
                
                # Store potential Lab Slot over current & next session
                next_l_end = l_end + timedelta(minutes=interval + session_dur)
                if not (l_end == lunch_dt or (l_end < lunch_dt and next_l_end > lunch_dt)):
                    if next_l_end <= end_dt:
                        default_time_slots.append({
                            "start_time": format_time(curr),
                            "end_time": format_time(next_l_end),
                            "duration_minutes": session_dur * 2 + interval,
                            "slot_type": "lab"
                        })
                
                curr = l_end + timedelta(minutes=interval)
            
            default_constraints = [
                {"constraint_type": "no_consecutive_labs", "description": "No two lab sessions consecutively", "parameters": {}, "is_hard": True},
                {"constraint_type": "max_hours_per_day", "description": "Maximum 6 hours of classes per day", "parameters": {"max_hours": 6}, "is_hard": True},
                {"constraint_type": "lunch_break_mandatory", "description": "Lunch break must be scheduled", "parameters": {"start_time": "12:30", "duration": 30}, "is_hard": True}
            ]
            
            template_doc = {
                "template_name": f"Rule Base Timetable - Semester {semester}" if rule_id else f"Default Template - Semester {semester}",
                "program_id": ObjectId(program_id),
                "semester": semester,
                "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "time_slots": default_time_slots,
                "subjects": [],
                "break_times": [slot for slot in default_time_slots if slot["slot_type"] in ["break", "lunch"]],
                "room_preferences": {"lecture": ["Room-101", "Room-102", "Room-103"], "lab": ["Lab-1", "Lab-2", "Lab-3"]},
                "constraints": default_constraints,
                "is_active": True,
                "is_default": True,
                "description": "Auto-generated default template matching active rule settings",
                "created_by": ObjectId(created_by) if created_by != "demo" else "demo",
                "created_at": datetime.utcnow()
            }
            
            result = await db.db.timetable_templates.insert_one(template_doc)
            template_doc["_id"] = result.inserted_id
            print(f"✅ Created default template for program {program_id}, semester {semester}")
            return template_doc
        except Exception as e:
            print(f"❌ Error creating default template: {e}")
            raise

    @staticmethod
    async def apply_template_to_timetable(
        template: Dict[str, Any],
        program_id: str,
        semester: int,
        academic_year: str,
        title: str,
        created_by: str,
        student_group_id: Optional[str] = None,
        courses_override: Optional[List[Dict[str, Any]]] = None,
        student_groups_override: Optional[List[Dict[str, Any]]] = None,
        rooms_override: Optional[List[Dict[str, Any]]] = None,
        faculty_override: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Apply template data to create a new timetable."""
        try:
            override_courses = TemplateService._normalize_course_overrides(courses_override)
            override_groups = TemplateService._normalize_student_group_overrides(student_groups_override)
            override_rooms = TemplateService._normalize_room_overrides(rooms_override)
            override_faculty = TemplateService._normalize_faculty_overrides(faculty_override)
            courses: List[Dict[str, Any]] = []
            student_groups: List[Dict[str, Any]] = []

            # Fetch student groups (program_id is stored as string in student_groups collection)
            if override_groups:
                student_groups = [
                    group for group in override_groups
                    if not group.get("program_id") or str(group.get("program_id")) == str(program_id)
                ]
                if not student_groups:
                    student_groups = override_groups
                print(f"👥 Using {len(student_groups)} student groups from request payload")

                if override_courses:
                    selected_course_ids = {
                        str(course_id)
                        for group in student_groups
                        for course_id in group.get("course_ids", [])
                    }
                    courses = [
                        course for course in override_courses
                        if not selected_course_ids or str(course.get('_id')) in selected_course_ids
                    ]
                else:
                    courses = []
            elif student_group_id:
                # Use specific student group
                student_group = await db.db.student_groups.find_one({"_id": ObjectId(student_group_id)})
                student_groups = [student_group] if student_group else []
                print(f"👥 Using specific student group: {student_group.get('name') if student_group else 'Not found'}")
                
                # Get courses from the student group
                if student_group and student_group.get("course_ids"):
                    course_ids = [ObjectId(cid) for cid in student_group.get("course_ids", [])]
                    courses = await db.db.courses.find({"_id": {"$in": course_ids}}).to_list(length=100)
                    print(f"📚 Found {len(courses)} courses from student group")
                elif override_courses:
                    courses = override_courses
            else:
                # Use all student groups for the program
                student_groups = await db.db.student_groups.find({
                    "program_id": program_id  # Use string, not ObjectId
                }).to_list(length=50)
                print(f"👥 Found {len(student_groups)} student groups for program")

                if override_courses:
                    courses = override_courses
                    print(f"📚 Using {len(courses)} courses from request payload")
                else:
                    # Get all courses for program and semester
                    courses = await db.db.courses.find({"program_id": ObjectId(program_id), "semester": semester}).to_list(length=100)
                    print(f"📚 Found {len(courses)} courses for program")

            if not override_groups and override_courses:
                courses = override_courses
                print(f"📚 Falling back to {len(courses)} request payload courses without stored student groups")
            
            # Fetch rooms
            rooms = override_rooms if override_rooms else await db.db.rooms.find({}).to_list(length=100)
            print(f"🏫 Found {len(rooms)} rooms")
            if rooms:
                print(f"   Sample room: {rooms[0].get('room_name', 'NO_NAME')} - Type: {rooms[0].get('room_type', 'NO_TYPE')}")
            
            # Fetch all faculty
            all_faculty = override_faculty if override_faculty else await db.db.faculty.find({}).to_list(length=100)
            print(f"👨‍🏫 Found {len(all_faculty)} faculty members")

            if not courses:
                raise ValueError("No courses available for timetable generation")
            if not rooms:
                raise ValueError("No rooms available for timetable generation")
            
            # Create faculty mapping
            faculty_map = {}
            faculty_list = list(all_faculty)  # Convert to list for round-robin assignment
            
            for idx, course in enumerate(courses):
                course_id = str(course["_id"])
                
                # Try to get faculty from course's faculty_id
                if course.get("faculty_id"):
                    faculty = await db.db.faculty.find_one({"_id": course["faculty_id"]})
                    if faculty:
                        faculty_map[course_id] = faculty.get("name", "TBD")
                        continue
                
                # If no faculty assigned, leave blank explicitly to avoid mismatch
                faculty_map[course_id] = "TBD"
            
            print(f"   Faculty assignments: {len(faculty_map)} courses mapped")
            
            # Run the GA Engine to allocate timetable optimally!
            from app.services.timetable.ga_engine import GAEngine
            print("🧬 Initializing GA Engine...")
            ga = GAEngine(courses, student_groups, rooms, all_faculty, template)
            best_chromosome, best_fitness, ga_message = ga.run(pop_size=50, max_generations=150)
            print(f"🧬 GA Engine finished. Fitness: {best_fitness} | Reason: {ga_message}")
            
            raw_entries = ga.chromosome_to_entries(best_chromosome)
            entries = []
            schedule_details = []
            
            for g in raw_entries:
                # Add to DB format entries
                entries.append({
                    "course_id": g["_internal_course_id"],
                    "course_code": g["course_code"],
                    "course_name": g["course_name"],
                    "faculty_id": "" if g["_internal_faculty_id"] == "TBD" else g["_internal_faculty_id"],
                    "room_id": "" if g["_internal_room_id"] == "TBD" else g["_internal_room_id"],
                    "room_name": g["room"],
                    "time_slot": g["time_slot"],
                    "group_id": "" if g["_internal_group_id"] == "TBD" else g["_internal_group_id"],
                    "group_name": g.get("group_name", "All")
                })
                
                # Add to visual detailed format
                schedule_details.append({
                    "day": g["time_slot"]["day"],
                    "start_time": g["time_slot"]["start_time"],
                    "end_time": g["time_slot"]["end_time"],
                    "course_name": g["course_name"],
                    "course_code": g["course_code"],
                    "group": "All",
                    "room": g["room"],
                    "faculty": g["faculty_name"],
                    "is_lab": g["is_lab"],
                    "duration": g["time_slot"]["duration_minutes"],
                    "time_slot_formatted": f"{g['time_slot']['start_time']} - {g['time_slot']['end_time']}"
                })
            
            timetable_doc = {
                "title": title,
                "program_id": ObjectId(program_id),
                "semester": semester,
                "academic_year": academic_year,
                "entries": entries,
                "is_draft": False,
                "created_by": ObjectId(created_by) if created_by != "demo" else "demo",
                "created_at": datetime.utcnow(),
                "generated_at": datetime.utcnow(),
                "validation_status": "pending",
                "template_id": template.get("_id"),
                "generation_seed": datetime.utcnow().timestamp(),  # Unique seed for each generation
                "metadata": {
                    "generation_method": "template_based",
                    "template_name": template.get("template_name"),
                    "total_entries": len(entries),
                    "working_days": template.get("working_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
                    "time_slots": template.get("time_slots", []),
                    "break_times": template.get("break_times", []),
                    "time_slots_used": len(entries),
                    "schedule_details": schedule_details,
                    "unique_courses": len(set(e.get("course_code") for e in schedule_details)),
                    "theory_sessions": len([e for e in schedule_details if not e.get("is_lab")]),
                    "lab_sessions": len([e for e in schedule_details if e.get("is_lab")])
                }
            }
            
            # Debug: Print sample schedule details
            print(f"\n📋 Generated {len(schedule_details)} schedule entries")
            if schedule_details:
                print(f"   Sample entry: {schedule_details[0]}")
            
            # Check if timetable with exact same mapping already exists to prevent duplicates
            existing_timetable = await db.db.timetables.find_one({
                "program_id": ObjectId(program_id),
                "semester": semester,
                "academic_year": academic_year,
                "title": title
            })
            
            if existing_timetable:
                print(f"🔄 Updating existing timetable {existing_timetable['_id']}")
                await db.db.timetables.replace_one({"_id": existing_timetable["_id"]}, timetable_doc)
                timetable_doc["_id"] = existing_timetable["_id"]
                print(f"✅ Updated timetable with {len(entries)} entries")
            else:
                result = await db.db.timetables.insert_one(timetable_doc)
                timetable_doc["_id"] = result.inserted_id
                print(f"✅ Created timetable with {len(entries)} entries")
                
            return timetable_doc
        except Exception as e:
            print(f"❌ Error applying template: {e}")
            raise

    @staticmethod
    def convert_objectids_to_strings(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectIds to strings for JSON serialization"""
        if not doc:
            return doc
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
        objectid_fields = ["created_by", "program_id", "template_id"]
        for field in objectid_fields:
            if field in doc and doc[field] and doc[field] != "demo":
                doc[field] = str(doc[field])
        return doc
    
    @staticmethod
    async def get_all_templates(program_id: Optional[str] = None, semester: Optional[int] = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get all templates with optional filters"""
        try:
            query = {}
            if program_id:
                query["program_id"] = ObjectId(program_id)
            if semester is not None:
                query["semester"] = semester
            if is_active is not None:
                query["is_active"] = is_active
            templates = await db.db.timetable_templates.find(query).to_list(length=100)
            for template in templates:
                TemplateService.convert_objectids_to_strings(template)
            return templates
        except Exception as e:
            print(f"Error fetching templates: {e}")
            return []
    
    @staticmethod
    async def create_template(template_data: Any, created_by: str) -> Dict[str, Any]:
        """Create a new template"""
        try:
            template_dict = template_data.dict()
            template_dict["program_id"] = ObjectId(template_dict["program_id"])
            template_dict["created_by"] = ObjectId(created_by) if created_by != "demo" else "demo"
            template_dict["created_at"] = datetime.utcnow()
            result = await db.db.timetable_templates.insert_one(template_dict)
            template_dict["_id"] = result.inserted_id
            return TemplateService.convert_objectids_to_strings(template_dict)
        except Exception as e:
            print(f"Error creating template: {e}")
            raise
    
    @staticmethod
    async def update_template(template_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing template"""
        try:
            update_data["updated_at"] = datetime.utcnow()
            result = await db.db.timetable_templates.update_one({"_id": ObjectId(template_id)}, {"$set": update_data})
            if result.matched_count == 0:
                return None
            template = await db.db.timetable_templates.find_one({"_id": ObjectId(template_id)})
            return TemplateService.convert_objectids_to_strings(template)
        except Exception as e:
            print(f"Error updating template: {e}")
            raise
    
    @staticmethod
    async def delete_template(template_id: str) -> bool:
        """Delete a template"""
        try:
            result = await db.db.timetable_templates.delete_one({"_id": ObjectId(template_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting template: {e}")
            return False
