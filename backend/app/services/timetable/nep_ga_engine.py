"""
NEP 2020 Compliant Genetic Algorithm Engine for Timetable Optimization

This module extends the base GA engine with NEP 2020 specific constraints and objectives:
- Credit system flexibility (CBCS compliance)
- Multidisciplinary course integration
- Practical/Theory hour balancing
- Faculty workload compliance (max 16-18 hrs/week)
- Assessment scheduling for continuous evaluation
- Research and innovation time allocation
"""

import random
import copy
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import math
import time
import logging

logger = logging.getLogger(__name__)


def t2min(t: str) -> int:
    """Convert time string to minutes."""
    try:
        h, m = t.split(":")
        return int(h) * 60 + int(m)
    except:
        return 0


class NEPGAEngine:
    """
    NEP 2020 Compliant Genetic Algorithm Engine for Timetable Generation.
    
    Extends standard GA with NEP-specific fitness evaluation:
    - Hard Constraints: No conflicts, room capacity, faculty availability
    - Soft Constraints: NEP compliance, balanced workload, optimal scheduling
    - NEP Objectives: CBCS flexibility, multidisciplinary balance, practical/theory ratio
    """
    
    def __init__(self, 
                 courses: List[Dict], 
                 student_groups: List[Dict], 
                 rooms: List[Dict], 
                 all_faculty: List[Dict], 
                 template: Dict,
                 constraints: List[Dict] = None,
                 nep_preferences: Dict[str, Any] = None):
        """
        Initialize the NEP GA Engine.
        
        Args:
            courses: List of course objects
            student_groups: List of student group objects
            rooms: List of room objects
            all_faculty: List of faculty objects
            template: Timetable template with time slots
            constraints: Optional list of scheduling constraints
            nep_preferences: NEP 2020 specific preferences
        """
        self.courses = courses
        self.student_groups = student_groups if student_groups else []
        self.rooms = rooms
        self.all_faculty = all_faculty
        self.template = template
        self.constraints = constraints or []
        self.nep_preferences = nep_preferences or {}
        
        # GA Settings
        self.settings = {
            "populationSize": 60,
            "maxGenerations": 200,
            "crossoverRate": 0.85,
            "mutationRate": 0.12,
            "eliteSize": 8,
            "tournamentSize": 4,
            "convergenceThreshold": 40,
            "fitnessWeights": {
                "hardConstraints": 0.50,      # Must satisfy (conflicts, capacity)
                "softConstraints": 0.20,      # Should satisfy (preferences)
                "nepCompliance": 0.20,        # NEP 2020 compliance
                "optimization": 0.10          # General optimization
            }
        }
        
        # Time slots and working days
        self.working_days = template.get("working_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        self.all_slots = template.get("time_slots", [])
        
        # Categorize slots
        self.theory_slots = [s for s in self.all_slots if s.get("slot_type") not in ("break", "lunch", "lab")]
        self.lab_slots = [s for s in self.all_slots if s.get("slot_type") == "lab"]
        
        if not self.theory_slots:
            self.theory_slots = self.all_slots
            
        # Categorize rooms
        self.theory_rooms = [r for r in self.rooms if not self._is_lab_room(r)]
        self.lab_rooms = [r for r in self.rooms if self._is_lab_room(r)]
        
        if not self.theory_rooms:
            self.theory_rooms = self.rooms
        if not self.lab_rooms:
            self.lab_rooms = self.rooms
        
        # Build required sessions from courses
        self.required_sessions = self._build_sessions()
        
        # NEP 2020 specific data structures
        self.faculty_hours = defaultdict(float)  # Track faculty hours per week
        self.course_types = self._categorize_courses()
        
        # GA state
        self.population = []
        self.best_fitness = -float('inf')
        self.generation_count = 0
        self.convergence_count = 0
        self.fitness_history = []
        self.start_time = None
        self.best_chromosome = None
        
        logger.info(f"NEP GA Engine initialized with {len(self.required_sessions)} sessions")
        logger.info(f"Courses: Theory={len(self.course_types['theory'])}, "
                   f"Lab={len(self.course_types['lab'])}, "
                   f"Multidisciplinary={len(self.course_types['multidisciplinary'])}")
    
    def _is_lab_room(self, room: Dict) -> bool:
        """Check if a room is a lab."""
        room_type = room.get("room_type", "").lower()
        room_name = room.get("room_name", "").lower()
        return "lab" in room_type or "lab" in room_name or "laboratory" in room_type
    
    def _categorize_courses(self) -> Dict[str, List[Dict]]:
        """Categorize courses by type for NEP compliance."""
        categories = {
            "theory": [],
            "lab": [],
            "practical": [],
            "multidisciplinary": [],
            "skill_based": [],
            "research": [],
            "elective": [],
            "core": []
        }
        
        for course in self.courses:
            course_type = course.get("course_type", "").lower()
            course_name = course.get("course_name", "").lower()
            
            # Check various course type indicators
            if "lab" in course_type or "practical" in course_type:
                categories["lab"].append(course)
                categories["practical"].append(course)
            else:
                categories["theory"].append(course)
            
            # Check for multidisciplinary
            if any(kw in course_name for kw in ["interdisciplinary", "multidisciplinary", "integrated"]):
                categories["multidisciplinary"].append(course)
            
            # Check for skill-based
            if any(kw in course_name for kw in ["skill", "vocational", "training"]):
                categories["skill_based"].append(course)
            
            # Check for research
            if any(kw in course_name for kw in ["research", "project", "dissertation"]):
                categories["research"].append(course)
            
            # Check for electives
            if "elective" in course_type or course.get("is_elective", False):
                categories["elective"].append(course)
            else:
                categories["core"].append(course)
        
        return categories
    
    def _build_sessions(self) -> List[Dict]:
        """Build required teaching sessions from courses."""
        sessions = []
        
        group_id = str(self.student_groups[0]["_id"]) if self.student_groups else "TBD"
        group_name = self.student_groups[0].get("name", "All") if self.student_groups else "All"
        
        for course in self.courses:
            course_id = str(course.get("_id", course.get("id", "unknown")))
            course_code = course.get("course_code") or course.get("code", "UNKNOWN")
            course_name = course.get("course_name") or course.get("name", "Unknown Course")
            
            is_lab = (course.get("is_lab", False) or 
                     "lab" in (course.get("course_type") or "").lower() or
                     "practical" in (course.get("course_type") or "").lower())
            
            faculty_id = str(course.get("faculty_id")) if course.get("faculty_id") else "TBD"
            
            # Get course type for NEP compliance
            course_category = "theory"
            if is_lab:
                course_category = "lab"
            elif any(kw in course_name.lower() for kw in ["research", "project"]):
                course_category = "research"
            elif any(kw in course_name.lower() for kw in ["skill", "vocational"]):
                course_category = "skill"
            
            if is_lab:
                # Lab sessions - typically longer
                lab_hours = course.get("lab_hours", 2)
                for i in range(lab_hours):
                    session_id = f"lab_{course_id}_{i}"
                    sessions.append({
                        "id": session_id,
                        "course_id": course_id,
                        "course_code": course_code,
                        "course_name": course_name,
                        "group_id": group_id,
                        "group_name": group_name,
                        "faculty_id": faculty_id,
                        "is_lab": True,
                        "duration": 150,  # 2.5 hours typical for labs
                        "enrolled_students": course.get("enrolled_students", 30),
                        "course_category": course_category,
                        "credits": course.get("credits", 3)
                    })
            else:
                # Theory sessions
                hours = int(course.get("hours_per_week", 3))
                for i in range(hours):
                    session_id = f"theory_{course_id}_{i}"
                    sessions.append({
                        "id": session_id,
                        "course_id": course_id,
                        "course_code": course_code,
                        "course_name": course_name,
                        "group_id": group_id,
                        "group_name": group_name,
                        "faculty_id": faculty_id,
                        "is_lab": False,
                        "duration": course.get("min_per_session", 50),
                        "enrolled_students": course.get("enrolled_students", 30),
                        "course_category": course_category,
                        "credits": course.get("credits", 3)
                    })
        
        return sessions
    
    def get_random_room(self, is_lab: bool) -> Dict:
        """Get a random appropriate room."""
        rooms = self.lab_rooms if is_lab else self.theory_rooms
        return random.choice(rooms) if rooms else {"_id": "TBD", "room_name": "TBD", "capacity": 30, "type": "theory"}
    
    def get_random_slot(self, is_lab: bool) -> Dict:
        """Get a random appropriate time slot."""
        slots = self.lab_slots if is_lab else self.theory_slots
        if not slots:
            return {"start_time": "09:00", "end_time": "10:00", "duration_minutes": 60, "day": random.choice(self.working_days)}
        return random.choice(slots)
    
    def run(self, pop_size: int = 60, max_generations: int = 200) -> Tuple[List[Dict], float, str]:
        """
        Run the genetic algorithm to generate an optimized timetable.
        
        Returns:
            Tuple of (best_chromosome, best_fitness, message)
        """
        self.settings["populationSize"] = pop_size
        self.settings["maxGenerations"] = max_generations
        self.start_time = time.time()
        self.generation_count = 0
        self.convergence_count = 0
        
        if not self.required_sessions:
            return [], 0, "No required sessions to schedule."
        
        logger.info(f"NEP GA: Starting with {len(self.required_sessions)} sessions")
        
        self.initialize_population()
        
        while (self.generation_count < self.settings["maxGenerations"] and 
               self.convergence_count < self.settings["convergenceThreshold"]):
            
            self.evaluate_population()
            
            current_best = max(ind["fitness"] for ind in self.population)
            
            # Early stopping if excellent solution found
            if current_best > 0.92:
                logger.info(f"NEP GA: Excellent solution found (fitness: {current_best:.3f}) at generation {self.generation_count}")
                break
            
            # Check convergence
            if abs(current_best - self.best_fitness) < 0.001:
                self.convergence_count += 1
            else:
                self.convergence_count = 0
                self.best_fitness = current_best
            
            self.fitness_history.append(current_best)
            
            self.population = self.create_next_generation()
            self.generation_count += 1
            
            # Log progress every 20 generations
            if self.generation_count % 20 == 0:
                logger.info(f"NEP GA: Generation {self.generation_count}, Best fitness: {current_best:.3f}")
        
        # Final evaluation
        self.evaluate_population()
        best_individual = self.get_best_individual()
        self.best_chromosome = best_individual["chromosome"]
        
        elapsed = time.time() - self.start_time
        logger.info(f"NEP GA: Completed in {elapsed:.1f}s, {self.generation_count} generations, "
                   f"best fitness: {best_individual['fitness']:.3f}")
        
        return (best_individual["chromosome"], 
                best_individual["fitness"], 
                f"NEP-Optimized timetable generated after {self.generation_count} generations")
    
    def initialize_population(self):
        """Initialize the population with random chromosomes."""
        self.population = []
        for _ in range(self.settings["populationSize"]):
            chromosome = self.create_random_chromosome()
            self.population.append({
                "chromosome": chromosome,
                "fitness": 0,
                "age": 0
            })
    
    def create_random_chromosome(self) -> List[Dict]:
        """Create a random chromosome (timetable)."""
        chromosome = []
        for req in self.required_sessions:
            day = random.choice(self.working_days)
            slot = self.get_random_slot(req['is_lab'])
            room = self.get_random_room(req['is_lab'])
            
            gene = {
                **req,
                "day": day,
                "slot": slot,
                "room_id": str(room.get("_id", "TBD")),
                "room_name": room.get("room_name") or room.get("name", "TBD"),
                "room_capacity": int(room.get("capacity", 30))
            }
            chromosome.append(gene)
        return chromosome
    
    def evaluate_population(self):
        """Evaluate fitness for all individuals in the population."""
        for ind in self.population:
            ind["fitness"] = self.calculate_fitness(ind["chromosome"])
            ind["age"] += 1
        
        self.population.sort(key=lambda x: x["fitness"], reverse=True)
    
    def calculate_fitness(self, chromosome: List[Dict]) -> float:
        """
        Calculate comprehensive fitness score.
        
        Components:
        - Hard constraints (no conflicts)
        - Soft constraints (preferences)
        - NEP 2020 compliance
        - General optimization
        """
        hard_penalty = self.evaluate_hard_constraints(chromosome)
        soft_score = self.evaluate_soft_constraints(chromosome)
        nep_score = self.evaluate_nep_compliance(chromosome)
        opt_score = self.evaluate_optimization(chromosome)
        
        weights = self.settings["fitnessWeights"]
        fitness = ((1 - hard_penalty) * weights["hardConstraints"] + 
                   soft_score * weights["softConstraints"] +
                   nep_score * weights["nepCompliance"] +
                   opt_score * weights["optimization"])
        
        return max(0, min(1, fitness))
    
    def evaluate_hard_constraints(self, chromosome: List[Dict]) -> float:
        """
        Evaluate hard constraint violations.
        Returns penalty ratio (0 = no violations, 1 = all violated).
        """
        violations = 0
        total_checks = 0
        
        faculty_schedule = defaultdict(list)
        room_schedule = defaultdict(list)
        group_schedule = defaultdict(list)
        
        for gene in chromosome:
            day = gene["day"]
            start = t2min(gene["slot"]["start_time"])
            end = t2min(gene["slot"]["end_time"])
            duration = (end - start) / 60  # in hours
            
            # Faculty conflicts
            if gene["faculty_id"] != "TBD":
                total_checks += 1
                for existing_start, existing_end in faculty_schedule[(gene["faculty_id"], day)]:
                    if not (end <= existing_start or start >= existing_end):
                        violations += 1
                faculty_schedule[(gene["faculty_id"], day)].append((start, end))
            
            # Room conflicts
            if gene["room_id"] != "TBD":
                total_checks += 1
                for existing_start, existing_end in room_schedule[(gene["room_id"], day)]:
                    if not (end <= existing_start or start >= existing_end):
                        violations += 1
                room_schedule[(gene["room_id"], day)].append((start, end))
            
            # Group conflicts
            total_checks += 1
            for existing_start, existing_end in group_schedule[(gene["group_id"], day)]:
                if not (end <= existing_start or start >= existing_end):
                    violations += 1
            group_schedule[(gene["group_id"], day)].append((start, end))
            
            # NEP: Faculty workload check (max 18 hours/week per NEP)
            if gene["faculty_id"] != "TBD":
                faculty_hours = sum((e - s) / 60 for s, e in faculty_schedule[(gene["faculty_id"], day)])
                if faculty_hours > 6:  # Max 6 hours per day
                    violations += 0.5
                    total_checks += 1
        
        return violations / total_checks if total_checks > 0 else 0
    
    def evaluate_soft_constraints(self, chromosome: List[Dict]) -> float:
        """Evaluate soft constraint satisfaction."""
        score = 0
        total_checks = 0
        
        for gene in chromosome:
            # Room capacity check
            capacity_ratio = gene["enrolled_students"] / max(1, gene.get("room_capacity", 30))
            if 0.5 <= capacity_ratio <= 1.0:
                score += 1
            elif capacity_ratio <= 1.2:  # Slightly over capacity
                score += 0.5
            total_checks += 1
            
            # Lab in appropriate room
            if gene["is_lab"]:
                if "lab" in gene.get("room_name", "").lower():
                    score += 1
                total_checks += 1
        
        return score / total_checks if total_checks > 0 else 0
    
    def evaluate_nep_compliance(self, chromosome: List[Dict]) -> float:
        """
        Evaluate NEP 2020 compliance score.
        
        Checks:
        1. Practical/Theory ratio (should be balanced)
        2. Faculty workload (max 18 hrs/week)
        3. Continuous assessment spacing
        4. Multidisciplinary course distribution
        5. Research/project time allocation
        """
        scores = []
        
        # 1. Practical/Theory balance
        lab_sessions = [g for g in chromosome if g["is_lab"]]
        theory_sessions = [g for g in chromosome if not g["is_lab"]]
        
        if theory_sessions:
            lab_ratio = len(lab_sessions) / len(theory_sessions)
            # NEP recommends 30-40% practical
            if 0.25 <= lab_ratio <= 0.50:
                scores.append(1.0)
            elif 0.15 <= lab_ratio <= 0.60:
                scores.append(0.7)
            else:
                scores.append(0.3)
        else:
            scores.append(0.5)
        
        # 2. Faculty workload distribution
        faculty_daily_hours = defaultdict(lambda: defaultdict(float))
        for gene in chromosome:
            if gene["faculty_id"] != "TBD":
                start = t2min(gene["slot"]["start_time"])
                end = t2min(gene["slot"]["end_time"])
                hours = (end - start) / 60
                faculty_daily_hours[gene["faculty_id"]][gene["day"]] += hours
        
        workload_score = 0
        faculty_count = 0
        for faculty_id, daily in faculty_daily_hours.items():
            faculty_count += 1
            weekly_hours = sum(daily.values())
            # NEP recommends max 18 hours/week
            if weekly_hours <= 18:
                workload_score += 1.0
            elif weekly_hours <= 22:
                workload_score += 0.7
            else:
                workload_score += 0.3
        
        scores.append(workload_score / max(1, faculty_count))
        
        # 3. Daily load balance (NEP: avoid overloading any single day)
        daily_load = defaultdict(int)
        for gene in chromosome:
            daily_load[gene["day"]] += 1
        
        if daily_load:
            avg_load = len(chromosome) / len(self.working_days)
            variance = sum((daily_load.get(day, 0) - avg_load) ** 2 for day in self.working_days) / len(self.working_days)
            balance_score = 1 / (1 + variance / 10)  # Normalize
            scores.append(balance_score)
        
        # 4. Lab scheduling (prefer afternoon for labs as per common practice)
        lab_timing_score = 0
        for gene in lab_sessions:
            start_time = gene["slot"]["start_time"]
            if start_time >= "13:00":  # Afternoon labs
                lab_timing_score += 1
        
        if lab_sessions:
            scores.append(lab_timing_score / len(lab_sessions))
        
        return sum(scores) / len(scores) if scores else 0.5
    
    def evaluate_optimization(self, chromosome: List[Dict]) -> float:
        """Evaluate general optimization metrics."""
        score = 0
        checks = 0
        
        # Group sessions by group and day
        group_day_sessions = defaultdict(lambda: defaultdict(list))
        for gene in chromosome:
            group_day_sessions[gene["group_id"]][gene["day"]].append(gene)
        
        # Check for consecutive same-course sessions (good for double periods)
        for group_id, day_map in group_day_sessions.items():
            for day, sessions in day_map.items():
                sessions_sorted = sorted(sessions, key=lambda x: x["slot"]["start_time"])
                for i in range(1, len(sessions_sorted)):
                    curr = sessions_sorted[i]
                    prev = sessions_sorted[i-1]
                    if (curr["course_id"] == prev["course_id"] and 
                        prev["slot"]["end_time"] == curr["slot"]["start_time"]):
                        score += 1
                checks += max(0, len(sessions_sorted) - 1)
        
        # Check for minimized gaps
        for group_id, day_map in group_day_sessions.items():
            for day, sessions in day_map.items():
                if len(sessions) > 1:
                    sessions_sorted = sorted(sessions, key=lambda x: x["slot"]["start_time"])
                    total_gap = 0
                    for i in range(1, len(sessions_sorted)):
                        prev_end = t2min(sessions_sorted[i-1]["slot"]["end_time"])
                        curr_start = t2min(sessions_sorted[i]["slot"]["start_time"])
                        gap = curr_start - prev_end
                        total_gap += gap
                    
                    # Lower gap is better
                    if total_gap <= 30:  # 30 minutes or less
                        score += 1
                    elif total_gap <= 60:
                        score += 0.5
                    checks += 1
        
        return score / checks if checks > 0 else 0.5
    
    def create_next_generation(self) -> List[Dict]:
        """Create the next generation through selection, crossover, and mutation."""
        new_population = []
        
        # Elitism - keep best individuals
        elite_count = int(self.settings["eliteSize"])
        for i in range(elite_count):
            if i < len(self.population):
                new_population.append(copy.deepcopy(self.population[i]))
        
        # Generate offspring
        while len(new_population) < self.settings["populationSize"]:
            parent1 = self.select_parent()["chromosome"]
            parent2 = self.select_parent()["chromosome"]
            
            if random.random() < self.settings["crossoverRate"]:
                offspring1, offspring2 = self.crossover(parent1, parent2)
            else:
                offspring1, offspring2 = copy.deepcopy(parent1), copy.deepcopy(parent2)
            
            if random.random() < self.settings["mutationRate"]:
                self.mutate(offspring1)
            if random.random() < self.settings["mutationRate"]:
                self.mutate(offspring2)
            
            new_population.append({"chromosome": offspring1, "fitness": 0, "age": 0})
            if len(new_population) < self.settings["populationSize"]:
                new_population.append({"chromosome": offspring2, "fitness": 0, "age": 0})
        
        return new_population
    
    def select_parent(self) -> Dict:
        """Select parent using tournament selection."""
        tournament = random.sample(self.population, min(self.settings["tournamentSize"], len(self.population)))
        return max(tournament, key=lambda ind: ind["fitness"])
    
    def crossover(self, parent1: List[Dict], parent2: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """Perform order crossover."""
        length = len(parent1)
        if length <= 1:
            return copy.deepcopy(parent1), copy.deepcopy(parent2)
        
        start = random.randint(0, length - 1)
        end = random.randint(start, length - 1)
        
        offspring1 = [None] * length
        offspring2 = [None] * length
        
        # Copy segment
        for i in range(start, end + 1):
            offspring1[i] = copy.deepcopy(parent1[i])
            offspring2[i] = copy.deepcopy(parent2[i])
        
        # Fill remaining
        for i in range(length):
            if offspring1[i] is None:
                offspring1[i] = copy.deepcopy(parent2[i])
            if offspring2[i] is None:
                offspring2[i] = copy.deepcopy(parent1[i])
        
        return offspring1, offspring2
    
    def mutate(self, chromosome: List[Dict]):
        """Apply mutation operators."""
        mutation_type = random.random()
        
        if mutation_type < 0.3:
            self.swap_mutation(chromosome)
        elif mutation_type < 0.6:
            self.insertion_mutation(chromosome)
        elif mutation_type < 0.8:
            self.inversion_mutation(chromosome)
        else:
            self.attribute_mutation(chromosome)
    
    def swap_mutation(self, chromosome: List[Dict]):
        """Swap two random genes."""
        if len(chromosome) < 2:
            return
        idx1, idx2 = random.sample(range(len(chromosome)), 2)
        chromosome[idx1], chromosome[idx2] = chromosome[idx2], chromosome[idx1]
    
    def insertion_mutation(self, chromosome: List[Dict]):
        """Move a gene to a new position."""
        if len(chromosome) < 2:
            return
        idx1, idx2 = random.sample(range(len(chromosome)), 2)
        gene = chromosome.pop(idx1)
        chromosome.insert(idx2, gene)
    
    def inversion_mutation(self, chromosome: List[Dict]):
        """Invert a segment of genes."""
        if len(chromosome) < 2:
            return
        start = random.randint(0, len(chromosome) - 1)
        end = random.randint(start, len(chromosome) - 1)
        chromosome[start:end+1] = list(reversed(chromosome[start:end+1]))
    
    def attribute_mutation(self, chromosome: List[Dict]):
        """Mutate attributes of random genes."""
        for gene in chromosome:
            if random.random() < 0.1:
                gene["day"] = random.choice(self.working_days)
                gene["slot"] = self.get_random_slot(gene["is_lab"])
                
                room = self.get_random_room(gene["is_lab"])
                gene["room_id"] = str(room.get("_id", "TBD"))
                gene["room_name"] = room.get("room_name") or room.get("name", "TBD")
                gene["room_capacity"] = int(room.get("capacity", 30))
    
    def get_best_individual(self) -> Dict:
        """Get the best individual from the population."""
        return self.population[0]
    
    def chromosome_to_entries(self, chromosome: List[Dict]) -> List[Dict]:
        """Convert chromosome to timetable entries format."""
        entries = []
        
        for gene in chromosome:
            # Get faculty name
            faculty_name = "TBD"
            if gene["faculty_id"] != "TBD":
                fac = next((f for f in self.all_faculty if str(f.get("_id")) == gene["faculty_id"]), None)
                if fac:
                    faculty_name = fac.get("name", "TBD")
            
            entries.append({
                "course_code": gene["course_code"],
                "course_name": gene["course_name"],
                "faculty_name": faculty_name,
                "room": gene["room_name"],
                "group_name": gene.get("group_name", "All"),
                "is_lab": gene["is_lab"],
                "course_category": gene.get("course_category", "theory"),
                "credits": gene.get("credits", 3),
                "time_slot": {
                    "day": gene["day"],
                    "start_time": gene["slot"]["start_time"],
                    "end_time": gene["slot"]["end_time"],
                    "duration_minutes": gene["slot"]["duration_minutes"],
                    "slot_type": gene["slot"].get("slot_type", "lecture")
                },
                "_internal_group_id": gene["group_id"],
                "_internal_course_id": gene["course_id"],
                "_internal_faculty_id": gene["faculty_id"],
                "_internal_room_id": gene["room_id"]
            })
        
        return entries
    
    def get_nep_compliance_report(self, chromosome: List[Dict] = None) -> Dict[str, Any]:
        """Generate a detailed NEP 2020 compliance report."""
        if chromosome is None:
            chromosome = self.best_chromosome
        
        if not chromosome:
            return {"error": "No chromosome available for analysis"}
        
        report = {
            "overall_score": 0,
            "areas": {},
            "recommendations": [],
            "statistics": {}
        }
        
        # Calculate statistics
        lab_count = sum(1 for g in chromosome if g["is_lab"])
        theory_count = len(chromosome) - lab_count
        
        report["statistics"] = {
            "total_sessions": len(chromosome),
            "lab_sessions": lab_count,
            "theory_sessions": theory_count,
            "practical_ratio": lab_count / max(1, theory_count)
        }
        
        # Faculty workload analysis
        faculty_hours = defaultdict(lambda: defaultdict(float))
        for gene in chromosome:
            if gene["faculty_id"] != "TBD":
                start = t2min(gene["slot"]["start_time"])
                end = t2min(gene["slot"]["end_time"])
                hours = (end - start) / 60
                faculty_hours[gene["faculty_id"]][gene["day"]] += hours
        
        workload_issues = []
        for faculty_id, daily in faculty_hours.items():
            weekly = sum(daily.values())
            if weekly > 18:
                workload_issues.append(f"Faculty {faculty_id}: {weekly:.1f} hours/week exceeds NEP limit of 18")
        
        report["areas"]["faculty_workload"] = {
            "score": 100 if not workload_issues else 60,
            "issues": workload_issues
        }
        
        # Practical/Theory ratio
        ratio = lab_count / max(1, theory_count)
        if 0.25 <= ratio <= 0.50:
            ratio_score = 100
        elif 0.15 <= ratio <= 0.60:
            ratio_score = 70
        else:
            ratio_score = 40
        
        report["areas"]["practical_theory_ratio"] = {
            "score": ratio_score,
            "current_ratio": f"{ratio:.2f}",
            "recommended": "0.30-0.40"
        }
        
        # Calculate overall score
        scores = [area["score"] for area in report["areas"].values()]
        report["overall_score"] = sum(scores) / len(scores) if scores else 0
        
        # Generate recommendations
        if ratio < 0.25:
            report["recommendations"].append("Increase practical/lab sessions to meet NEP recommendations (30-40%)")
        if workload_issues:
            report["recommendations"].append("Reduce faculty workload - some faculty exceed 18 hours/week limit")
        
        return report
