# backend/app/services/timetable/advanced_generator.py
"""
Advanced Timetable Generator with Hard and Soft Constraints
Implements the detailed scheduling rules for CSE AI & ML program
"""
from __future__ import annotations
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from bson import ObjectId
import datetime
import random
from copy import deepcopy

from app.db.mongodb import db

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"]

def t2min(t: str) -> int:
    """Convert time string to minutes since midnight"""
    h, m = t.split(":")
    return int(h) * 60 + int(m)

def min2t(m: int) -> str:
    """Convert minutes since midnight to time string"""
    return f"{m//60:02d}:{m%60:02d}"

@dataclass
class TimeSlot:
    day: str
    start_min: int  # minutes since midnight
    end_min: int    # minutes since midnight
    
    @property
    def start_time(self) -> str:
        return min2t(self.start_min)
    
    @property
    def end_time(self) -> str:
        return min2t(self.end_min)
    
    @property
    def duration(self) -> int:
        return self.end_min - self.start_min
    
    def overlaps(self, other: 'TimeSlot') -> bool:
        if self.day != other.day:
            return False
        return not (self.end_min <= other.start_min or other.end_min <= self.start_min)
    
    def __str__(self) -> str:
        return f"{self.day} {self.start_time}-{self.end_time}"

@dataclass
class CourseRequirement:
    """Defines a course and its scheduling requirements"""
    code: str
    name: str
    hours_per_week: int
    is_lab: bool
    prefer_double_periods: bool
    elective_type: Optional[str] = None  # "elective", "minor", or None
    lab_duration: int = 180  # minutes for lab sessions
    theory_duration: int = 50  # minutes for theory sessions
    
    def get_session_structure(self) -> List[int]:
        """Returns list of session durations needed per week"""
        if self.is_lab:
            return [self.lab_duration]  # One 3-hour lab session
        
        total_minutes = self.hours_per_week * 60
        sessions = []
        
        if self.prefer_double_periods:
            # Prefer 2-period blocks (100 minutes)
            while total_minutes >= 100:
                sessions.append(100)
                total_minutes -= 100
        
        # Add remaining time as single periods
        while total_minutes >= 50:
            sessions.append(50)
            total_minutes -= 50
            
        return sessions

@dataclass
class StudentGroup:
    id: str
    name: str
    size: int
    is_subgroup: bool = False
    parent_group_id: Optional[str] = None

@dataclass
class Room:
    id: str
    name: str
    capacity: int
    is_lab: bool
    
    def can_accommodate(self, group_size: int, is_lab_session: bool) -> bool:
        return (self.capacity >= group_size and 
                self.is_lab == is_lab_session)

@dataclass
class Faculty:
    id: str
    name: str
    subjects: List[str]

@dataclass
class ScheduleEntry:
    """Represents a scheduled class session"""
    course_code: str
    course_name: str
    group_id: str
    faculty_id: str
    room_id: str
    time_slot: TimeSlot
    is_lab: bool
    session_duration: int

class SchedulingRules:
    """Defines all hard and soft constraints"""
    
    # Hard constraints
    WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    DAY_START = t2min("08:00")
    DAY_END = t2min("18:00")
    LUNCH_START = t2min("12:30")
    LUNCH_END = t2min("13:20")
    PERIOD_DURATION = 50  # minutes
    PASSING_TIME = 10     # minutes between periods
    MAX_CONTINUOUS_PERIODS = 3
    MAX_PERIODS_PER_DAY = 6  # preferred, can go to 8 if needed
    ABSOLUTE_MAX_PERIODS_PER_DAY = 9  # Increased to allow more flexibility
    MAX_LABS_PER_DAY_PER_GROUP = 1
    
    # Lab windows (start_min, end_min)
    LAB_WINDOWS = [
        (t2min("08:00"), t2min("11:10")),  # Morning: 190 minutes
        (t2min("13:20"), t2min("16:30")),  # Early afternoon: 190 minutes  
        (t2min("14:20"), t2min("17:30")),  # Late afternoon: 190 minutes
    ]
    
    @classmethod
    def get_theory_slots(cls) -> List[TimeSlot]:
        """Generate all possible 50-minute theory slots"""
        slots = []
        for day in cls.WORKING_DAYS:
            current_time = cls.DAY_START
            
            while current_time + cls.PERIOD_DURATION <= cls.DAY_END:
                slot_end = current_time + cls.PERIOD_DURATION
                
                # Skip lunch period
                if not (current_time < cls.LUNCH_END and slot_end > cls.LUNCH_START):
                    slots.append(TimeSlot(day, current_time, slot_end))
                
                current_time += cls.PERIOD_DURATION + cls.PASSING_TIME
                
                # Jump over lunch if we hit it
                if current_time < cls.LUNCH_END and current_time + cls.PERIOD_DURATION > cls.LUNCH_START:
                    current_time = cls.LUNCH_END
        
        return slots
    
    @classmethod
    def get_double_period_slots(cls) -> List[TimeSlot]:
        """Generate all possible 100-minute double period slots"""
        slots = []
        theory_slots = cls.get_theory_slots()
        
        for i in range(len(theory_slots) - 1):
            slot1 = theory_slots[i]
            slot2 = theory_slots[i + 1]
            
            # Check if slots are consecutive on the same day
            if (slot1.day == slot2.day and 
                slot1.end_min + cls.PASSING_TIME == slot2.start_min):
                
                double_slot = TimeSlot(
                    slot1.day,
                    slot1.start_min,
                    slot2.end_min
                )
                slots.append(double_slot)
        
        return slots
    
    @classmethod
    def get_lab_slots(cls) -> List[TimeSlot]:
        """Generate all possible 180-minute lab slots"""
        slots = []
        for day in cls.WORKING_DAYS:
            for start_min, end_min in cls.LAB_WINDOWS:
                if end_min - start_min >= 180:  # Ensure window can fit 3-hour lab
                    slots.append(TimeSlot(day, start_min, start_min + 180))
        return slots

class AdvancedTimetableGenerator:
    """Advanced constraint-based timetable generator"""
    
    def __init__(self):
        self.rules = SchedulingRules()
        self.courses: List[CourseRequirement] = []
        self.groups: List[StudentGroup] = []
        self.rooms: List[Room] = []
        self.faculty: List[Faculty] = []
        self.schedule: List[ScheduleEntry] = []
        
        # Occupancy tracking
        self.room_occupancy: Dict[str, List[TimeSlot]] = {}
        self.faculty_occupancy: Dict[str, List[TimeSlot]] = {}
        self.group_occupancy: Dict[str, List[TimeSlot]] = {}
    
    def setup_cse_ai_ml_courses(self):
        """Setup the specific CSE AI & ML course requirements"""
        self.courses = [
            CourseRequirement("PROB_STATS", "Probability & Statistics", 4, False, False),
            CourseRequirement("OS_THEORY", "Operating System (Theory)", 8, False, True),
            CourseRequirement("OOP_THEORY", "Object Oriented Programming (Theory)", 8, False, True),
            CourseRequirement("ML_THEORY", "Machine Learning (Theory)", 6, False, True),
            CourseRequirement("IND_MGMT", "Industrial Management", 2, False, False),
            CourseRequirement("CLOUD_COMP", "Cloud Computing", 3, False, False, "elective"),
            CourseRequirement("OPT_TECH", "Optimization Techniques", 4, False, False, "minor"),
            CourseRequirement("OS_LAB", "OS Lab", 3, True, False),
            CourseRequirement("OOP_LAB", "OOP & Java Lab", 3, True, False),
        ]
    
    def setup_groups_and_resources(self):
        """Setup student groups, rooms, and faculty"""
        # Main lecture group
        self.groups = [
            StudentGroup("MAIN", "CSE AI & ML - Main", 60, False),
            StudentGroup("SUB1", "Lab Subgroup 1", 30, True, "MAIN"),
            StudentGroup("SUB2", "Lab Subgroup 2", 29, True, "MAIN"),
        ]
        
        # Rooms
        self.rooms = [
            Room("N001", "N-001", 75, False),  # Theory classroom
            Room("N017", "N-017", 35, True),   # Computer lab
            Room("N018", "N-018", 35, True),   # Computer lab
        ]
        
        # Faculty (simplified for demo)
        self.faculty = [
            Faculty("F001", "Dr. Smith", ["PROB_STATS", "ML_THEORY"]),
            Faculty("F002", "Dr. Johnson", ["OS_THEORY", "OS_LAB"]),
            Faculty("F003", "Dr. Brown", ["OOP_THEORY", "OOP_LAB"]),
            Faculty("F004", "Dr. Davis", ["IND_MGMT", "CLOUD_COMP"]),
            Faculty("F005", "Dr. Wilson", ["OPT_TECH"]),
        ]
    
    def initialize_occupancy_tracking(self):
        """Initialize occupancy tracking dictionaries"""
        self.room_occupancy = {room.id: [] for room in self.rooms}
        self.faculty_occupancy = {faculty.id: [] for faculty in self.faculty}
        self.group_occupancy = {group.id: [] for group in self.groups}
    
    def is_slot_available(self, time_slot: TimeSlot, room_id: str, 
                         faculty_id: str, group_id: str) -> bool:
        """Check if a time slot is available for all resources"""
        # Check room availability
        for occupied_slot in self.room_occupancy[room_id]:
            if time_slot.overlaps(occupied_slot):
                return False
        
        # Check faculty availability
        for occupied_slot in self.faculty_occupancy[faculty_id]:
            if time_slot.overlaps(occupied_slot):
                return False
        
        # Check group availability
        for occupied_slot in self.group_occupancy[group_id]:
            if time_slot.overlaps(occupied_slot):
                return False
        
        return True
    
    def book_slot(self, time_slot: TimeSlot, room_id: str, 
                  faculty_id: str, group_id: str):
        """Book a time slot for the specified resources"""
        self.room_occupancy[room_id].append(time_slot)
        self.faculty_occupancy[faculty_id].append(time_slot)
        self.group_occupancy[group_id].append(time_slot)
    
    def find_suitable_faculty(self, course_code: str) -> Optional[str]:
        """Find a faculty member who can teach the course"""
        for faculty in self.faculty:
            if course_code in faculty.subjects:
                return faculty.id
        return None
    
    def find_suitable_room(self, group_size: int, is_lab: bool) -> Optional[str]:
        """Find a suitable room for the session"""
        suitable_rooms = [room for room in self.rooms 
                         if room.can_accommodate(group_size, is_lab)]
        
        if not suitable_rooms:
            return None
        
        # Prefer rooms with less current occupancy
        return min(suitable_rooms, 
                  key=lambda r: len(self.room_occupancy[r.id])).id
    
    def check_daily_constraints(self, group_id: str, day: str, 
                              new_slot: TimeSlot) -> bool:
        """Check if adding this slot violates daily constraints"""
        day_slots = [slot for slot in self.group_occupancy[group_id] 
                    if slot.day == day]
        
        # Calculate periods more accurately
        existing_periods = 0
        for slot in day_slots:
            if slot.duration >= 180:  # Lab session = 3+ periods
                existing_periods += 3
            elif slot.duration >= 100:  # Double period
                existing_periods += 2
            else:  # Single period
                existing_periods += 1
        
        new_periods = 0
        if new_slot.duration >= 180:
            new_periods = 3
        elif new_slot.duration >= 100:
            new_periods = 2
        else:
            new_periods = 1
        
        total_periods = existing_periods + new_periods
        
        # Allow up to 8 periods per day if needed
        if total_periods > self.rules.ABSOLUTE_MAX_PERIODS_PER_DAY:
            return False
        
        # Check max labs per day
        if new_slot.duration >= 180:  # This is a lab
            lab_count = sum(1 for slot in day_slots if slot.duration >= 180)
            if lab_count >= self.rules.MAX_LABS_PER_DAY_PER_GROUP:
                return False
        
        return True
    
    def check_continuous_periods_constraint(self, group_id: str, 
                                          new_slot: TimeSlot) -> bool:
        """Check if adding this slot violates continuous periods constraint"""
        day_slots = [slot for slot in self.group_occupancy[group_id] 
                    if slot.day == new_slot.day]
        day_slots.append(new_slot)
        day_slots.sort(key=lambda s: s.start_min)
        
        continuous_count = 1
        for i in range(1, len(day_slots)):
            prev_slot = day_slots[i-1]
            curr_slot = day_slots[i]
            
            # Check if slots are continuous (considering passing time)
            if prev_slot.end_min + self.rules.PASSING_TIME >= curr_slot.start_min:
                continuous_count += 1
                if continuous_count > self.rules.MAX_CONTINUOUS_PERIODS:
                    return False
            else:
                continuous_count = 1
        
        return True
    
    def schedule_labs_first(self) -> bool:
        """Schedule all lab sessions first (they have stricter constraints)"""
        lab_courses = [course for course in self.courses if course.is_lab]
        lab_slots = self.rules.get_lab_slots()
        
        # Sort lab slots to prefer afternoon slots (soft constraint)
        lab_slots.sort(key=lambda slot: (
            0 if slot.start_min >= t2min("13:20") else 1,  # Prefer afternoon
            slot.start_min  # Then by start time
        ))
        
        for course in lab_courses:
            # Each lab course needs to be scheduled for both subgroups
            subgroups = [group for group in self.groups if group.is_subgroup]
            
            for subgroup in subgroups:
                scheduled = False
                
                for slot in lab_slots:
                    # Check daily constraints
                    if not self.check_daily_constraints(subgroup.id, slot.day, slot):
                        continue
                    
                    # Find suitable faculty and room
                    faculty_id = self.find_suitable_faculty(course.code)
                    room_id = self.find_suitable_room(subgroup.size, True)
                    
                    if not faculty_id or not room_id:
                        continue
                    
                    # Check availability
                    if self.is_slot_available(slot, room_id, faculty_id, subgroup.id):
                        # Book the slot
                        self.book_slot(slot, room_id, faculty_id, subgroup.id)
                        
                        # Add to schedule
                        entry = ScheduleEntry(
                            course_code=course.code,
                            course_name=course.name,
                            group_id=subgroup.id,
                            faculty_id=faculty_id,
                            room_id=room_id,
                            time_slot=slot,
                            is_lab=True,
                            session_duration=180
                        )
                        self.schedule.append(entry)
                        scheduled = True
                        break
                
                if not scheduled:
                    print(f"Failed to schedule {course.code} for {subgroup.name}")
                    return False
        
        return True
    
    def schedule_theory_sessions(self) -> bool:
        """Schedule all theory sessions"""
        theory_courses = [course for course in self.courses if not course.is_lab]
        
        # Get available slots
        single_slots = self.rules.get_theory_slots()
        double_slots = self.rules.get_double_period_slots()
        
        # Sort theory courses by priority (heavy courses first)
        theory_courses.sort(key=lambda c: c.hours_per_week, reverse=True)
        
        for course in theory_courses:
            sessions_needed = course.get_session_structure()
            main_group = next(group for group in self.groups if not group.is_subgroup)
            
            print(f"📚 Scheduling {course.code}: {len(sessions_needed)} sessions {sessions_needed}")
            
            for i, session_duration in enumerate(sessions_needed):
                scheduled = False
                
                # Choose appropriate slot type
                available_slots = double_slots if session_duration == 100 else single_slots
                
                # Apply soft constraints for slot preference
                available_slots = self.apply_soft_constraints_to_slots(
                    available_slots, course, main_group.id
                )
                
                print(f"  Session {i+1} ({session_duration}min): Checking {len(available_slots)} slots")
                
                for slot_idx, slot in enumerate(available_slots):
                    # Check constraints
                    daily_ok = self.check_daily_constraints(main_group.id, slot.day, slot)
                    if not daily_ok:
                        continue
                    
                    # Relax continuous periods constraint for now
                    # continuous_ok = self.check_continuous_periods_constraint(main_group.id, slot)
                    # if not continuous_ok:
                    #     continue
                    
                    # Check for course repetition on same day (but allow for double periods and small courses)
                    if (session_duration < 100 and 
                        course.hours_per_week > 2 and  # Allow repetition for small courses (≤2h/week)
                        self.has_course_on_day(course.code, main_group.id, slot.day)):
                        continue
                    
                    # Find resources
                    faculty_id = self.find_suitable_faculty(course.code)
                    room_id = self.find_suitable_room(main_group.size, False)
                    
                    if not faculty_id or not room_id:
                        print(f"    Slot {slot}: No faculty ({faculty_id}) or room ({room_id})")
                        continue
                    
                    # Check availability
                    if self.is_slot_available(slot, room_id, faculty_id, main_group.id):
                        # Book the slot
                        self.book_slot(slot, room_id, faculty_id, main_group.id)
                        
                        # Add to schedule
                        entry = ScheduleEntry(
                            course_code=course.code,
                            course_name=course.name,
                            group_id=main_group.id,
                            faculty_id=faculty_id,
                            room_id=room_id,
                            time_slot=slot,
                            is_lab=False,
                            session_duration=session_duration
                        )
                        self.schedule.append(entry)
                        print(f"    ✅ Scheduled at {slot} with {faculty_id} in {room_id}")
                        scheduled = True
                        break
                    else:
                        print(f"    Slot {slot}: Resource conflict")
                
                if not scheduled:
                    print(f"❌ Failed to schedule {session_duration}min session for {course.code}")
                    # Let's try to be more lenient and continue with other sessions
                    # return False
        
        return True
    
    def apply_soft_constraints_to_slots(self, slots: List[TimeSlot], 
                                      course: CourseRequirement, 
                                      group_id: str) -> List[TimeSlot]:
        """Apply soft constraints to prioritize slots"""
        def slot_score(slot: TimeSlot) -> int:
            score = 0
            
            # Avoid early slots for electives/minor
            if course.elective_type and slot.start_min == t2min("08:00"):
                score -= 10
            
            # Prefer mid-day for Industrial Management
            if course.code == "IND_MGMT":
                if t2min("10:00") <= slot.start_min <= t2min("15:00"):
                    score += 5
            
            # Spread heavy theory courses across days
            if course.prefer_double_periods:
                occupied_days = {s.day for s in self.group_occupancy[group_id] 
                               if any(entry.course_code == course.code and 
                                     entry.time_slot.day == s.day 
                                     for entry in self.schedule)}
                if slot.day not in occupied_days:
                    score += 3
            
            return score
        
        # Sort slots by score (higher score first)
        return sorted(slots, key=slot_score, reverse=True)
    
    def has_course_on_day(self, course_code: str, group_id: str, day: str) -> bool:
        """Check if a course is already scheduled on a specific day for a group"""
        return any(entry.course_code == course_code and 
                  entry.group_id == group_id and 
                  entry.time_slot.day == day 
                  for entry in self.schedule)
    
    def calculate_schedule_score(self) -> int:
        """Calculate overall schedule score based on soft constraints"""
        score = 0
        
        # Score based on various soft constraints
        for entry in self.schedule:
            # Prefer afternoon labs
            if entry.is_lab and entry.time_slot.start_min >= t2min("13:20"):
                score += 5
            
            # Penalize early electives/minor courses
            if (entry.course_code in ["CLOUD_COMP", "OPT_TECH"] and 
                entry.time_slot.start_min == t2min("08:00")):
                score -= 3
            
            # Reward mid-day Industrial Management
            if (entry.course_code == "IND_MGMT" and 
                t2min("10:00") <= entry.time_slot.start_min <= t2min("15:00")):
                score += 3
        
        return score
    
    def generate_timetable(self) -> Dict[str, Any]:
        """Main method to generate the timetable"""
        # Setup course requirements and resources
        self.setup_cse_ai_ml_courses()
        self.setup_groups_and_resources()
        self.initialize_occupancy_tracking()
        
        # Clear any existing schedule
        self.schedule = []
        
        print("Starting timetable generation...")
        
        # Step 1: Schedule labs first (they have stricter constraints)
        if not self.schedule_labs_first():
            return {"success": False, "error": "Failed to schedule lab sessions"}
        
        print(f"Successfully scheduled {len([e for e in self.schedule if e.is_lab])} lab sessions")
        
        # Step 2: Schedule theory sessions
        if not self.schedule_theory_sessions():
            return {"success": False, "error": "Failed to schedule theory sessions"}
        
        print(f"Successfully scheduled {len([e for e in self.schedule if not e.is_lab])} theory sessions")
        
        # Step 3: Validate the schedule
        validation_result = self.validate_schedule()
        
        # Continue even if there are warnings, but fail only on critical errors
        critical_errors = [error for error in validation_result["errors"] 
                          if "No sessions scheduled" in error or "Overlap detected" in error]
        
        if critical_errors:
            return {"success": False, "error": f"Critical validation errors: {critical_errors}"}
        
        # Step 4: Calculate score
        score = self.calculate_schedule_score()
        
        # Step 5: Format output
        formatted_schedule = self.format_schedule_output()
        
        return {
            "success": True,
            "schedule": formatted_schedule,
            "score": score,
            "validation": validation_result,
            "statistics": self.get_schedule_statistics()
        }
    
    def validate_schedule(self) -> Dict[str, Any]:
        """Validate the generated schedule against all constraints"""
        errors = []
        warnings = []
        
        # Check weekly hour requirements
        course_hours = {}
        for entry in self.schedule:
            # Lab sessions are 180 minutes but represent 3 hours of weekly requirement
            if entry.is_lab:
                course_hours[entry.course_code] = course_hours.get(entry.course_code, 0) + 3.0
            else:
                course_hours[entry.course_code] = course_hours.get(entry.course_code, 0) + (entry.session_duration / 60)
        
        for course in self.courses:
            scheduled_hours = course_hours.get(course.code, 0)
            if abs(scheduled_hours - course.hours_per_week) > 0.1:  # Allow small floating point errors
                if scheduled_hours == 0:
                    errors.append(f"{course.code}: No sessions scheduled (expected {course.hours_per_week}h/week)")
                else:
                    warnings.append(f"{course.code}: Expected {course.hours_per_week}h/week, got {scheduled_hours}h/week")
        
        # Check for overlaps
        for i, entry1 in enumerate(self.schedule):
            for entry2 in self.schedule[i+1:]:
                if (entry1.time_slot.overlaps(entry2.time_slot) and 
                    (entry1.room_id == entry2.room_id or 
                     entry1.faculty_id == entry2.faculty_id or 
                     entry1.group_id == entry2.group_id)):
                    errors.append(f"Overlap detected: {entry1.course_code} and {entry2.course_code} on {entry1.time_slot}")
        
        # Check room capacities
        for entry in self.schedule:
            room = next(room for room in self.rooms if room.id == entry.room_id)
            group = next(group for group in self.groups if group.id == entry.group_id)
            if room.capacity < group.size:
                errors.append(f"Room {room.name} (cap {room.capacity}) too small for {group.name} ({group.size} students)")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def format_schedule_output(self) -> List[Dict[str, Any]]:
        """Format the schedule for output"""
        formatted = []
        
        for entry in self.schedule:
            room = next(room for room in self.rooms if room.id == entry.room_id)
            group = next(group for group in self.groups if group.id == entry.group_id)
            faculty = next(faculty for faculty in self.faculty if faculty.id == entry.faculty_id)
            
            formatted.append({
                "day": entry.time_slot.day,
                "start_time": entry.time_slot.start_time,
                "end_time": entry.time_slot.end_time,
                "course_code": entry.course_code,
                "course_name": entry.course_name,
                "group": group.name,
                "room": room.name,
                "faculty": faculty.name,
                "is_lab": entry.is_lab,
                "duration_minutes": entry.session_duration
            })
        
        # Sort by day and time
        day_order = {"Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5}
        formatted.sort(key=lambda x: (day_order[x["day"]], x["start_time"]))
        
        return formatted
    
    def get_schedule_statistics(self) -> Dict[str, Any]:
        """Get statistics about the generated schedule"""
        stats = {
            "total_sessions": len(self.schedule),
            "lab_sessions": len([e for e in self.schedule if e.is_lab]),
            "theory_sessions": len([e for e in self.schedule if not e.is_lab]),
            "total_hours": sum(entry.session_duration for entry in self.schedule) / 60,
        }
        
        # Sessions per day
        sessions_per_day = {}
        for entry in self.schedule:
            day = entry.time_slot.day
            sessions_per_day[day] = sessions_per_day.get(day, 0) + 1
        
        stats["sessions_per_day"] = sessions_per_day
        
        return stats
