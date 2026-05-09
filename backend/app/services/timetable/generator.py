# backend/app/services/timetable/generator.py
from __future__ import annotations
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from bson import ObjectId
import datetime

from app.db.mongodb import db

DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri"]

def t2min(t: str) -> int:
    h, m = t.split(":")
    return int(h)*60 + int(m)

def min2t(m: int) -> str:
    return f"{m//60:02d}:{m%60:02d}"

@dataclass
class CourseSpec:
    _id: ObjectId
    code: str
    name: str
    type: str
    hours_per_week: int
    min_per_session: int
    is_lab: bool
    prefer_double: bool

    @classmethod
    def from_doc(cls, d: Dict[str, Any]) -> "CourseSpec":
        t = d.get("type","")
        is_lab = bool(d.get("is_lab")) or t.lower() in {"practical","lab"} or d.get("min_per_session",50) >= 180
        prefer_double = not is_lab and d.get("hours_per_week",0) >= 6 and d.get("min_per_session",50) == 50
        return cls(
            _id=d["_id"],
            code=d.get("code",""),
            name=d.get("name",""),
            type=t,
            hours_per_week=int(d.get("hours_per_week",0)),
            min_per_session=int(d.get("min_per_session",50)),
            is_lab=is_lab,
            prefer_double=prefer_double,
        )

@dataclass
class GroupSpec:
    _id: ObjectId
    name: str
    type: str
    size: int
    course_ids: List[ObjectId]

    @classmethod
    def from_doc(cls, d: Dict[str, Any]) -> "GroupSpec":
        return cls(
            _id=d["_id"],
            name=d.get("name",""),
            type=d.get("group_type","Regular Class"),
            size=int(d.get("student_strength",0)),
            course_ids=[ObjectId(c) if isinstance(c,str) else c for c in d.get("course_ids",[])],
        )

@dataclass
class RoomSpec:
    _id: ObjectId
    name: str
    type: str
    cap: int
    is_lab: bool
    has_projector: bool

    @classmethod
    def from_doc(cls, d: Dict[str, Any]) -> "RoomSpec":
        rt = d.get("room_type","").lower()
        is_lab = bool(d.get("is_lab")) or "lab" in rt
        return cls(
            _id=d["_id"],
            name=d.get("name",""),
            type=d.get("room_type",""),
            cap=int(d.get("capacity",0)),
            is_lab=is_lab,
            has_projector=bool(d.get("has_projector", False) or ('Projector' in d.get('facilities', []))),
        )

@dataclass
class Slot:
    day: str
    start: int
    end: int
    def overlaps(self, other: "Slot") -> bool:
        return self.day==other.day and not (self.end <= other.start or other.end <= self.start)

@dataclass
class Rules:
    days: List[str] = field(default_factory=lambda: DAY_NAMES)
    start_time: int = t2min("08:00")
    end_time: int = t2min("18:00")
    lunch_start: int = t2min("12:30")
    lunch_end: int = t2min("13:20")
    period: int = 50
    pass_gap: int = 10
    max_periods_per_day: int = 8   # needs ≥7/day to fit S5 theory load
    max_contiguous_periods: int = 3
    max_labs_per_day: int = 1
    lab_windows: List[Tuple[str,str]] = field(default_factory=lambda: [("08:00","11:10"), ("13:20","16:30"), ("14:20","17:30")])

    @classmethod
    def from_constraints(cls, cons: List[Dict[str,Any]]) -> "Rules":
        rules = cls()
        for c in cons or []:
            p = c.get("parameters",{})
            if c.get("type") == "time_settings":
                rules.start_time = t2min(p.get("college_start_time","08:00"))
                rules.end_time = t2min(p.get("college_end_time","18:00"))
                rules.lunch_start = t2min(p.get("lunch_time","12:30"))
                rules.lunch_end = rules.lunch_start + 50
                rules.period = int(p.get("period_minutes",50))
                rules.pass_gap = int(p.get("passing_gap",10))
                rules.max_periods_per_day = int(p.get("max_classes_per_day",8))
                rules.max_contiguous_periods = int(p.get("max_continuous_periods",3))
        return rules

    def teaching_slots(self) -> Dict[str, List[Slot]]:
        """Atomic 50-min slots excl. lunch; separated by passing gap."""
        day_slots: Dict[str, List[Slot]] = {}
        for day in self.days:
            slots: List[Slot] = []
            t = self.start_time
            while t + self.period <= self.end_time:
                if (t < self.lunch_end and (t + self.period) > self.lunch_start):
                    t = self.lunch_end
                    continue
                slots.append(Slot(day=day, start=t, end=t+self.period))
                t += self.period + self.pass_gap
            day_slots[day] = slots
        return day_slots

    def lab_windows_slots(self) -> Dict[str, List[Slot]]:
        out: Dict[str, List[Slot]] = {d: [] for d in self.days}
        for day in self.days:
            for s,e in self.lab_windows:
                st=t2min(s); en=t2min(e)
                st=max(st,self.start_time); en=min(en,self.end_time)
                if not (st < self.lunch_end and en > self.lunch_start):
                    out[day].append(Slot(day, st, en))
        return out

def contiguous_ok(day_slots: List[Slot], rules: Rules) -> bool:
    if not day_slots: 
        return True
    seq=sorted(day_slots, key=lambda s:s.start)
    cont=1
    for i in range(1,len(seq)):
        if seq[i-1].end + rules.pass_gap >= seq[i].start:
            cont+=1
            if cont>rules.max_contiguous_periods:
                return False
        else:
            cont=1
    return True

class TimetableGenerator:
    """Constraint-based generator implementing hard/soft rules."""

    def __init__(self):
        pass

    async def _load(self, program_id: str, semester: int):
        program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
        if not program:
            raise ValueError("Program not found")

        courses_raw = await db.db.courses.find({
            "program_id": ObjectId(program_id),
            "semester": semester,
            "is_active": True
        }).to_list(length=None)

        groups_raw = await db.db.student_groups.find({
            "program_id": str(program_id)
        }).to_list(length=None)
        if not groups_raw:
            groups_raw = await db.db.student_groups.find({
                "program_id": ObjectId(program_id)
            }).to_list(length=None)

        rooms_raw = await db.db.rooms.find({"is_active": True}).to_list(length=None)
        constraints_raw = await db.db.constraints.find({
            "$or":[
                {"program_id": None},{"program_id": str(program_id)},
                {"program_id": ObjectId(program_id)}
            ],
            "is_active": True
        }).to_list(length=None)

        faculty_raw = await db.db.faculty.find({}).to_list(length=None)

        courses = [CourseSpec.from_doc(c) for c in courses_raw]
        rooms = [RoomSpec.from_doc(r) for r in rooms_raw]
        groups = [GroupSpec.from_doc(g) for g in groups_raw]
        rules = Rules.from_constraints(constraints_raw)

        course_map = {c._id: c for c in courses}
        room_class = [r for r in rooms if not r.is_lab]
        room_labs = [r for r in rooms if r.is_lab]
        lecture_groups = [g for g in groups if "regular" in g.type.lower()]
        lab_groups = [g for g in groups if "lab" in g.type.lower()]

        # map course → possible faculty (best-effort; fallback to first)
        faculty_index: Dict[ObjectId, List[ObjectId]] = {}
        for c in courses:
            cand=[]
            for f in faculty_raw:
                subjects = [s.lower() for s in f.get("subjects",[])]
                if c.code.lower() in subjects or c.name.lower() in subjects:
                    cand.append(f["_id"])
            if not cand and faculty_raw:
                cand=[faculty_raw[0]["_id"]]
            faculty_index[c._id]=cand

        return {
            "program": program,
            "courses": courses,
            "rooms_class": room_class,
            "rooms_lab": room_labs,
            "groups_lecture": lecture_groups,
            "groups_lab": lab_groups,
            "rules": rules,
            "faculty_raw": faculty_raw,
            "faculty_index": faculty_index,
            "course_map": course_map
        }

    async def generate_timetable(self, program_id: str, semester: int, academic_year: str, created_by: str) -> Dict[str, Any]:
        data = await self._load(program_id, semester)
        rules: Rules = data["rules"]

        # occupancy calendars
        occ_room: Dict[ObjectId, Dict[str, List[Slot]]] = {r._id:{d:[] for d in rules.days} for r in (data["rooms_class"]+data["rooms_lab"])}
        occ_group: Dict[ObjectId, Dict[str, List[Slot]]] = {g._id:{d:[] for d in rules.days} for g in (data["groups_lecture"]+data["groups_lab"])}
        occ_fac: Dict[ObjectId, Dict[str, List[Slot]]] = {f["_id"]:{d:[] for d in rules.days} for f in data["faculty_raw"]}

        entries: List[Dict[str,Any]] = []
        seen_course_day=set()

        def fits(slot: Slot, room_id: ObjectId, group_id: ObjectId, fac_id: ObjectId) -> bool:
            for s in occ_room[room_id][slot.day]:
                if s.overlaps(slot): return False
            for s in occ_group[group_id][slot.day]:
                if s.overlaps(slot): return False
            for s in occ_fac[fac_id][slot.day]:
                if s.overlaps(slot): return False
            return True

        def commit(slot: Slot, room_id: ObjectId, group_id: ObjectId, fac_id: ObjectId, course_id: ObjectId):
            occ_room[room_id][slot.day].append(slot)
            occ_group[group_id][slot.day].append(slot)
            occ_fac[fac_id][slot.day].append(slot)
            entries.append({
                "course_id": course_id,
                "faculty_id": fac_id,
                "room_id": room_id,
                "time_slot": {
                    "day": slot.day,
                    "start_time": min2t(slot.start),
                    "end_time": min2t(slot.end),
                    "duration_minutes": slot.end-slot.start
                },
                "group_id": str(group_id)  # stored for UI filtering
            })

        # ---------- 1) Place Labs first ----------
        lab_windows = rules.lab_windows_slots()
        lab_courses = [c for c in data["courses"] if c.is_lab]
        lab_courses.sort(key=lambda c: c.code)

        for c in lab_courses:
            target_groups = [g for g in data["groups_lab"] if c._id in g.course_ids]
            for g in target_groups:
                placed=False
                possible_fac = data["faculty_index"].get(c._id) or ([data["faculty_raw"][0]["_id"]] if data["faculty_raw"] else [])
                for day in rules.days:
                    # max 1 lab/day per subgroup
                    if any((s.end - s.start) >= 150 for s in occ_group[g._id][day]): 
                        continue
                    windows = sorted(lab_windows[day], key=lambda s: (s.start< t2min("12:00"), s.start))  # prefer afternoon
                    for w in windows:
                        for room in data["rooms_lab"]:
                            if room.cap < g.size: 
                                continue
                            for fac in possible_fac:
                                if fits(w, room._id, g._id, fac):
                                    commit(w, room._id, g._id, fac, c._id)
                                    placed=True
                                    break
                            if placed: break
                        if placed: break
                    if placed: break
                if not placed:
                    raise Exception(f"Unable to place lab {c.code} for group {g.name}")

        # ---------- 2) Place Theory ----------
        day_slots = rules.teaching_slots()
        theory_courses = [c for c in data["courses"] if not c.is_lab]
        lecture_groups = data["groups_lecture"] or []

        def expand_sessions(c: CourseSpec) -> List[int]:
            mins = c.hours_per_week*50
            sessions=[]
            if c.prefer_double:
                while mins >= 100:
                    sessions.append(100); mins -= 100
            while mins>0:
                take = min(50, mins)
                sessions.append(take); mins -= take
            return sessions

        theory_courses.sort(key=lambda c: (-c.hours_per_week, c.code))
        day_iter = {g._id: 0 for g in lecture_groups}

        for c in theory_courses:
            sessions = expand_sessions(c)
            possible_fac = data["faculty_index"].get(c._id) or ([data["faculty_raw"][0]["_id"]] if data["faculty_raw"] else [])
            for g in lecture_groups:
                if g.course_ids and c._id not in g.course_ids:
                    continue
                for dur in sessions:
                    placed=False
                    for di in range(len(rules.days)):
                        day = rules.days[(day_iter[g._id]+di) % len(rules.days)]
                        if len(occ_group[g._id][day]) >= rules.max_periods_per_day:
                            continue
                        slots = day_slots[day]
                        for idx, s in enumerate(slots):
                            if dur==100:
                                if idx+1>=len(slots): 
                                    continue
                                s2 = slots[idx+1]
                                pair = Slot(day, s.start, s2.end)
                                if not contiguous_ok(occ_group[g._id][day] + [s, s2], rules):
                                    continue
                                # avoid >1 repeat/day for same course
                                if (g._id, c._id, day) in seen_course_day:
                                    continue
                                for room in data["rooms_class"]:
                                    if room.cap < g.size or not room.has_projector: 
                                        continue
                                    for fac in possible_fac:
                                        if fits(s, room._id, g._id, fac) and fits(s2, room._id, g._id, fac):
                                            commit(s, room._id, g._id, fac, c._id)
                                            commit(s2, room._id, g._id, fac, c._id)
                                            seen_course_day.add((g._id, c._id, day))
                                            placed=True
                                            break
                                    if placed: break
                                if placed: break
                            else:
                                if not contiguous_ok(occ_group[g._id][day] + [s], rules):
                                    continue
                                if (g._id, c._id, day) in seen_course_day:
                                    continue
                                for room in data["rooms_class"]:
                                    if room.cap < g.size or not room.has_projector:
                                        continue
                                    for fac in possible_fac:
                                        if fits(s, room._id, g._id, fac):
                                            commit(s, room._id, g._id, fac, c._id)
                                            seen_course_day.add((g._id, c._id, day))
                                            placed=True
                                            break
                                    if placed: break
                                if placed: break
                        if placed:
                            day_iter[g._id] = (rules.days.index(day)+1) % len(rules.days)
                            break
                    if not placed:
                        raise Exception(f"Unable to place session for course {c.code} for group {g.name}")

        timetable_doc = {
            "title": f"AI Timetable S{semester}",
            "program_id": ObjectId(program_id),
            "semester": semester,
            "academic_year": academic_year,
            "entries": entries,
            "is_draft": True,
            "created_by": ObjectId(created_by),
            "created_at": datetime.datetime.utcnow(),
            "generated_at": datetime.datetime.utcnow(),
            "validation_status": "pending",
            "metadata": {
                "generation_method": "rules_v1",
                "days": rules.days,
                "period_minutes": rules.period,
                "max_periods_per_day": rules.max_periods_per_day
            }
        }

        result = await db.db.timetables.insert_one(timetable_doc)
        timetable = await db.db.timetables.find_one({"_id": result.inserted_id})
        return timetable
