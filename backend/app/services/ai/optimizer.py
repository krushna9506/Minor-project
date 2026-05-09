# backend/app/services/ai/optimizer.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple
from collections import defaultdict

def compute_optimization_score(timetable: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
    """
    Lightweight scorer implementing a few soft constraints:
    - balanced daily load
    - afternoon labs
    - consecutive double blocks rewarded
    Returns (score, breakdown).
    """
    if not timetable or "entries" not in timetable:
        return 0.0, {"reason": "no entries"}

    entries = timetable["entries"]
    per_group_day = defaultdict(lambda: defaultdict(list))
    for e in entries:
        g = str(e.get("group_id","_main"))
        d = e["time_slot"]["day"]
        per_group_day[g][d].append(e)

    score = 0.0
    breakdown = {"balanced_day_load":0,"prefer_double_blocks":0,"labs_afternoon":0}

    days = ["Mon","Tue","Wed","Thu","Fri"]

    # Balanced day load (variance penalty)
    for g, day_map in per_group_day.items():
        counts = [len(day_map.get(d, [])) for d in days if d in day_map]
        if not counts: 
            continue
        avg = sum(counts)/len(counts)
        var = sum((c-avg)**2 for c in counts)/len(counts)
        contribution = max(0.0, 10.0 - var)
        score += contribution
        breakdown["balanced_day_load"] += contribution

    # Labs in afternoon
    for e in entries:
        dur = e["time_slot"]["duration_minutes"]
        if dur>=150 and e["time_slot"]["start_time"] >= "13:00":
            score += 5
            breakdown["labs_afternoon"] += 5

    # Reward adjacent doubles
    for g, day_map in per_group_day.items():
        for d, arr in day_map.items():
            arr_sorted = sorted(arr, key=lambda x: x["time_slot"]["start_time"])
            for i in range(1,len(arr_sorted)):
                a=arr_sorted[i-1]; b=arr_sorted[i]
                if a["course_id"]==b["course_id"] and a["time_slot"]["end_time"]==b["time_slot"]["start_time"]:
                    score += 2
                    breakdown["prefer_double_blocks"] += 2

    breakdown["total"]=score
    return score, breakdown
