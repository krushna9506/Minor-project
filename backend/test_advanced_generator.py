#!/usr/bin/env python3
"""
Test script for the Advanced Timetable Generator
Tests the constraint-based scheduling algorithm with CSE AI & ML course requirements
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.timetable.advanced_generator import AdvancedTimetableGenerator
import json
from datetime import datetime

def test_advanced_generator():
    """Test the advanced timetable generator"""
    print("=" * 60)
    print("🧪 TESTING ADVANCED TIMETABLE GENERATOR")
    print("=" * 60)
    
    # Create generator instance
    generator = AdvancedTimetableGenerator()
    
    print("\n📋 Setting up CSE AI & ML course requirements...")
    generator.setup_cse_ai_ml_courses()
    
    print(f"✅ Configured {len(generator.courses)} courses:")
    for course in generator.courses:
        sessions = course.get_session_structure()
        session_str = " + ".join(f"{s}min" for s in sessions)
        print(f"   • {course.code}: {course.name} ({course.hours_per_week}h/week) -> {session_str}")
    
    print("\n🏢 Setting up groups and resources...")
    generator.setup_groups_and_resources()
    
    print(f"✅ Configured {len(generator.groups)} student groups:")
    for group in generator.groups:
        print(f"   • {group.name}: {group.size} students ({'subgroup' if group.is_subgroup else 'main group'})")
    
    print(f"✅ Configured {len(generator.rooms)} rooms:")
    for room in generator.rooms:
        room_type = "Lab" if room.is_lab else "Classroom"
        print(f"   • {room.name}: {room_type}, capacity {room.capacity}")
    
    print(f"✅ Configured {len(generator.faculty)} faculty members:")
    for faculty in generator.faculty:
        subjects = ", ".join(faculty.subjects)
        print(f"   • {faculty.name}: {subjects}")
    
    print("\n⚙️ Initializing occupancy tracking...")
    generator.initialize_occupancy_tracking()
    
    print("\n🚀 Starting timetable generation...")
    result = generator.generate_timetable()
    
    if result["success"]:
        print("✅ TIMETABLE GENERATION SUCCESSFUL!")
        print(f"📊 Optimization Score: {result['score']}")
        
        # Display statistics
        stats = result["statistics"]
        print(f"\n📈 STATISTICS:")
        print(f"   • Total Sessions: {stats['total_sessions']}")
        print(f"   • Lab Sessions: {stats['lab_sessions']}")
        print(f"   • Theory Sessions: {stats['theory_sessions']}")
        print(f"   • Total Hours: {stats['total_hours']:.1f}")
        
        if "sessions_per_day" in stats:
            print(f"   • Sessions per day: {stats['sessions_per_day']}")
        
        # Display validation results
        validation = result["validation"]
        print(f"\n✅ VALIDATION RESULTS:")
        print(f"   • Valid: {validation['valid']}")
        if validation["errors"]:
            print(f"   • Errors: {len(validation['errors'])}")
            for error in validation["errors"]:
                print(f"     - {error}")
        if validation["warnings"]:
            print(f"   • Warnings: {len(validation['warnings'])}")
            for warning in validation["warnings"]:
                print(f"     - {warning}")
        
        # Display the generated schedule
        print(f"\n📅 GENERATED SCHEDULE:")
        print("-" * 100)
        
        current_day = None
        for session in result["schedule"]:
            if session["day"] != current_day:
                current_day = session["day"]
                print(f"\n🗓️  {current_day.upper()}")
                print("-" * 50)
            
            duration_str = f"({session['duration_minutes']}min)"
            lab_indicator = "🔬 LAB" if session["is_lab"] else "📚"
            
            print(f"{session['start_time']}-{session['end_time']} {duration_str:>8} | "
                  f"{lab_indicator} {session['course_name']:<35} | "
                  f"{session['group']:<20} | {session['room']}")
        
        # Save detailed results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"timetable_test_result_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(result, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: {filename}")
        
    else:
        print(f"❌ TIMETABLE GENERATION FAILED: {result['error']}")
        return False
    
    return True

def test_time_slots():
    """Test time slot generation"""
    print("\n" + "=" * 60)
    print("🧪 TESTING TIME SLOT GENERATION")
    print("=" * 60)
    
    from app.services.timetable.advanced_generator import SchedulingRules
    
    # Test theory slots
    theory_slots = SchedulingRules.get_theory_slots()
    print(f"📚 Generated {len(theory_slots)} theory slots (50min each):")
    
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        day_slots = [slot for slot in theory_slots if slot.day == day]
        times = [f"{slot.start_time}-{slot.end_time}" for slot in day_slots]
        print(f"   {day}: {', '.join(times)}")
    
    # Test double period slots
    double_slots = SchedulingRules.get_double_period_slots()
    print(f"\n📖 Generated {len(double_slots)} double period slots (100min each):")
    
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        day_slots = [slot for slot in double_slots if slot.day == day]
        times = [f"{slot.start_time}-{slot.end_time}" for slot in day_slots]
        if times:
            print(f"   {day}: {', '.join(times)}")
    
    # Test lab slots
    lab_slots = SchedulingRules.get_lab_slots()
    print(f"\n🔬 Generated {len(lab_slots)} lab slots (180min each):")
    
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        day_slots = [slot for slot in lab_slots if slot.day == day]
        times = [f"{slot.start_time}-{slot.end_time}" for slot in day_slots]
        if times:
            print(f"   {day}: {', '.join(times)}")

def main():
    """Main test function"""
    print("🚀 Starting Advanced Timetable Generator Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Test 1: Time slot generation
        test_time_slots()
        
        # Test 2: Full timetable generation
        success = test_advanced_generator()
        
        if success:
            print(f"\n🎉 ALL TESTS PASSED! ✅")
            print("The advanced timetable generator is working correctly.")
        else:
            print(f"\n❌ TESTS FAILED!")
            return 1
            
    except Exception as e:
        print(f"\n💥 TEST CRASHED: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
