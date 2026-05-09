import random
import copy
from typing import List, Dict, Any, Tuple
from collections import defaultdict
import datetime
import math
import time
import logging

logger = logging.getLogger(__name__)

def t2min(t: str) -> int:
    try:
        h, m = t.split(":")
        return int(h) * 60 + int(m)
    except:
        return 0

class GAEngine:
    """
    Genetic Algorithm for Timetable Optimization
    
    This implements a sophisticated genetic algorithm with:
    - Custom chromosome representation for timetables
    - Multiple crossover strategies
    - Various mutation operators (Swap, Inversion, Insertion, Attribute)
    - Tournament selection
    - Multi-objective fitness function
    - Elitism and diversity preservation
    """
    def __init__(self, courses: List[Dict], student_groups: List[Dict], rooms: List[Dict], all_faculty: List[Dict], template: Dict):
        self.courses = courses
        self.student_groups = student_groups
        self.rooms = rooms
        self.all_faculty = all_faculty
        self.template = template
        
        self.settings = {
            "populationSize": 50,
            "maxGenerations": 150,
            "crossoverRate": 0.8,
            "mutationRate": 0.15,
            "eliteSize": 5,
            "tournamentSize": 3,
            "convergenceThreshold": 30,
            "fitnessWeights": {
                "hardConstraints": 0.6,
                "softConstraints": 0.2,
                "optimization": 0.2
            }
        }
        
        self.working_days = template.get("working_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        self.all_slots = template.get("time_slots", [])
        
        self.theory_slots = [s for s in self.all_slots if s.get("slot_type") not in ("break", "lunch", "lab")]
        self.lab_slots = [s for s in self.all_slots if s.get("slot_type") == "lab"]
        
        if not self.theory_slots:
            self.theory_slots = self.all_slots
            
        self.theory_rooms = [r for r in self.rooms if "lab" not in r.get("room_type", "").lower() and "lab" not in r.get("room_name", "").lower()]
        self.lab_rooms = [r for r in self.rooms if "lab" in r.get("room_type", "").lower() or "lab" in r.get("room_name", "").lower()]
        
        if not self.theory_rooms:
            self.theory_rooms = self.rooms
        if not self.lab_rooms:
            self.lab_rooms = self.rooms
            
        # Build required sessions (JS's extractSessions equivalent)
        self.required_sessions = []
        group_id = str(self.student_groups[0]["_id"]) if self.student_groups else "TBD"
        group_name = self.student_groups[0].get("name", "All") if self.student_groups else "All"
        
        for course in self.courses:
            course_id = str(course["_id"])
            course_code = course.get("course_code") or course.get("code", "UNKNOWN")
            course_name = course.get("course_name") or course.get("name", "Unknown Course")
            is_lab = course.get("is_lab", False) or "lab" in (course.get("course_type") or course.get("type", "")).lower()
            
            faculty_id = str(course.get("faculty_id")) if course.get("faculty_id") else "TBD"
            
            if is_lab:
                session_id = f"lab_{course_id}"
                self.required_sessions.append({
                    "id": session_id,
                    "course_id": course_id, "course_code": course_code, "course_name": course_name,
                    "group_id": group_id, "group_name": group_name,
                    "faculty_id": faculty_id,
                    "is_lab": True,
                    "duration": 150,
                    "enrolled_students": course.get("enrolledStudents", 30)
                })
            else:
                hours = int(course.get("hours_per_week", 3))
                for i in range(hours):
                    session_id = f"theory_{course_id}_{i}"
                    self.required_sessions.append({
                        "id": session_id,
                        "course_id": course_id, "course_code": course_code, "course_name": course_name,
                        "group_id": group_id, "group_name": group_name,
                        "faculty_id": faculty_id,
                        "is_lab": False,
                        "duration": course.get("min_per_session", 50),
                        "enrolled_students": course.get("enrolledStudents", 30)
                    })
                    
        self.population = []
        self.best_fitness = -float('inf')
        self.generation_count = 0
        self.convergence_count = 0
        self.fitness_history = []
        self.start_time = None

    def get_random_room(self, is_lab):
        rooms = self.lab_rooms if is_lab else self.theory_rooms
        return random.choice(rooms) if rooms else {"_id": "TBD", "room_name": "TBD", "capacity": 30, "type": "theory"}

    def get_random_slot(self, is_lab):
        slots = self.lab_slots if is_lab else self.theory_slots
        if not slots:
            return {"start_time": "00:00", "end_time": "00:00", "duration_minutes": 0, "day": random.choice(self.working_days)}
        return random.choice(slots)

    def run(self, pop_size=50, max_generations=150):
        self.settings["populationSize"] = pop_size
        self.settings["maxGenerations"] = max_generations
        self.start_time = time.time()
        self.generation_count = 0
        self.convergence_count = 0

        if not self.required_sessions:
            return [], 0, "No required sessions to schedule."
            
        logger.info(f"GA: Starting with {len(self.required_sessions)} sessions to schedule")

        self.initialize_population()
        
        while self.generation_count < self.settings["maxGenerations"] and \
              self.convergence_count < self.settings["convergenceThreshold"]:
            
            self.evaluate_population()
            
            current_best = max(ind["fitness"] for ind in self.population)
            
            # Early stopping if we found a very good solution
            if current_best > 0.95:
                logger.info(f"GA: Found excellent solution (fitness: {current_best:.3f}) at generation {self.generation_count}")
                break
                
            if abs(current_best - self.best_fitness) < 0.001:
                self.convergence_count += 1
            else:
                self.convergence_count = 0
                self.best_fitness = current_best
                
            self.fitness_history.append(current_best)
            
            self.population = self.create_next_generation()
            self.generation_count += 1
            
        self.evaluate_population()
        best_individual = self.get_best_individual()
        
        return best_individual["chromosome"], best_individual["fitness"], f"Completed after {self.generation_count} generations"

    def initialize_population(self):
        self.population = []
        for _ in range(self.settings["populationSize"]):
            chromosome = self.create_random_chromosome()
            self.population.append({
                "chromosome": chromosome,
                "fitness": 0,
                "age": 0
            })

    def create_random_chromosome(self):
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
        for ind in self.population:
            ind["fitness"] = self.calculate_fitness(ind["chromosome"])
            ind["age"] += 1
        
        self.population.sort(key=lambda x: x["fitness"], reverse=True)

    def calculate_fitness(self, chromosome):
        hard_penalty = self.evaluate_hard_constraints(chromosome)
        soft_score = self.evaluate_soft_constraints(chromosome)
        optimization_score = self.evaluate_optimization(chromosome)
        
        weights = self.settings["fitnessWeights"]
        fitness = (1 - hard_penalty) * weights["hardConstraints"] + \
                  soft_score * weights["softConstraints"] + \
                  optimization_score * weights["optimization"]
                  
        return max(0, fitness)

    def evaluate_hard_constraints(self, chromosome):
        violations = 0
        total_checks = 0
        
        faculty_schedule = defaultdict(list)
        room_schedule = defaultdict(list)
        group_schedule = defaultdict(list)
        
        for gene in chromosome:
            day = gene["day"]
            start = t2min(gene["slot"]["start_time"])
            end = t2min(gene["slot"]["end_time"])
            
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
            
        return violations / total_checks if total_checks > 0 else 0

    def evaluate_soft_constraints(self, chromosome):
        score = 0
        total_checks = 0
        
        for gene in chromosome:
            # Capacity check
            capacity_ratio = gene["enrolled_students"] / max(1, gene.get("room_capacity", 30))
            if 0.5 <= capacity_ratio <= 1.0:
                score += 1
            total_checks += 1
            
        return score / total_checks if total_checks > 0 else 0

    def evaluate_optimization(self, chromosome):
        score = 0
        total_checks = 0
        
        # Balance workload across days
        daily_load = defaultdict(int)
        for gene in chromosome:
            daily_load[gene["day"]] += 1
            
        avg_load = len(chromosome) / max(1, len(self.working_days))
        load_variance = sum((daily_load.get(day, 0) - avg_load) ** 2 for day in self.working_days) / max(1, len(self.working_days))
        
        balance_score = 1 / (1 + load_variance)
        score += balance_score
        total_checks += 1
        
        return score / total_checks if total_checks > 0 else 0

    def create_next_generation(self):
        new_population = []
        
        # Elitism
        elite_count = int(self.settings["eliteSize"])
        for i in range(elite_count):
            if i < len(self.population):
                new_population.append(copy.deepcopy(self.population[i]))
                
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

    def select_parent(self):
        tournament = random.sample(self.population, min(self.settings["tournamentSize"], len(self.population)))
        return max(tournament, key=lambda ind: ind["fitness"])

    def crossover(self, parent1, parent2):
        # Order crossover / Day-level crossover combination
        length = len(parent1)
        if length <= 1:
            return copy.deepcopy(parent1), copy.deepcopy(parent2)
            
        start = random.randint(0, length - 1)
        end = random.randint(start, length - 1)
        
        offspring1 = [None] * length
        offspring2 = [None] * length
        
        # Copy segments
        for i in range(start, end + 1):
            offspring1[i] = copy.deepcopy(parent1[i])
            offspring2[i] = copy.deepcopy(parent2[i])
            
        # Fill remaining positions
        for i in range(length):
            if offspring1[i] is None:
                offspring1[i] = copy.deepcopy(parent2[i])
            if offspring2[i] is None:
                offspring2[i] = copy.deepcopy(parent1[i])
                
        return offspring1, offspring2

    def mutate(self, chromosome):
        mutation_type = random.random()
        
        if mutation_type < 0.3:
            self.swap_mutation(chromosome)
        elif mutation_type < 0.6:
            self.insertion_mutation(chromosome)
        elif mutation_type < 0.8:
            self.inversion_mutation(chromosome)
        else:
            self.attribute_mutation(chromosome)

    def swap_mutation(self, chromosome):
        if len(chromosome) < 2: return
        idx1, idx2 = random.sample(range(len(chromosome)), 2)
        chromosome[idx1], chromosome[idx2] = chromosome[idx2], chromosome[idx1]

    def insertion_mutation(self, chromosome):
        if len(chromosome) < 2: return
        idx1, idx2 = random.sample(range(len(chromosome)), 2)
        gene = chromosome.pop(idx1)
        chromosome.insert(idx2, gene)

    def inversion_mutation(self, chromosome):
        if len(chromosome) < 2: return
        start = random.randint(0, len(chromosome) - 1)
        end = random.randint(start, len(chromosome) - 1)
        chromosome[start:end+1] = list(reversed(chromosome[start:end+1]))

    def attribute_mutation(self, chromosome):
        for gene in chromosome:
            if random.random() < 0.1:
                gene["day"] = random.choice(self.working_days)
                gene["slot"] = self.get_random_slot(gene["is_lab"])
                
                room = self.get_random_room(gene["is_lab"])
                gene["room_id"] = str(room.get("_id", "TBD"))
                gene["room_name"] = room.get("room_name") or room.get("name", "TBD")
                gene["room_capacity"] = int(room.get("capacity", 30))

    def get_best_individual(self):
        return self.population[0]

    def chromosome_to_entries(self, chromosome):
        entries = []
        for g in chromosome:
            faculty_name = "TBD"
            if g["faculty_id"] != "TBD":
                fac = next((f for f in self.all_faculty if str(f["_id"]) == g["faculty_id"]), None)
                if fac:
                    faculty_name = fac.get("name", "TBD")
                    
            entries.append({
                "course_code": g["course_code"],
                "course_name": g["course_name"],
                "faculty_name": faculty_name,
                "room": g["room_name"],
                "group_name": g.get("group_name", "All"),
                "is_lab": g["is_lab"],
                "time_slot": {
                    "day": g["day"],
                    "start_time": g["slot"]["start_time"],
                    "end_time": g["slot"]["end_time"],
                    "duration_minutes": g["slot"]["duration_minutes"],
                    "slot_type": g["slot"].get("slot_type", "lecture")
                },
                "_internal_group_id": g["group_id"],
                "_internal_course_id": g["course_id"],
                "_internal_faculty_id": g["faculty_id"],
                "_internal_room_id": g["room_id"]
            })
        return entries
