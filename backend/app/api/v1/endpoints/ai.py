import json
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.models.user import User
from app.services.auth import get_current_active_user
from app.services.ai.gemini import GeminiAIService
from app.services.ai.constraint_creator import constraint_creator
from app.db.mongodb import db
from bson import ObjectId

router = APIRouter()

class OptimizeRequest(BaseModel):
    timetable_id: str
    optimization_goals: Optional[Dict[str, Any]] = None

class SuggestionRequest(BaseModel):
    timetable_id: str
    focus_areas: Optional[list] = None

class AnalysisRequest(BaseModel):
    timetable_id: str
    analysis_type: str = "comprehensive"

class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class NaturalLanguageConstraintRequest(BaseModel):
    text: str = Field(..., description="Natural language description of the constraint")
    program_id: Optional[str] = Field(None, description="Optional program ID for context")

class ConstraintOptimizationRequest(BaseModel):
    constraints: List[Dict[str, Any]] = Field(..., description="List of constraints to optimize")
    optimization_goals: Optional[Dict[str, Any]] = Field(None, description="Optimization goals")

class NEPComplianceCheckRequest(BaseModel):
    constraints: List[Dict[str, Any]] = Field(..., description="List of constraints to validate")

class AIChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_history: Optional[List[Dict[str, str]]] = Field(None, description="Previous conversation")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

@router.post("/optimize")
async def optimize_timetable(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Use AI to optimize an existing timetable. Users can only optimize their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} optimizing timetable {request.timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(request.timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {request.timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        ai_service = GeminiAIService()
        optimization_result = await ai_service.optimize_timetable(
            request.timetable_id, 
            request.optimization_goals or {}
        )
        return optimization_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI optimization failed: {str(e)}")

@router.post("/suggest")
async def suggest_improvements(
    request: SuggestionRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get AI suggestions for timetable improvements. Users can only get suggestions for their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} getting suggestions for timetable {request.timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(request.timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {request.timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        ai_service = GeminiAIService()
        suggestions = await ai_service.get_improvement_suggestions(
            request.timetable_id,
            request.focus_areas or []
        )
        return {
            "timetable_id": request.timetable_id,
            "suggestions": suggestions,
            "generated_at": "2025-08-30T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI suggestion failed: {str(e)}")

@router.post("/analysis")
async def analyze_timetable(
    request: AnalysisRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    AI analysis of timetable efficiency and compliance. Users can only analyze their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} analyzing timetable {request.timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(request.timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {request.timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        ai_service = GeminiAIService()
        analysis = await ai_service.analyze_timetable_efficiency(
            request.timetable_id,
            request.analysis_type
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/query")
async def natural_language_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Process natural language queries about timetables and scheduling.
    """
    try:
        ai_service = GeminiAIService()
        response = await ai_service.process_natural_language_query(
            request.query,
            request.context or {}
        )
        return {
            "query": request.query,
            "response": response,
            "processed_at": "2025-08-30T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")

@router.get("/constraints/suggest/{program_id}")
async def suggest_constraints(
    program_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Get AI-suggested constraints for a specific program.
    """
    # Check if program exists
    program = await db.db.programs.find_one({"_id": ObjectId(program_id)})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    try:
        ai_service = GeminiAIService()
        suggested_constraints = await ai_service.suggest_program_constraints(program_id)
        return {
            "program_id": program_id,
            "suggested_constraints": suggested_constraints,
            "generated_at": "2025-08-30T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Constraint suggestion failed: {str(e)}")

@router.post("/validate-schedule")
async def validate_schedule_with_ai(
    timetable_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Use AI to validate schedule against NEP 2020 guidelines and best practices. Users can only validate their own timetables.
    """
    print(f"🔒 SECURITY: User {current_user.id} validating timetable {timetable_id}")
    
    # CRITICAL: Check if timetable exists AND belongs to current user
    timetable = await db.db.timetables.find_one({
        "_id": ObjectId(timetable_id),
        "created_by": ObjectId(str(current_user.id))
    })
    if not timetable:
        print(f"🔒 SECURITY: Timetable {timetable_id} not found or not accessible by user {current_user.id}")
        raise HTTPException(status_code=404, detail="Timetable not found")
    
    try:
        ai_service = GeminiAIService()
        validation_result = await ai_service.validate_nep_compliance(timetable_id)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI validation failed: {str(e)}")

@router.post("/constraints/parse-natural-language")
async def parse_natural_language_constraint(
    request: NaturalLanguageConstraintRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Parse natural language constraint text into structured constraint format using AI.
    """
    try:
        parsed_constraint = await constraint_creator.parse_natural_language_constraint(
            request.text, 
            request.program_id
        )
        return {
            "success": True,
            "parsed_constraint": parsed_constraint,
            "original_text": request.text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Constraint parsing failed: {str(e)}")

@router.post("/constraints/optimize-set")
async def optimize_constraint_set(
    request: ConstraintOptimizationRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Optimize a set of constraints using AI for better timetable generation.
    """
    try:
        optimization_result = await constraint_creator.optimize_constraint_set(
            request.constraints,
            request.optimization_goals
        )
        return {
            "success": True,
            "optimization_result": optimization_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Constraint optimization failed: {str(e)}")

@router.post("/constraints/check-nep-compliance")
async def check_constraints_nep_compliance(
    request: NEPComplianceCheckRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Validate a set of constraints against NEP 2020 guidelines.
    """
    try:
        compliance_report = await constraint_creator.validate_nep_compliance(request.constraints)
        return {
            "success": True,
            "compliance_report": compliance_report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NEP compliance check failed: {str(e)}")

@router.post("/chat")
async def ai_chat_assistant(
    request: AIChatRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    AI ChatBot for timetable and constraint assistance using Gemini.
    """
    if not constraint_creator.model:
        return {
            "response": "AI service is not configured. Please set up the Gemini API key.",
            "suggestions": []
        }
    
    try:
        # Build conversation context
        context_str = ""
        if request.context:
            context_str = f"\nContext: {json.dumps(request.context, indent=2)}"
        
        history_str = ""
        if request.conversation_history:
            history_str = "\nConversation History:\n"
            for msg in request.conversation_history[-5:]:  # Last 5 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_str += f"{role}: {content}\n"
        
        prompt = f"""You are an AI assistant for an academic timetable management system specializing in NEP 2020 compliance.

Your capabilities:
1. Help create and understand scheduling constraints
2. Explain NEP 2020 guidelines and requirements
3. Suggest timetable optimizations
4. Answer questions about faculty workload, room allocation, and student scheduling
5. Provide best practices for academic scheduling

User Message: {request.message}
{context_str}
{history_str}

Provide a helpful, accurate response. If the user is asking about constraints, explain:
- What the constraint does
- How it affects timetable generation
- Any NEP 2020 implications
- Best practices for implementation

If suggesting constraints, provide specific examples with parameters.

Keep responses concise but informative. Use bullet points for clarity when appropriate."""

        response = constraint_creator.model.generate_content(prompt)
        
        # Generate follow-up suggestions based on the conversation
        suggestions = []
        message_lower = request.message.lower()
        
        if any(kw in message_lower for kw in ["constraint", "rule", "limit"]):
            suggestions = [
                "Would you like me to suggest constraints for your program?",
                "I can help you check NEP compliance of your constraints.",
                "Type a constraint in natural language and I'll parse it for you."
            ]
        elif any(kw in message_lower for kw in ["nep", "2020", "policy", "compliance"]):
            suggestions = [
                "Would you like to know about NEP 2020 scheduling requirements?",
                "I can validate your timetable against NEP guidelines.",
                "Ask me about specific NEP areas like CBCS or multidisciplinary learning."
            ]
        elif any(kw in message_lower for kw in ["faculty", "teacher", "professor"]):
            suggestions = [
                "Would you like to set up faculty workload constraints?",
                "I can help optimize faculty schedules.",
                "Ask me about NEP faculty workload guidelines."
            ]
        elif any(kw in message_lower for kw in ["timetable", "schedule", "generate"]):
            suggestions = [
                "Would you like tips for better timetable generation?",
                "I can help analyze your existing timetable.",
                "Ask me about optimizing room utilization."
            ]
        else:
            suggestions = [
                "What would you like to know about academic scheduling?",
                "I can help with NEP 2020 compliance questions.",
                "Ask me to suggest constraints for your program."
            ]
        
        return {
            "response": response.text,
            "suggestions": suggestions[:3]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")
