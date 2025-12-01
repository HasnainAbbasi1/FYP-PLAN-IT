"""
Quick script to verify all report generation dependencies are installed
"""
import sys

def check_imports():
    """Check if all required packages can be imported"""
    errors = []
    
    try:
        import reportlab
        print(f"✅ reportlab {reportlab.Version}")
    except ImportError as e:
        errors.append(f"❌ reportlab: {e}")
    
    try:
        import pandas
        print(f"✅ pandas {pandas.__version__}")
    except ImportError as e:
        errors.append(f"❌ pandas: {e}")
    
    try:
        import jinja2
        print(f"✅ jinja2 {jinja2.__version__}")
    except ImportError as e:
        errors.append(f"❌ jinja2: {e}")
    
    try:
        import matplotlib
        print(f"✅ matplotlib {matplotlib.__version__}")
    except ImportError as e:
        errors.append(f"❌ matplotlib: {e}")
    
    try:
        from generate_report import ReportGenerator
        print("✅ generate_report module imported successfully")
    except ImportError as e:
        errors.append(f"❌ generate_report: {e}")
    
    if errors:
        print("\n❌ Errors found:")
        for error in errors:
            print(f"  {error}")
        print(f"\nPython interpreter: {sys.executable}")
        print(f"Python path: {sys.path[:3]}...")
        return False
    else:
        print("\n✅ All dependencies are installed and working!")
        return True

if __name__ == "__main__":
    print("Checking report generation dependencies...")
    print(f"Python: {sys.version}")
    print(f"Python executable: {sys.executable}\n")
    
    success = check_imports()
    sys.exit(0 if success else 1)

