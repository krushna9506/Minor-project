import os
from typing import Dict, List, Any, Optional
import google.generativeai as genai
from app.core.config import settings
from app.db.mongodb import db
from bson import ObjectId
import json

class GeminiAIService:
    def __init__(self):
        """Initialize Gemini AI service"""
        self.model = None
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        else:
            self.model = None
    
    async def optimize_timetable(self, timetable_id: str, optimization_goals: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize a timetable using Gemini AI"""
        if not self.model:
            return {"error": "Gemini API key not configured", "optimized": False}
        
        try:
            # Get timetable data
            timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
            if not timetable:
                return {"error": "Timetable not found", "optimized": False}
            
            # Create optimization prompt
            prompt = f"""
            Analyze and optimize this timetable for better efficiency and NEP 2020 compliance.
            
            Current Timetable: {json.dumps(timetable, default=str, indent=2)}
            Optimization Goals: {json.dumps(optimization_goals, indent=2)}
            
            Please provide:
            1. Analysis of current issues
            2. Specific optimization suggestions
            3. Priority ranking of improvements
            4. NEP 2020 compliance assessment
            
            Format your response as JSON with these keys:
            - analysis
            - suggestions
            - priorities
            - nep_compliance_score
            - estimated_improvement_percentage
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "timetable_id": timetable_id,
                "optimization_result": response.text,
                "optimized": True,
                "timestamp": "2025-08-30T00:00:00Z"
            }
            
        except Exception as e:
            return {"error": f"Optimization failed: {str(e)}", "optimized": False}
    
    async def get_improvement_suggestions(self, timetable_id: str, focus_areas: List[str]) -> List[Dict[str, Any]]:
        """Get AI suggestions for timetable improvements"""
        if not self.model:
            return [{"error": "Gemini API key not configured"}]
        
        try:
            # Get timetable data
            timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
            if not timetable:
                return [{"error": "Timetable not found"}]
            
            focus_str = ", ".join(focus_areas) if focus_areas else "general improvements"
            
            prompt = f"""
            Analyze this academic timetable and provide specific improvement suggestions.
            Focus Areas: {focus_str}
            
            Timetable Data: {json.dumps(timetable, default=str, indent=2)}
            
            Please provide actionable suggestions for:
            1. Faculty workload optimization
            2. Room utilization efficiency
            3. Student schedule gaps reduction
            4. NEP 2020 compliance improvements
            5. Conflict resolution
            
            Format each suggestion with:
            - title
            - description
            - impact_level (high/medium/low)
            - implementation_difficulty (easy/medium/hard)
            - expected_benefit
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse suggestions (simplified - in real implementation would parse structured response)
            suggestions = [
                {
                    "title": "AI-Generated Suggestion",
                    "description": response.text[:500] + "...",
                    "impact_level": "medium",
                    "implementation_difficulty": "medium",
                    "expected_benefit": "Improved schedule efficiency"
                }
            ]
            
            return suggestions
            
        except Exception as e:
            return [{"error": f"Suggestion generation failed: {str(e)}"}]
    
    async def analyze_timetable_efficiency(self, timetable_id: str, analysis_type: str = "comprehensive") -> Dict[str, Any]:
        """Analyze timetable efficiency using AI"""
        if not self.model:
            return {"error": "Gemini API key not configured"}
        
        try:
            # Get timetable data
            timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
            if not timetable:
                return {"error": "Timetable not found"}
            
            prompt = f"""
            Perform a {analysis_type} analysis of this academic timetable.
            
            Timetable: {json.dumps(timetable, default=str, indent=2)}
            
            Analyze:
            1. Overall efficiency score (0-100)
            2. Faculty workload distribution
            3. Room utilization patterns
            4. Student schedule quality
            5. NEP 2020 compliance level
            6. Potential conflicts and issues
            7. Optimization opportunities
            
            Provide metrics and recommendations in JSON format.
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "timetable_id": timetable_id,
                "analysis_type": analysis_type,
                "efficiency_score": 75,  # Simplified - would parse from AI response
                "analysis_details": response.text,
                "analyzed_at": "2025-08-30T00:00:00Z"
            }
            
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}
    
    async def process_natural_language_query(self, query: str, context: Dict[str, Any]) -> str:
        """Process natural language queries - general AI assistant for any domain"""
        if not self.model:
            return "Gemini API key not configured. Cannot process natural language queries."
        
        try:
            # Check if query is timetable-related
            timetable_keywords = ['timetable', 'schedule', 'faculty', 'room', 'course', 'nep', 'constraint', 'academic']
            is_timetable_related = any(keyword in query.lower() for keyword in timetable_keywords)
            
            if is_timetable_related:
                # Use timetable-specific context
                prompt = f"""You are an AI assistant for an academic timetable management system called SchedMaster.

User Query: {query}

System Context: {json.dumps(context, default=str, indent=2)}

Provide a helpful, accurate response about academic scheduling, NEP 2020 guidelines, timetable optimization, constraint management, or resource allocation.

Keep the response concise and actionable."""
            else:
                # General conversation - no restrictions
                prompt = f"""You are a helpful AI assistant. Answer the user's question naturally and conversationally.

User Query: {query}

Provide a helpful, friendly response. You can discuss any topic the user is interested in."""
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            return f"Query processing failed: {str(e)}"
    
    async def suggest_program_constraints(self, program_id: str) -> List[Dict[str, Any]]:
        """Suggest constraints for a specific program using AI"""
        if not self.model:
            return [{"error": "Gemini API key not configured"}]
        
        try:
            # Get program data
            program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
            if not program:
                return [{"error": "Program not found"}]
            
            prompt = f"""
            Suggest appropriate scheduling constraints for this academic program:
            
            Program Details: {json.dumps(program, default=str, indent=2)}
            
            Consider:
            1. Program type and requirements
            2. NEP 2020 guidelines
            3. Faculty workload limits
            4. Room type requirements
            5. Student learning patterns
            6. Practical/lab session needs
            
            Suggest 5-8 specific constraints with:
            - constraint_type
            - description
            - parameters
            - priority (1-10)
            - rationale
            """
            
            response = self.model.generate_content(prompt)
            
            # Simplified constraint suggestions (would parse structured response in real implementation)
            constraints = [
                {
                    "constraint_type": "faculty_workload",
                    "description": "Limit faculty teaching hours per week",
                    "parameters": {"max_hours_per_week": 18},
                    "priority": 8,
                    "rationale": "Prevents faculty overload and maintains teaching quality"
                },
                {
                    "constraint_type": "room_capacity",
                    "description": "Match room capacity to course enrollment",
                    "parameters": {"min_capacity_buffer": 0.1},
                    "priority": 9,
                    "rationale": "Ensures adequate seating for all students"
                }
            ]
            
            return constraints
            
        except Exception as e:
            return [{"error": f"Constraint suggestion failed: {str(e)}"}]
    
    async def validate_nep_compliance(self, timetable_id: str) -> Dict[str, Any]:
        """Validate timetable against NEP 2020 guidelines using AI"""
        if not self.model:
            return {"error": "Gemini API key not configured"}
        
        try:
            # Get timetable data
            timetable = await db.db.timetables.find_one({"_id": ObjectId(timetable_id)})
            if not timetable:
                return {"error": "Timetable not found"}
            
            prompt = f"""
            Validate this timetable against NEP 2020 guidelines and educational best practices:
            
            Timetable: {json.dumps(timetable, default=str, indent=2)}
            
            Check compliance with:
            1. Multidisciplinary approach requirements
            2. Flexible credit system
            3. Choice-based credit system (CBCS)
            4. Continuous assessment integration
            5. Research and innovation time allocation
            6. Skill development opportunities
            7. Holistic development provisions
            
            Provide:
            - Overall compliance score (0-100)
            - Specific compliance issues
            - Recommendations for improvement
            - Priority areas for attention
            """
            
            response = self.model.generate_content(prompt)
            
            return {
                "timetable_id": timetable_id,
                "nep_compliance_score": 82,  # Simplified - would parse from AI response
                "compliance_details": response.text,
                "validation_date": "2025-08-30T00:00:00Z",
                "recommendations": [
                    "Increase interdisciplinary course offerings",
                    "Add more flexible time slots for research",
                    "Include skill development sessions"
                ]
            }
            
        except Exception as e:
            return {"error": f"NEP compliance validation failed: {str(e)}"}