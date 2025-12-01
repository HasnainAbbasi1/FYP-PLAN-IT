"""
Example usage of the PDF report generation module.
This script demonstrates how to generate reports programmatically.
"""

from generate_report import ReportGenerator
import json
import os

def example_comprehensive_report():
    """Example: Generate a comprehensive report."""
    print("Generating comprehensive report...")
    
    # Initialize generator
    generator = ReportGenerator(output_dir="reports")
    
    # Path to DEM file (adjust as needed)
    dem_path = "data/dem_download.tif"
    
    # Example analysis data (you can load from JSON file or use actual data)
    analysis_data = {
        "elevation_stats": {
            "mean": 150.5,
            "min": 100.0,
            "max": 200.0,
            "std": 25.3,
            "median": 148.0,
            "range": 100.0
        },
        "slope_analysis": {
            "mean_slope": 15.5,
            "max_slope": 45.0,
            "min_slope": 2.0,
            "std_slope": 8.2,
            "slope_distribution": {
                "nearly_level": {"area_percentage": 30.0, "pixel_count": 1000},
                "gently_sloping": {"area_percentage": 40.0, "pixel_count": 1300},
                "moderately_sloping": {"area_percentage": 20.0, "pixel_count": 650},
                "strongly_sloping": {"area_percentage": 10.0, "pixel_count": 330}
            }
        },
        "flood_risk_analysis": {
            "risk_statistics": {
                "high_risk_area_percent": 15.0,
                "medium_risk_area_percent": 25.0,
                "low_risk_area_percent": 60.0,
                "mean_risk_score": 1.2,
                "max_risk_score": 3.0
            },
            "recommendations": [
                "⚠️ MODERATE FLOOD RISK: 15-30% of area at risk. Implement drainage improvements.",
                "Ensure proper stormwater management systems."
            ]
        },
        "erosion_analysis": {
            "annual_soil_loss": {
                "mean": 25.5,
                "max": 50.0,
                "min": 5.0,
                "std": 12.3,
                "median": 22.0
            },
            "erosion_risk_categories": {
                "high_erosion_percent": 10.0,
                "medium_erosion_percent": 30.0,
                "low_erosion_percent": 60.0
            },
            "recommendations": [
                "⚠️ MODERATE EROSION: Implement conservation practices.",
                "Consider contour farming or strip cropping."
            ]
        },
        "water_availability": {
            "water_availability_score": {
                "mean": 0.65,
                "max": 0.95,
                "min": 0.25,
                "classification": "Medium - Good water availability"
            },
            "topographic_wetness_index": {
                "mean": 8.5,
                "max": 15.0,
                "min": 3.0,
                "std": 2.5
            },
            "distance_to_water": {
                "mean_meters": 250.0,
                "min_meters": 50.0,
                "max_meters": 800.0
            }
        }
    }
    
    # Check if DEM file exists
    if not os.path.exists(dem_path):
        print(f"Warning: DEM file not found at {dem_path}")
        print("Report will be generated without DEM-based charts.")
        dem_path = None
    
    try:
        # Generate comprehensive report
        output_path = generator.generate_comprehensive_report(
            dem_path=dem_path if dem_path and os.path.exists(dem_path) else None,
            analysis_data=analysis_data,
            output_filename="FYP_Report.pdf"
        )
        
        print(f"✅ Comprehensive report generated: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Error generating report: {str(e)}")
        return None


def example_individual_report():
    """Example: Generate an individual analysis report."""
    print("Generating individual flood risk report...")
    
    generator = ReportGenerator(output_dir="reports")
    
    # Analysis data for flood risk
    flood_analysis_data = {
        "flood_risk_analysis": {
            "risk_statistics": {
                "high_risk_area_percent": 20.0,
                "medium_risk_area_percent": 30.0,
                "low_risk_area_percent": 50.0,
                "mean_risk_score": 1.5,
                "max_risk_score": 3.0
            },
            "recommendations": [
                "⚠️ MODERATE FLOOD RISK: Implement drainage improvements.",
                "Ensure proper stormwater management systems."
            ]
        }
    }
    
    try:
        output_path = generator.generate_individual_analysis_report(
            analysis_type="flood",
            analysis_data=flood_analysis_data,
            output_filename="Flood_Risk_Report.pdf"
        )
        
        print(f"✅ Individual report generated: {output_path}")
        return output_path
    except Exception as e:
        print(f"❌ Error generating report: {str(e)}")
        return None


def example_load_from_json():
    """Example: Load analysis data from JSON file and generate report."""
    print("Loading analysis data from JSON and generating report...")
    
    generator = ReportGenerator(output_dir="reports")
    
    # Example: Load from JSON file (if you have one)
    json_path = "output/analysis_results.json"  # Adjust path as needed
    
    if os.path.exists(json_path):
        analysis_data = generator.load_analysis_data(json_path)
        
        output_path = generator.generate_comprehensive_report(
            dem_path="data/dem_download.tif",
            analysis_data=analysis_data,
            output_filename="FYP_Report_From_JSON.pdf"
        )
        
        print(f"✅ Report generated from JSON: {output_path}")
        return output_path
    else:
        print(f"⚠️ JSON file not found at {json_path}")
        print("Skipping JSON-based report generation.")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("PDF Report Generation Examples")
    print("=" * 60)
    print()
    
    # Example 1: Comprehensive report
    print("Example 1: Comprehensive Report")
    print("-" * 60)
    example_comprehensive_report()
    print()
    
    # Example 2: Individual report
    print("Example 2: Individual Analysis Report")
    print("-" * 60)
    example_individual_report()
    print()
    
    # Example 3: Load from JSON
    print("Example 3: Load from JSON File")
    print("-" * 60)
    example_load_from_json()
    print()
    
    print("=" * 60)
    print("Examples completed!")
    print("Check the 'reports' directory for generated PDF files.")
    print("=" * 60)

