#!/usr/bin/env python3
"""
Test script for AI Optimization endpoint
Tests both OpenAI and ML optimizer functionality
"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_ml_optimizer():
    """Test ML optimizer directly"""
    print("=" * 60)
    print("Testing ML Optimizer")
    print("=" * 60)
    
    try:
        from ml_optimizer import get_ml_optimizer
        
        ml_opt = get_ml_optimizer()
        print("✅ ML Optimizer initialized successfully")
        
        # Test terrain constraint analysis
        print("\n--- Testing Terrain Constraint Analysis ---")
        terrain_data = {
            "results": {
                "slope_analysis": {
                    "mean_slope": 12.5,
                    "max_slope": 28.3,
                    "min_slope": 1.2
                },
                "stats": {
                    "mean_elevation": 250.5,
                    "min_elevation": 200.0,
                    "max_elevation": 320.5
                },
                "flood_analysis": {
                    "flood_stats": {
                        "high_risk_area": 8.5,
                        "medium_risk_area": 15.2
                    }
                }
            }
        }
        
        constraints = ml_opt.analyze_terrain_constraints(terrain_data)
        print(f"✅ Terrain constraints calculated:")
        print(f"   - Slope constraint: {constraints['slope_constraint']:.3f}")
        print(f"   - Flood risk constraint: {constraints['flood_risk_constraint']:.3f}")
        print(f"   - Elevation constraint: {constraints['elevation_constraint']:.3f}")
        print(f"   - Buildability score: {constraints['buildability_score']:.3f}")
        
        # Test metric optimization
        print("\n--- Testing Metric Optimization ---")
        current_metrics = {
            "landUseEfficiency": 55.0,
            "connectivityIndex": 62.0,
            "greenSpaceCoverage": 18.0,
            "trafficFlowEfficiency": 58.0,
            "energyEfficiency": 52.0,
            "walkabilityScore": 48.0,
            "areaSqm": 125000
        }
        
        optimized = ml_opt.optimize_metrics(
            current_metrics, 
            focus="efficiency", 
            depth=75,
            terrain_constraints=constraints
        )
        
        print(f"✅ Metrics optimized:")
        for metric, value in optimized.items():
            if metric != "areaSqm":
                current = current_metrics.get(metric, 0)
                improvement = value - current
                print(f"   - {metric}: {current:.1f}% → {value:.1f}% (+{improvement:.1f}%)")
        
        # Test recommendation generation
        print("\n--- Testing Recommendation Generation ---")
        recommendations = ml_opt.generate_recommendations(
            current_metrics,
            optimized,
            "efficiency",
            terrain_data
        )
        
        print(f"✅ Generated {len(recommendations)} recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"\n   {i}. {rec['title']}")
            print(f"      Impact: {rec['impact']}, Category: {rec['category']}")
            print(f"      Improvement: {rec['estimatedImprovement']}")
            print(f"      Terrain insight: {rec.get('terrain_insight', 'N/A')[:80]}...")
        
        print("\n✅ All ML optimizer tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ ML optimizer test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_openai_availability():
    """Test OpenAI integration availability"""
    print("\n" + "=" * 60)
    print("Testing OpenAI Integration")
    print("=" * 60)
    
    try:
        import openai
        print("✅ OpenAI package installed")
        
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            print(f"✅ OpenAI API key found (length: {len(api_key)})")
            print(f"   Key starts with: {api_key[:7]}...")
            
            # Quick API test
            try:
                client = openai.OpenAI(api_key=api_key)
                # Test with a simple completion
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": "Say 'API working' if you can read this."}],
                    max_tokens=10
                )
                print(f"✅ OpenAI API test successful!")
                print(f"   Response: {response.choices[0].message.content}")
                return True
            except Exception as e:
                print(f"⚠️ OpenAI API test failed: {e}")
                print("   (API key may be invalid or expired)")
                return False
        else:
            print("⚠️ OpenAI API key NOT found in environment")
            print("   Set OPENAI_API_KEY in .env file to use OpenAI features")
            return False
            
    except ImportError:
        print("❌ OpenAI package not installed")
        print("   Run: pip install openai>=1.0.0")
        return False


def test_environment_setup():
    """Test environment configuration"""
    print("=" * 60)
    print("Testing Environment Setup")
    print("=" * 60)
    
    try:
        from dotenv import load_dotenv
        print("✅ python-dotenv installed")
        
        # Check if .env file exists
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            print(f"✅ .env file found at: {env_path}")
            load_dotenv(env_path)
        else:
            print(f"⚠️ .env file NOT found at: {env_path}")
            print("   Create .env file from .env.example")
        
        # Check example file
        example_path = os.path.join(os.path.dirname(__file__), '.env.example')
        if os.path.exists(example_path):
            print(f"✅ .env.example found at: {example_path}")
        else:
            print(f"⚠️ .env.example NOT found at: {example_path}")
        
        return True
        
    except ImportError:
        print("❌ python-dotenv not installed")
        print("   Run: pip install python-dotenv")
        return False


def test_dependencies():
    """Test required dependencies"""
    print("\n" + "=" * 60)
    print("Testing Dependencies")
    print("=" * 60)
    
    required = [
        ('numpy', 'NumPy'),
        ('sklearn', 'scikit-learn'),
        ('shapely', 'Shapely'),
        ('fastapi', 'FastAPI'),
    ]
    
    all_ok = True
    for module, name in required:
        try:
            __import__(module)
            print(f"✅ {name} installed")
        except ImportError:
            print(f"❌ {name} NOT installed")
            all_ok = False
    
    return all_ok


def main():
    """Run all tests"""
    print("\n" + "🚀 " * 30)
    print("AI OPTIMIZATION TEST SUITE")
    print("🚀 " * 30 + "\n")
    
    results = {
        "Environment Setup": test_environment_setup(),
        "Dependencies": test_dependencies(),
        "ML Optimizer": test_ml_optimizer(),
        "OpenAI Integration": test_openai_availability(),
    }
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! 🎉")
        print("=" * 60)
        print("\nYour AI Optimization system is ready to use!")
        print("\nNext steps:")
        print("1. Start the backend: uvicorn app.main:app --reload --port 8000")
        print("2. Test the endpoint from the frontend")
        print("3. Monitor logs for optimization method used (OpenAI/ML/Rule-based)")
    else:
        print("⚠️ SOME TESTS FAILED")
        print("=" * 60)
        print("\nPlease fix the failed tests before using the system.")
        print("Refer to AI_OPTIMIZATION_SETUP.md for setup instructions.")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

