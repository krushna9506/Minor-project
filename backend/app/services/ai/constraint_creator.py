"""
AI-Powered Constraint Creator
Uses Gemini AI to parse natural language constraints and convert them to structured constraint objects.
Also provides NEP 2020 compliance checking and constraint optimization suggestions.
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import google.generativeai as genai
from app.core.config import settings
from app.db.mongodb import db
from bson import ObjectId


class AIConstraintCreator:
    """
    AI-powered constraint creation and management system.
    Uses Gemini AI to:
    1. Parse natural language constraints into structured format
    2. Suggest constraints based on program requirements
    3. Validate constraints against NEP 2020 guidelines
    4. Optimize constraint sets for better timetable generation
    """
    
    # NEP 2020 Compliance Rules
    NEP_RULES = {
        "credit_system": {
            "description": "Choice-Based Credit System (CBCS) compliance",
            "requirements": [
                "Minimum 160 credits for 4-year UG program",
                "Flexible course selection for students",
                "Multiple entry and exit points",
                "Credit transfer mechanisms"
            ],
            "constraint_types": ["credit_distribution", "course_flexibility", "exit_points"]
        },
        "multidisciplinary": {
            "description": "Multidisciplinary and holistic education",
            "requirements": [
                "Integration of arts, sciences, and vocational subjects",
                "No hard separations between disciplines",
                "Multiple subject combinations allowed",
                "Cross-disciplinary courses"
            ],
            "constraint_types": ["subject_combinations", "cross_disciplinary", "elective_flexibility"]
        },
        "assessment": {
            "description": "Continuous assessment and flexibility",
            "requirements": [
                "Regular assessments throughout semester",
                "Multiple assessment methods",
                "No high-stakes single examinations",
                "Formative and summative assessments"
            ],
            "constraint_types": ["assessment_spacing", "exam_scheduling", "continuous_evaluation"]
        },
        "skill_development": {
            "description": "Skill development and practical learning",
            "requirements": [
                "Practical/lab hours proportional to theory",
                "Industry exposure time allocation",
                "Skill-based course integration",
                "Hands-on learning opportunities"
            ],
            "constraint_types": ["lab_scheduling", "practical_hours", "industry_exposure"]
        },
        "research": {
            "description": "Research and critical thinking",
            "requirements": [
                "Research methodology courses",
                "Project work time allocation",
                "Innovation and entrepreneurship exposure",
                "Critical thinking development"
            ],
            "constraint_types": ["project_scheduling", "research_time", "innovation_slots"]
        },
        "faculty_workload": {
            "description": "Faculty workload and quality",
            "requirements": [
                "Reasonable teaching load (max 16-18 hours/week)",
                "Time for research and development",
                "Professional development opportunities",
                "Student mentoring time"
            ],
            "constraint_types": ["faculty_hours", "workload_distribution", "mentoring_time"]
        }
    }
    
    # Constraint type mappings for natural language parsing
    CONSTRAINT_PATTERNS = {
        "faculty_availability": {
            "patterns": [
                r"faculty\s+(\w+)\s+(is\s+)?(not\s+)?available",
                r"professor\s+(\w+)\s+(can|cannot)\s+teach",
                r"teacher\s+(\w+)\s+(unavailable|available)",
                r"(\w+)\s+is\s+(free|busy)\s+on",
            ],
            "parameters": ["faculty_id", "available_days", "start_time", "end_time"]
        },
        "faculty_workload": {
            "patterns": [
                r"faculty\s+(\w+)\s+(should\s+)?(teach|work)\s+(max|maximum|at\s+most)\s+(\d+)",
                r"(max|maximum)\s+(\d+)\s+hours\s+for\s+(\w+)",
                r"(\w+)\s+can\s+teach\s+(max|maximum)\s+(\d+)",
                r"workload\s+(limit|restriction)\s+for\s+(\w+)"
            ],
            "parameters": ["faculty_id", "max_hours_per_day", "max_hours_per_week"]
        },
        "room_capacity": {
            "patterns": [
                r"room\s+(\w+)\s+(should\s+)?(hold|fit|accommodate|capacity)",
                r"(max|maximum)\s+(\d+)\s+students\s+in\s+room",
                r"room\s+(\w+)\s+capacity\s+(is\s+)?(\d+)",
            ],
            "parameters": ["room_id", "min_capacity", "max_capacity"]
        },
        "room_type_requirement": {
            "patterns": [
                r"(course|subject)\s+(\w+)\s+needs\s+(a\s+)?(lab|laboratory|hall)",
                r"(lab|laboratory)\s+required\s+for\s+(\w+)",
                r"(\w+)\s+must\s+be\s+in\s+(lab|laboratory|hall)",
            ],
            "parameters": ["course_id", "required_room_type"]
        },
        "time_preference": {
            "patterns": [
                r"(prefer|avoid)\s+(morning|afternoon|evening)",
                r"(classes|sessions)\s+(should\s+)?(be\s+)?(before|after)\s+(\d+)",
                r"(no\s+)?classes\s+(during|at)\s+(lunch|break)",
            ],
            "parameters": ["preferred_times", "avoid_times", "priority"]
        },
        "consecutive_classes": {
            "patterns": [
                r"(course|subject)\s+(\w+)\s+and\s+(\w+)\s+(should\s+)?be\s+consecutive",
                r"(schedule|put)\s+(\w+)\s+and\s+(\w+)\s+together",
                r"(back\s*to\s*back|consecutive)\s+classes\s+for\s+(\w+)",
            ],
            "parameters": ["course_ids", "must_be_consecutive", "max_gap"]
        },
        "gap_minimization": {
            "patterns": [
                r"(minimize|reduce)\s+gaps",
                r"(no|avoid)\s+(long\s+)?gaps\s+(between|in)",
                r"(max|maximum)\s+(\d+)\s+(hour|hr)\s+gap",
            ],
            "parameters": ["max_gap_hours", "apply_to"]
        },
        "block_scheduling": {
            "patterns": [
                r"(schedule|block)\s+(\w+)\s+for\s+(\d+)\s+(hour|hr|hours)",
                r"(teaching\s+practice|field\s+work)\s+(block|session)",
                r"consecutive\s+(\d+)\s+days\s+for\s+(\w+)",
            ],
            "parameters": ["course_id", "block_duration", "consecutive_days"]
        },
        "nep_compliance": {
            "patterns": [
                r"nep\s+2020\s+(compliance|requirement|guideline)",
                r"multidisciplinary\s+(course|subject|requirement)",
                r"credit\s+system\s+(compliance|requirement)",
                r"(cbcs|choice\s+based)\s+compliance",
            ],
            "parameters": ["compliance_type", "requirement_details"]
        }
    }
    
    def __init__(self):
        """Initialize the AI Constraint Creator"""
        self.model = None
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        else:
            self.model = None
        
    async def parse_natural_language_constraint(self, text: str, program_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse natural language constraint text into structured constraint format.
        
        Args:
            text: Natural language description of the constraint
            program_id: Optional program ID for context
            
        Returns:
            Structured constraint object ready for database storage
        """
        if not self.model:
            # Fallback to rule-based parsing if AI not available
            return self._rule_based_parse(text, program_id)
        
        try:
            # Get program context if available
            program_context = ""
            if program_id:
                program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
                if program:
                    program_context = f"""
                    Program Context:
                    - Name: {program.get('name', 'Unknown')}
                    - Type: {program.get('type', 'Unknown')}
                    - Department: {program.get('department', 'Unknown')}
                    - Duration: {program.get('duration_years', 0)} years
                    """
            
            prompt = f"""
            You are an AI assistant for an academic timetable management system.
            Parse the following natural language constraint into a structured format.
            
            {program_context}
            
            Natural Language Constraint:
            "{text}"
            
            Available constraint types:
            - faculty_availability: When faculty members are available
            - faculty_workload: Limits on faculty teaching hours
            - room_capacity: Room capacity requirements
            - room_type_requirement: Specific room type needs (lab, lecture hall)
            - time_preference: Time slot preferences
            - consecutive_classes: Courses that should be scheduled consecutively
            - gap_minimization: Minimize gaps in schedules
            - block_scheduling: Block scheduling for practical sessions
            - nep_compliance: NEP 2020 compliance requirements
            
            Parse the constraint and return a JSON object with:
            {{
                "name": "Short descriptive name for the constraint",
                "type": "One of the constraint types above",
                "description": "Full description of what this constraint enforces",
                "parameters": {{
                    // Type-specific parameters
                }},
                "priority": 1-10 (10 being highest priority),
                "is_active": true,
                "nep_compliance": {{
                    "relevant": true/false,
                    "nep_areas": ["List of NEP 2020 areas this relates to"]
                }}
            }}
            
            For NEP 2020 compliance, consider:
            - Credit system flexibility
            - Multidisciplinary requirements
            - Assessment patterns
            - Skill development needs
            - Faculty workload guidelines
            
            Return ONLY the JSON object, no additional text.
            """
            
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            parsed = json.loads(response_text)
            
            # Add metadata
            parsed["parsed_from"] = text
            parsed["parsed_at"] = datetime.utcnow().isoformat()
            if program_id:
                parsed["program_id"] = program_id
                
            return parsed
            
        except Exception as e:
            # Fallback to rule-based parsing
            return self._rule_based_parse(text, program_id)
    
    def _rule_based_parse(self, text: str, program_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fallback rule-based constraint parsing when AI is unavailable.
        """
        text_lower = text.lower()
        
        # Try to match constraint type
        for constraint_type, config in self.CONSTRAINT_PATTERNS.items():
            for pattern in config["patterns"]:
                if re.search(pattern, text_lower):
                    return self._create_constraint_from_match(
                        constraint_type, text, program_id
                    )
        
        # Default to generic constraint
        return {
            "name": f"Custom Constraint: {text[:50]}...",
            "type": "custom",
            "description": text,
            "parameters": {"raw_text": text},
            "priority": 5,
            "is_active": True,
            "program_id": program_id,
            "parsed_from": text,
            "parsed_at": datetime.utcnow().isoformat(),
            "nep_compliance": {"relevant": False, "nep_areas": []}
        }
    
    def _create_constraint_from_match(self, constraint_type: str, text: str, 
                                       program_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a constraint object from a pattern match."""
        
        constraint_templates = {
            "faculty_availability": {
                "name": "Faculty Availability",
                "parameters": {"faculty_id": "", "available_days": [], "start_time": "09:00", "end_time": "17:00"}
            },
            "faculty_workload": {
                "name": "Faculty Workload Limit",
                "parameters": {"faculty_id": "", "max_hours_per_day": 6, "max_hours_per_week": 18}
            },
            "room_capacity": {
                "name": "Room Capacity Requirement",
                "parameters": {"room_id": "", "min_capacity": 10, "max_capacity": 100}
            },
            "room_type_requirement": {
                "name": "Room Type Requirement",
                "parameters": {"course_id": "", "required_room_type": "Lecture Hall"}
            },
            "time_preference": {
                "name": "Time Preference",
                "parameters": {"preferred_times": [], "avoid_times": [], "priority": 5}
            },
            "consecutive_classes": {
                "name": "Consecutive Classes Requirement",
                "parameters": {"course_ids": [], "must_be_consecutive": True, "max_gap": 0}
            },
            "gap_minimization": {
                "name": "Gap Minimization",
                "parameters": {"max_gap_hours": 2, "apply_to": "Both"}
            },
            "block_scheduling": {
                "name": "Block Scheduling",
                "parameters": {"course_id": "", "block_duration": 3, "consecutive_days": 1}
            },
            "nep_compliance": {
                "name": "NEP 2020 Compliance",
                "parameters": {"compliance_type": "Credit Distribution", "requirement_details": {}}
            }
        }
        
        template = constraint_templates.get(constraint_type, {
            "name": "Custom Constraint",
            "parameters": {}
        })
        
        # Extract entities from text (simplified)
        # In a real implementation, use NER or more sophisticated extraction
        
        return {
            "name": template["name"],
            "type": constraint_type,
            "description": text,
            "parameters": template["parameters"],
            "priority": 5,
            "is_active": True,
            "program_id": program_id,
            "parsed_from": text,
            "parsed_at": datetime.utcnow().isoformat(),
            "nep_compliance": self._check_nep_relevance(constraint_type, text)
        }
    
    def _check_nep_relevance(self, constraint_type: str, text: str) -> Dict[str, Any]:
        """Check if a constraint is relevant to NEP 2020 compliance."""
        text_lower = text.lower()
        nep_areas = []
        
        # Check for NEP keywords
        nep_keywords = {
            "credit_system": ["credit", "cbcs", "choice based", "flexible"],
            "multidisciplinary": ["multidisciplinary", "interdisciplinary", "holistic", "arts", "science"],
            "assessment": ["assessment", "evaluation", "exam", "continuous"],
            "skill_development": ["skill", "practical", "lab", "hands-on", "vocational"],
            "research": ["research", "project", "innovation", "critical thinking"],
            "faculty_workload": ["workload", "teaching load", "faculty hours"]
        }
        
        for area, keywords in nep_keywords.items():
            if any(kw in text_lower for kw in keywords):
                nep_areas.append(area)
        
        # Check constraint type
        if constraint_type in ["faculty_workload"]:
            nep_areas.append("faculty_workload")
        if constraint_type in ["room_type_requirement"] and "lab" in text_lower:
            nep_areas.append("skill_development")
        
        return {
            "relevant": len(nep_areas) > 0,
            "nep_areas": list(set(nep_areas))
        }
    
    async def suggest_constraints_for_program(self, program_id: str) -> List[Dict[str, Any]]:
        """
        Use AI to suggest optimal constraints for a specific program.
        
        Args:
            program_id: The program ID to suggest constraints for
            
        Returns:
            List of suggested constraint objects
        """
        if not self.model:
            return self._get_default_constraints(program_id)
        
        try:
            # Get program details
            program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
            if not program:
                return []
            
            # Get related data
            courses = await db.db.courses.find({"program_id": ObjectId(program_id)}).to_list(length=None)
            faculty = await db.db.faculty.find({}).to_list(length=None)
            rooms = await db.db.rooms.find({}).to_list(length=None)
            
            prompt = f"""
            You are an expert academic scheduler specializing in NEP 2020 compliance.
            Suggest optimal scheduling constraints for this academic program.
            
            Program Details:
            {json.dumps(program, default=str, indent=2)}
            
            Courses ({len(courses)}):
            {json.dumps([{"code": c.get("code"), "name": c.get("name"), "type": c.get("type"), "hours": c.get("hours_per_week")} for c in courses[:10]], indent=2)}
            
            Faculty ({len(faculty)}):
            {json.dumps([{"name": f.get("name"), "department": f.get("department"), "designation": f.get("designation")} for f in faculty[:5]], indent=2)}
            
            Rooms ({len(rooms)}):
            {json.dumps([{"name": r.get("name"), "type": r.get("room_type"), "capacity": r.get("capacity")} for r in rooms[:5]], indent=2)}
            
            NEP 2020 Guidelines to consider:
            1. Credit System: Flexible CBCS with multiple entry/exit points
            2. Multidisciplinary: Integration of arts, sciences, vocational subjects
            3. Assessment: Continuous evaluation, no high-stakes single exams
            4. Skill Development: Practical hours proportional to theory
            5. Research: Time for projects and innovation
            6. Faculty Workload: Max 16-18 hours/week teaching
            
            Suggest 8-12 constraints covering:
            - Faculty workload management
            - Room utilization optimization
            - Student schedule quality
            - NEP 2020 compliance
            - Practical/lab scheduling
            - Assessment scheduling
            
            Return as JSON array:
            [
                {{
                    "name": "Constraint name",
                    "type": "constraint_type",
                    "description": "Detailed description",
                    "parameters": {{}},
                    "priority": 1-10,
                    "nep_rationale": "How this supports NEP 2020"
                }}
            ]
            
            Return ONLY the JSON array, no additional text.
            """
            
            response = self.model.generate_content(prompt)
            
            # Extract JSON
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            suggestions = json.loads(response_text.strip())
            
            # Add metadata to each suggestion
            for suggestion in suggestions:
                suggestion["program_id"] = program_id
                suggestion["is_active"] = True
                suggestion["is_ai_suggested"] = True
                suggestion["suggested_at"] = datetime.utcnow().isoformat()
            
            return suggestions
            
        except Exception as e:
            return self._get_default_constraints(program_id)
    
    def _get_default_constraints(self, program_id: str) -> List[Dict[str, Any]]:
        """Get default constraints when AI is unavailable."""
        return [
            {
                "name": "Faculty Workload Limit",
                "type": "faculty_workload",
                "description": "Limit faculty teaching to 18 hours per week as per NEP guidelines",
                "parameters": {"max_hours_per_week": 18},
                "priority": 9,
                "is_active": True,
                "program_id": program_id,
                "nep_rationale": "NEP 2020 recommends reasonable faculty workload for quality education"
            },
            {
                "name": "Gap Minimization",
                "type": "gap_minimization",
                "description": "Minimize gaps between classes for better student experience",
                "parameters": {"max_gap_hours": 2, "apply_to": "Students"},
                "priority": 6,
                "is_active": True,
                "program_id": program_id,
                "nep_rationale": "Efficient scheduling supports holistic student development"
            },
            {
                "name": "Lab Session Scheduling",
                "type": "room_type_requirement",
                "description": "Ensure practical courses are scheduled in appropriate labs",
                "parameters": {"required_room_type": "Laboratory"},
                "priority": 8,
                "is_active": True,
                "program_id": program_id,
                "nep_rationale": "NEP emphasizes practical and skill-based learning"
            }
        ]
    
    async def validate_nep_compliance(self, constraints: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate a set of constraints against NEP 2020 guidelines.
        
        Args:
            constraints: List of constraint objects to validate
            
        Returns:
            Compliance report with scores and recommendations
        """
        if not self.model:
            return self._rule_based_nep_validation(constraints)
        
        try:
            prompt = f"""
            Validate these scheduling constraints against NEP 2020 guidelines.
            
            Constraints:
            {json.dumps(constraints, indent=2)}
            
            NEP 2020 Key Areas:
            1. Credit System (CBCS, flexibility, multiple entry/exit)
            2. Multidisciplinary (no hard separations, holistic)
            3. Assessment (continuous, multiple methods)
            4. Skill Development (practical focus, vocational)
            5. Research & Innovation (critical thinking, projects)
            6. Faculty Workload (max 16-18 hrs/week, research time)
            
            Provide a JSON response:
            {{
                "overall_score": 0-100,
                "compliance_level": "high/medium/low",
                "area_scores": {{
                    "credit_system": 0-100,
                    "multidisciplinary": 0-100,
                    "assessment": 0-100,
                    "skill_development": 0-100,
                    "research": 0-100,
                    "faculty_workload": 0-100
                }},
                "strengths": ["List of strengths"],
                "gaps": ["List of compliance gaps"],
                "recommendations": ["Specific recommendations to improve"],
                "missing_constraints": ["Types of constraints that should be added"]
            }}
            
            Return ONLY the JSON object.
            """
            
            response = self.model.generate_content(prompt)
            
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
            
        except Exception as e:
            return self._rule_based_nep_validation(constraints)
    
    def _rule_based_nep_validation(self, constraints: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Rule-based NEP validation when AI is unavailable."""
        area_coverage = {
            "credit_system": False,
            "multidisciplinary": False,
            "assessment": False,
            "skill_development": False,
            "research": False,
            "faculty_workload": False
        }
        
        strengths = []
        gaps = []
        recommendations = []
        
        for constraint in constraints:
            constraint_type = constraint.get("type", "")
            nep_comp = constraint.get("nep_compliance", {})
            
            if constraint_type == "faculty_workload":
                area_coverage["faculty_workload"] = True
                params = constraint.get("parameters", {})
                max_hours = params.get("max_hours_per_week", 40)
                if max_hours <= 18:
                    strengths.append("Faculty workload limit aligns with NEP recommendations")
                else:
                    gaps.append(f"Faculty workload limit ({max_hours} hrs) exceeds NEP recommendation of 18 hrs")
                    recommendations.append("Reduce max_hours_per_week to 18 or less")
            
            if constraint_type == "room_type_requirement":
                area_coverage["skill_development"] = True
                strengths.append("Room type requirements support practical learning")
            
            if constraint_type == "nep_compliance":
                for area in nep_comp.get("nep_areas", []):
                    area_coverage[area] = True
        
        # Check for gaps
        for area, covered in area_coverage.items():
            if not covered:
                gaps.append(f"No constraints addressing NEP {area.replace('_', ' ').title()}")
                recommendations.append(f"Add constraints for {area.replace('_', ' ').title()}")
        
        # Calculate scores
        area_scores = {area: 100 if covered else 30 for area, covered in area_coverage.items()}
        overall_score = sum(area_scores.values()) / len(area_scores)
        
        compliance_level = "high" if overall_score >= 80 else "medium" if overall_score >= 60 else "low"
        
        return {
            "overall_score": round(overall_score),
            "compliance_level": compliance_level,
            "area_scores": area_scores,
            "strengths": strengths if strengths else ["Basic constraint structure in place"],
            "gaps": gaps if gaps else ["Some NEP areas may need more specific constraints"],
            "recommendations": recommendations if recommendations else ["Review constraints against NEP guidelines"],
            "missing_constraints": [area.replace("_", " ") for area, covered in area_coverage.items() if not covered]
        }
    
    async def optimize_constraint_set(self, constraints: List[Dict[str, Any]], 
                                       optimization_goals: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Optimize a set of constraints for better timetable generation.
        
        Args:
            constraints: Current set of constraints
            optimization_goals: Goals for optimization (e.g., minimize_conflicts, maximize_nep_compliance)
            
        Returns:
            Optimized constraint set with explanations
        """
        if not self.model:
            return self._rule_based_optimization(constraints, optimization_goals)
        
        try:
            prompt = f"""
            Optimize this set of scheduling constraints for better timetable generation.
            
            Current Constraints ({len(constraints)}):
            {json.dumps(constraints, indent=2)}
            
            Optimization Goals:
            {json.dumps(optimization_goals or {}, indent=2)}
            
            Tasks:
            1. Identify conflicting or redundant constraints
            2. Suggest priority adjustments
            3. Recommend new constraints to fill gaps
            4. Optimize for NEP 2020 compliance
            
            Return JSON:
            {{
                "optimized_constraints": [/* Modified constraints */],
                "removed_constraints": [/* IDs of removed constraints */],
                "added_constraints": [/* New suggested constraints */],
                "priority_adjustments": [/* Changes made */],
                "optimization_summary": "Description of changes",
                "expected_improvements": {{
                    "conflict_reduction": "estimated %",
                    "nep_compliance_increase": "estimated %",
                    "schedule_quality_improvement": "estimated %"
                }}
            }}
            
            Return ONLY the JSON object.
            """
            
            response = self.model.generate_content(prompt)
            
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            return json.loads(response_text.strip())
            
        except Exception as e:
            return self._rule_based_optimization(constraints, optimization_goals)
    
    def _rule_based_optimization(self, constraints: List[Dict[str, Any]], 
                                  optimization_goals: Dict[str, Any] = None) -> Dict[str, Any]:
        """Rule-based optimization when AI is unavailable."""
        optimized = []
        removed = []
        adjustments = []
        
        # Check for duplicate constraint types
        type_counts = {}
        for c in constraints:
            t = c.get("type", "unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        # Keep highest priority for duplicate types
        for constraint_type, count in type_counts.items():
            if count > 3:  # Too many of same type
                type_constraints = [c for c in constraints if c.get("type") == constraint_type]
                type_constraints.sort(key=lambda x: x.get("priority", 5), reverse=True)
                
                # Keep top 3
                for c in type_constraints[3:]:
                    removed.append(c.get("_id", c.get("id", "unknown")))
                    adjustments.append(f"Removed duplicate {constraint_type} constraint: {c.get('name', 'unnamed')}")
                
                optimized.extend(type_constraints[:3])
            else:
                optimized.extend([c for c in constraints if c.get("type") == constraint_type])
        
        # Ensure NEP compliance constraints exist
        has_nep = any(c.get("type") == "nep_compliance" for c in optimized)
        added = []
        
        if not has_nep and (optimization_goals or {}).get("nep_compliance", True):
            added.append({
                "name": "NEP 2020 Compliance",
                "type": "nep_compliance",
                "description": "Ensure timetable adheres to NEP 2020 guidelines",
                "parameters": {"compliance_type": "General", "requirement_details": {}},
                "priority": 8,
                "is_active": True
            })
            adjustments.append("Added NEP 2020 compliance constraint")
        
        return {
            "optimized_constraints": optimized,
            "removed_constraints": removed,
            "added_constraints": added,
            "priority_adjustments": adjustments,
            "optimization_summary": f"Optimized {len(constraints)} constraints: removed {len(removed)} duplicates, added {len(added)} new constraints",
            "expected_improvements": {
                "conflict_reduction": "15-20%",
                "nep_compliance_increase": "10-15%" if added else "0%",
                "schedule_quality_improvement": "10-15%"
            }
        }


# Singleton instance
constraint_creator = AIConstraintCreator()
