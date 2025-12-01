"""
Automated PDF Report Generation for FYP Project
Supports comprehensive reports and individual analysis reports
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime
import rasterio
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Modular PDF report generator for terrain analysis and DEM data.
    Supports both comprehensive reports and individual analysis reports.
    """
    
    def __init__(self, output_dir="reports"):
        """
        Initialize the report generator.
        
        Args:
            output_dir: Directory to save generated reports
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.join(output_dir, "charts"), exist_ok=True)
        
        # Initialize styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Chart counter for unique filenames
        self.chart_counter = 0
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report."""
        # Only add styles if they don't already exist
        if 'CustomTitle' not in self.styles.byName:
            self.styles.add(ParagraphStyle(
                name='CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1a237e'),
                spaceAfter=30,
                alignment=TA_CENTER
            ))
        
        if 'SectionHeader' not in self.styles.byName:
            self.styles.add(ParagraphStyle(
                name='SectionHeader',
                parent=self.styles['Heading2'],
                fontSize=18,
                textColor=colors.HexColor('#283593'),
                spaceAfter=12,
                spaceBefore=20
            ))
        
        if 'SubsectionHeader' not in self.styles.byName:
            self.styles.add(ParagraphStyle(
                name='SubsectionHeader',
                parent=self.styles['Heading3'],
                fontSize=14,
                textColor=colors.HexColor('#3949ab'),
                spaceAfter=8,
                spaceBefore=12
            ))
        
        # BodyText might already exist in some reportlab versions, so use a different name
        if 'ReportBodyText' not in self.styles.byName:
            self.styles.add(ParagraphStyle(
                name='ReportBodyText',
                parent=self.styles['Normal'],
                fontSize=11,
                alignment=TA_JUSTIFY,
                spaceAfter=12
            ))
    
    def load_dem_data(self, dem_path):
        """
        Load DEM data from a GeoTIFF file.
        
        Args:
            dem_path: Path to the DEM GeoTIFF file
            
        Returns:
            tuple: (dem_array, transform, bounds, metadata)
        """
        try:
            with rasterio.open(dem_path) as src:
                dem_array = src.read(1)
                transform = src.transform
                bounds = src.bounds
                metadata = {
                    'crs': str(src.crs),
                    'width': src.width,
                    'height': src.height,
                    'nodata': src.nodata
                }
                
                logger.info(f"Loaded DEM: {dem_array.shape}, bounds: {bounds}")
                return dem_array, transform, bounds, metadata
        except Exception as e:
            logger.error(f"Error loading DEM data: {str(e)}")
            return None, None, None, None
    
    def load_analysis_data(self, analysis_path):
        """
        Load analysis results from JSON file.
        
        Args:
            analysis_path: Path to JSON file containing analysis results
            
        Returns:
            dict: Analysis data
        """
        try:
            with open(analysis_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded analysis data from {analysis_path}")
            return data
        except Exception as e:
            logger.error(f"Error loading analysis data: {str(e)}")
            return {}
    
    def generate_elevation_chart(self, dem_array, output_path):
        """
        Generate elevation distribution chart.
        
        Args:
            dem_array: DEM elevation array
            output_path: Path to save the chart
        """
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Histogram
            valid_data = dem_array[~np.isnan(dem_array)]
            ax1.hist(valid_data, bins=50, color='steelblue', edgecolor='black', alpha=0.7)
            ax1.set_xlabel('Elevation (meters)', fontsize=11)
            ax1.set_ylabel('Frequency', fontsize=11)
            ax1.set_title('Elevation Distribution', fontsize=12, fontweight='bold')
            ax1.grid(True, alpha=0.3)
            
            # Statistics box
            stats_text = f"Mean: {np.nanmean(valid_data):.2f} m\n"
            stats_text += f"Min: {np.nanmin(valid_data):.2f} m\n"
            stats_text += f"Max: {np.nanmax(valid_data):.2f} m\n"
            stats_text += f"Std Dev: {np.nanstd(valid_data):.2f} m"
            
            ax2.text(0.1, 0.5, stats_text, fontsize=11, 
                    verticalalignment='center', family='monospace',
                    bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
            ax2.axis('off')
            ax2.set_title('Elevation Statistics', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"Generated elevation chart: {output_path}")
        except Exception as e:
            logger.error(f"Error generating elevation chart: {str(e)}")
    
    def generate_slope_chart(self, slope_data, output_path):
        """
        Generate slope analysis chart.
        
        Args:
            slope_data: Slope analysis data dictionary
            output_path: Path to save the chart
        """
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Slope distribution pie chart
            if 'slope_distribution' in slope_data:
                categories = []
                percentages = []
                for cat, data in slope_data['slope_distribution'].items():
                    if isinstance(data, dict) and 'area_percentage' in data:
                        categories.append(cat.replace('_', ' ').title())
                        percentages.append(data['area_percentage'])
                    elif isinstance(data, (int, float)):
                        categories.append(cat.replace('_', ' ').title())
                        percentages.append(data)
                
                if percentages:
                    colors_list = plt.cm.Set3(np.linspace(0, 1, len(categories)))
                    ax1.pie(percentages, labels=categories, autopct='%1.1f%%', 
                           colors=colors_list, startangle=90)
                    ax1.set_title('Slope Category Distribution', fontsize=12, fontweight='bold')
            
            # Statistics
            stats_text = ""
            if 'mean_slope' in slope_data:
                stats_text += f"Mean Slope: {slope_data['mean_slope']:.2f}°\n"
            if 'max_slope' in slope_data:
                stats_text += f"Max Slope: {slope_data['max_slope']:.2f}°\n"
            if 'min_slope' in slope_data:
                stats_text += f"Min Slope: {slope_data['min_slope']:.2f}°\n"
            if 'std_slope' in slope_data:
                stats_text += f"Std Dev: {slope_data['std_slope']:.2f}°"
            
            ax2.text(0.1, 0.5, stats_text, fontsize=11,
                    verticalalignment='center', family='monospace',
                    bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.5))
            ax2.axis('off')
            ax2.set_title('Slope Statistics', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"Generated slope chart: {output_path}")
        except Exception as e:
            logger.error(f"Error generating slope chart: {str(e)}")
    
    def generate_flood_risk_chart(self, flood_data, output_path):
        """
        Generate flood risk analysis chart.
        
        Args:
            flood_data: Flood risk analysis data dictionary
            output_path: Path to save the chart
        """
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            if 'risk_statistics' in flood_data:
                stats = flood_data['risk_statistics']
                categories = ['High Risk', 'Medium Risk', 'Low Risk']
                percentages = [
                    stats.get('high_risk_area_percent', 0),
                    stats.get('medium_risk_area_percent', 0),
                    stats.get('low_risk_area_percent', 0)
                ]
                
                colors_list = ['#d32f2f', '#ff9800', '#4caf50']
                bars = ax.bar(categories, percentages, color=colors_list, edgecolor='black', alpha=0.7)
                
                # Add value labels on bars
                for bar, pct in zip(bars, percentages):
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height,
                           f'{pct:.1f}%', ha='center', va='bottom', fontweight='bold')
                
                ax.set_ylabel('Area Percentage (%)', fontsize=11)
                ax.set_title('Flood Risk Distribution', fontsize=12, fontweight='bold')
                ax.set_ylim(0, max(percentages) * 1.2 if percentages else 100)
                ax.grid(True, alpha=0.3, axis='y')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"Generated flood risk chart: {output_path}")
        except Exception as e:
            logger.error(f"Error generating flood risk chart: {str(e)}")
    
    def generate_erosion_chart(self, erosion_data, output_path):
        """
        Generate erosion analysis chart.
        
        Args:
            erosion_data: Erosion analysis data dictionary
            output_path: Path to save the chart
        """
        try:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Erosion risk categories
            if 'erosion_risk_categories' in erosion_data:
                categories = ['High', 'Medium', 'Low']
                percentages = [
                    erosion_data['erosion_risk_categories'].get('high_erosion_percent', 0),
                    erosion_data['erosion_risk_categories'].get('medium_erosion_percent', 0),
                    erosion_data['erosion_risk_categories'].get('low_erosion_percent', 0)
                ]
                
                colors_list = ['#c62828', '#ef6c00', '#66bb6a']
                ax1.bar(categories, percentages, color=colors_list, edgecolor='black', alpha=0.7)
                ax1.set_ylabel('Area Percentage (%)', fontsize=11)
                ax1.set_title('Erosion Risk Distribution', fontsize=12, fontweight='bold')
                ax1.grid(True, alpha=0.3, axis='y')
            
            # Soil loss statistics
            if 'annual_soil_loss' in erosion_data:
                stats = erosion_data['annual_soil_loss']
                stats_text = f"Mean: {stats.get('mean', 0):.2f} t/ha/year\n"
                stats_text += f"Max: {stats.get('max', 0):.2f} t/ha/year\n"
                stats_text += f"Min: {stats.get('min', 0):.2f} t/ha/year\n"
                stats_text += f"Median: {stats.get('median', 0):.2f} t/ha/year"
                
                ax2.text(0.1, 0.5, stats_text, fontsize=11,
                        verticalalignment='center', family='monospace',
                        bbox=dict(boxstyle='round', facecolor='peachpuff', alpha=0.5))
                ax2.axis('off')
                ax2.set_title('Annual Soil Loss', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"Generated erosion chart: {output_path}")
        except Exception as e:
            logger.error(f"Error generating erosion chart: {str(e)}")
    
    def generate_water_availability_chart(self, water_data, output_path):
        """
        Generate water availability analysis chart.
        
        Args:
            water_data: Water availability data dictionary
            output_path: Path to save the chart
        """
        try:
            fig, ax = plt.subplots(figsize=(10, 6))
            
            if 'water_availability_score' in water_data:
                score_data = water_data['water_availability_score']
                classification = score_data.get('classification', 'Unknown')
                
                # Create a visual representation
                metrics = []
                values = []
                
                if 'topographic_wetness_index' in water_data:
                    twi = water_data['topographic_wetness_index']
                    metrics.append('TWI Mean')
                    values.append(twi.get('mean', 0))
                
                if 'distance_to_water' in water_data:
                    dist = water_data['distance_to_water']
                    metrics.append('Avg Distance (m)')
                    values.append(dist.get('mean_meters', 0))
                
                if metrics:
                    bars = ax.bar(metrics, values, color='lightblue', edgecolor='black', alpha=0.7)
                    ax.set_ylabel('Value', fontsize=11)
                    ax.set_title(f'Water Availability Analysis\n{classification}', 
                               fontsize=12, fontweight='bold')
                    ax.grid(True, alpha=0.3, axis='y')
                    
                    # Add value labels
                    for bar, val in zip(bars, values):
                        height = bar.get_height()
                        ax.text(bar.get_x() + bar.get_width()/2., height,
                               f'{val:.2f}', ha='center', va='bottom', fontweight='bold')
            
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"Generated water availability chart: {output_path}")
        except Exception as e:
            logger.error(f"Error generating water availability chart: {str(e)}")
    
    def create_data_table(self, data_dict, title=""):
        """
        Create a formatted table from a dictionary.
        
        Args:
            data_dict: Dictionary of data to display
            title: Optional title for the table
            
        Returns:
            Table: ReportLab Table object
        """
        if not data_dict:
            return None
        
        # Flatten nested dictionaries
        rows = []
        for key, value in data_dict.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    rows.append([f"{key} - {sub_key}", self._format_value(sub_value)])
            else:
                rows.append([key.replace('_', ' ').title(), self._format_value(value)])
        
        if not rows:
            return None
        
        # Create table
        table_data = [['Metric', 'Value']] + rows
        table = Table(table_data, colWidths=[4*inch, 2*inch])
        
        # Style the table
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        return table
    
    def _format_value(self, value):
        """Format a value for display in the table."""
        if isinstance(value, float):
            return f"{value:.2f}"
        elif isinstance(value, (list, dict)):
            return str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
        else:
            return str(value)
    
    def add_project_summary(self, story, analysis_data, dem_metadata):
        """
        Add project summary section to the report.
        
        Args:
            story: List of report elements
            analysis_data: Analysis data dictionary
            dem_metadata: DEM metadata dictionary
        """
        story.append(Paragraph("Project Summary", self.styles['SectionHeader']))
        
        summary_text = f"""
        This report presents a comprehensive analysis of the Digital Elevation Model (DEM) data 
        for the project area. The analysis includes terrain characteristics, slope analysis, 
        flood risk assessment, erosion potential, and water availability evaluation.
        """
        
        story.append(Paragraph(summary_text.strip(), self.styles.get('ReportBodyText', self.styles['Normal'])))
        story.append(Spacer(1, 0.2*inch))
        
        # Project metadata table
        metadata_rows = [
            ['Analysis Date', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ]
        
        if dem_metadata:
            if 'width' in dem_metadata and 'height' in dem_metadata:
                metadata_rows.append(['DEM Resolution', f"{dem_metadata['width']} x {dem_metadata['height']} pixels"])
            if 'crs' in dem_metadata:
                metadata_rows.append(['Coordinate System', dem_metadata['crs']])
        
        if metadata_rows:
            metadata_table = Table(metadata_rows, colWidths=[3*inch, 3*inch])
            metadata_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5c6bc0')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            story.append(metadata_table)
        
        story.append(Spacer(1, 0.3*inch))
    
    def add_analysis_section(self, story, analysis_data, chart_dir):
        """
        Add analysis section with charts and data.
        
        Args:
            story: List of report elements
            analysis_data: Analysis data dictionary
            chart_dir: Directory containing generated charts
        """
        story.append(Paragraph("Analysis Results", self.styles['SectionHeader']))
        
        # Handle multiple polygons
        if 'polygons' in analysis_data and isinstance(analysis_data['polygons'], list):
            for idx, poly_data in enumerate(analysis_data['polygons']):
                poly_id = poly_data.get('polygon_id', idx + 1)
                poly_name = poly_data.get('polygon_info', {}).get('name', f'Polygon {poly_id}')
                
                story.append(Paragraph(f"Polygon {poly_id}: {poly_name}", self.styles['SubsectionHeader']))
                
                # Extract terrain analysis from this polygon
                terrain_data = poly_data.get('terrain_analysis', {})
                if terrain_data and terrain_data.get('results'):
                    terrain_results = terrain_data['results']
                    if isinstance(terrain_results, dict):
                        self._add_terrain_analysis_subsection(story, terrain_results, chart_dir, poly_id)
                
                # Add other analysis types for this polygon
                self._add_other_analysis_subsections(story, poly_data, chart_dir)
                
                story.append(Spacer(1, 0.4*inch))
        else:
            # Single polygon or legacy format
            # Elevation Analysis
            if 'elevation_stats' in analysis_data or 'stats' in analysis_data:
                story.append(Paragraph("Elevation Analysis", self.styles['SubsectionHeader']))
                elevation_chart_path = os.path.join(chart_dir, "elevation_chart.png")
                if os.path.exists(elevation_chart_path):
                    img = Image(elevation_chart_path, width=6*inch, height=2.5*inch)
                    story.append(img)
                    story.append(Spacer(1, 0.2*inch))
                
                elevation_stats = analysis_data.get('elevation_stats') or analysis_data.get('stats', {})
                elevation_table = self.create_data_table(elevation_stats)
                if elevation_table:
                    story.append(elevation_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Slope Analysis
            if 'slope_analysis' in analysis_data:
                story.append(Paragraph("Slope Analysis", self.styles['SubsectionHeader']))
                slope_chart_path = os.path.join(chart_dir, "slope_chart.png")
                if os.path.exists(slope_chart_path):
                    img = Image(slope_chart_path, width=6*inch, height=2.5*inch)
                    story.append(img)
                    story.append(Spacer(1, 0.2*inch))
                
                slope_table = self.create_data_table(analysis_data['slope_analysis'])
                if slope_table:
                    story.append(slope_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Flood Risk Analysis
            if 'flood_risk_analysis' in analysis_data:
                story.append(Paragraph("Flood Risk Analysis", self.styles['SubsectionHeader']))
                flood_chart_path = os.path.join(chart_dir, "flood_risk_chart.png")
                if os.path.exists(flood_chart_path):
                    img = Image(flood_chart_path, width=5*inch, height=3*inch)
                    story.append(img)
                    story.append(Spacer(1, 0.2*inch))
                
                flood_table = self.create_data_table(analysis_data['flood_risk_analysis'].get('risk_statistics', {}))
                if flood_table:
                    story.append(flood_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Erosion Analysis
            if 'erosion_analysis' in analysis_data:
                story.append(Paragraph("Erosion Analysis", self.styles['SubsectionHeader']))
                erosion_chart_path = os.path.join(chart_dir, "erosion_chart.png")
                if os.path.exists(erosion_chart_path):
                    img = Image(erosion_chart_path, width=6*inch, height=2.5*inch)
                    story.append(img)
                    story.append(Spacer(1, 0.2*inch))
                
                erosion_table = self.create_data_table(analysis_data['erosion_analysis'])
                if erosion_table:
                    story.append(erosion_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Water Availability Analysis
            if 'water_availability' in analysis_data:
                story.append(Paragraph("Water Availability Analysis", self.styles['SubsectionHeader']))
                water_chart_path = os.path.join(chart_dir, "water_availability_chart.png")
                if os.path.exists(water_chart_path):
                    img = Image(water_chart_path, width=5*inch, height=3*inch)
                    story.append(img)
                    story.append(Spacer(1, 0.2*inch))
                
                water_table = self.create_data_table(analysis_data['water_availability'])
                if water_table:
                    story.append(water_table)
                story.append(Spacer(1, 0.3*inch))
            
            # Add other analysis types
            self._add_other_analysis_subsections(story, analysis_data, chart_dir)
    
    def _add_terrain_analysis_subsection(self, story, terrain_results, chart_dir, poly_id=None):
        """Add terrain analysis subsection from results."""
        prefix = f"Polygon {poly_id} - " if poly_id else ""
        
        # Elevation
        if 'elevation_stats' in terrain_results or 'stats' in terrain_results:
            story.append(Paragraph(f"{prefix}Elevation Analysis", self.styles['SubsectionHeader']))
            elevation_stats = terrain_results.get('elevation_stats') or terrain_results.get('stats', {})
            elevation_table = self.create_data_table(elevation_stats)
            if elevation_table:
                story.append(elevation_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Slope
        if 'slope_analysis' in terrain_results:
            story.append(Paragraph(f"{prefix}Slope Analysis", self.styles['SubsectionHeader']))
            slope_table = self.create_data_table(terrain_results['slope_analysis'])
            if slope_table:
                story.append(slope_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Flood Risk
        if 'flood_risk_analysis' in terrain_results:
            story.append(Paragraph(f"{prefix}Flood Risk Analysis", self.styles['SubsectionHeader']))
            flood_data = terrain_results['flood_risk_analysis']
            flood_table = self.create_data_table(flood_data.get('risk_statistics', {}))
            if flood_table:
                story.append(flood_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Erosion
        if 'erosion_analysis' in terrain_results:
            story.append(Paragraph(f"{prefix}Erosion Analysis", self.styles['SubsectionHeader']))
            erosion_table = self.create_data_table(terrain_results['erosion_analysis'])
            if erosion_table:
                story.append(erosion_table)
            story.append(Spacer(1, 0.2*inch))
        
        # Water Availability
        if 'water_availability' in terrain_results:
            story.append(Paragraph(f"{prefix}Water Availability Analysis", self.styles['SubsectionHeader']))
            water_table = self.create_data_table(terrain_results['water_availability'])
            if water_table:
                story.append(water_table)
            story.append(Spacer(1, 0.2*inch))
    
    def _add_other_analysis_subsections(self, story, data, chart_dir):
        """Add other analysis types (land suitability, zoning, etc.)."""
        # Land Suitability
        if 'land_suitability' in data:
            story.append(Paragraph("Land Suitability Analysis", self.styles['SubsectionHeader']))
            suitability_data = data['land_suitability']
            if isinstance(suitability_data, dict):
                if 'results' in suitability_data:
                    suitability_table = self.create_data_table(suitability_data['results'])
                    if suitability_table:
                        story.append(suitability_table)
                else:
                    suitability_table = self.create_data_table(suitability_data)
                    if suitability_table:
                        story.append(suitability_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Zoning Results
        if 'zoning_results' in data:
            story.append(Paragraph("Zoning Analysis", self.styles['SubsectionHeader']))
            zoning_data = data['zoning_results']
            if isinstance(zoning_data, dict):
                if 'zoning_result' in zoning_data:
                    zoning_table = self.create_data_table(zoning_data['zoning_result'])
                    if zoning_table:
                        story.append(zoning_table)
                elif 'results' in zoning_data:
                    zoning_table = self.create_data_table(zoning_data['results'])
                    if zoning_table:
                        story.append(zoning_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Optimization Zoning
        if 'optimization_zoning' in data:
            story.append(Paragraph("Optimization Zoning Analysis", self.styles['SubsectionHeader']))
            opt_zoning_data = data['optimization_zoning']
            if isinstance(opt_zoning_data, dict):
                # Add zone statistics
                if 'zone_statistics' in opt_zoning_data:
                    zone_stats_table = self.create_data_table(opt_zoning_data['zone_statistics'])
                    if zone_stats_table:
                        story.append(zone_stats_table)
                
                # Add land use distribution
                if 'land_use_distribution' in opt_zoning_data:
                    story.append(Paragraph("Land Use Distribution", self.styles['SubsectionHeader']))
                    land_use_table = self.create_data_table(opt_zoning_data['land_use_distribution'])
                    if land_use_table:
                        story.append(land_use_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Road Networks
        if 'road_networks' in data:
            story.append(Paragraph("Road Network Analysis", self.styles['SubsectionHeader']))
            road_data = data['road_networks']
            if isinstance(road_data, dict):
                if 'road_network' in road_data:
                    road_table = self.create_data_table(road_data['road_network'])
                    if road_table:
                        story.append(road_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Parcels
        if 'parcels' in data:
            story.append(Paragraph("Parcel Subdivision Analysis", self.styles['SubsectionHeader']))
            parcel_data = data['parcels']
            if isinstance(parcel_data, dict):
                if 'parcel_data' in parcel_data:
                    parcel_table = self.create_data_table(parcel_data['parcel_data'])
                    if parcel_table:
                        story.append(parcel_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Green Space Statistics
        if 'green_space_statistics' in data:
            story.append(Paragraph("Green Space Statistics", self.styles['SubsectionHeader']))
            green_space_data = data['green_space_statistics']
            green_space_table = self.create_data_table(green_space_data)
            if green_space_table:
                story.append(green_space_table)
            story.append(Spacer(1, 0.3*inch))
    
    def extract_warnings_and_recommendations(self, analysis_data):
        """
        Extract all warnings and recommendations from analysis data.
        
        Args:
            analysis_data: Analysis data dictionary
            
        Returns:
            tuple: (warnings, recommendations) lists
        """
        warnings = []
        recommendations = []
        
        # Flood risk warnings and recommendations
        if 'flood_risk_analysis' in analysis_data:
            flood_data = analysis_data['flood_risk_analysis']
            
            # Get recommendations from analysis
            if 'recommendations' in flood_data and isinstance(flood_data['recommendations'], list):
                for rec in flood_data['recommendations']:
                    if '⚠️' in rec or 'HIGH' in rec.upper() or 'MODERATE' in rec.upper():
                        warnings.append(rec)
                    else:
                        recommendations.append(rec)
            
            # Generate warnings from risk statistics
            if 'risk_statistics' in flood_data:
                stats = flood_data['risk_statistics']
                high_risk = stats.get('high_risk_area_percent', 0)
                medium_risk = stats.get('medium_risk_area_percent', 0)
                mean_risk = stats.get('mean_risk_score', 0)
                
                if high_risk > 30:
                    warnings.append(f"⚠️ CRITICAL: {high_risk:.1f}% of area at HIGH flood risk. Immediate action required.")
                    recommendations.append("Implement flood barriers or retention ponds in high-risk zones.")
                    recommendations.append("Avoid placing critical infrastructure in high-risk areas.")
                elif high_risk > 15:
                    warnings.append(f"⚠️ WARNING: {high_risk:.1f}% of area at high flood risk. Drainage improvements needed.")
                    recommendations.append("Implement proper stormwater management systems.")
                elif medium_risk > 30:
                    warnings.append(f"⚠️ CAUTION: {medium_risk:.1f}% of area at moderate flood risk.")
                    recommendations.append("Monitor drainage channels and maintain clear water flow paths.")
                
                if mean_risk > 2.0:
                    recommendations.append("Consider elevation requirements for new construction.")
        
        # Erosion warnings and recommendations
        if 'erosion_analysis' in analysis_data:
            erosion_data = analysis_data['erosion_analysis']
            
            # Get recommendations from analysis
            if 'recommendations' in erosion_data and isinstance(erosion_data['recommendations'], list):
                for rec in erosion_data['recommendations']:
                    if '⚠️' in rec or 'HIGH' in rec.upper():
                        warnings.append(rec)
                    else:
                        recommendations.append(rec)
            
            # Generate warnings from soil loss data
            if 'annual_soil_loss' in erosion_data:
                loss_data = erosion_data['annual_soil_loss']
                mean_loss = loss_data.get('mean', 0)
                max_loss = loss_data.get('max', 0)
                
                if mean_loss > 50:
                    warnings.append(f"⚠️ CRITICAL: High erosion risk - Mean annual soil loss: {mean_loss:.1f} t/ha/year")
                    recommendations.append("Implement terracing on slopes >30°.")
                    recommendations.append("Use erosion control blankets and vegetation cover.")
                elif mean_loss > 20:
                    warnings.append(f"⚠️ WARNING: Moderate erosion risk - Mean annual soil loss: {mean_loss:.1f} t/ha/year")
                    recommendations.append("Implement conservation practices.")
                    recommendations.append("Consider contour farming or strip cropping.")
                else:
                    recommendations.append("✅ Erosion risk is within acceptable limits.")
            
            # Check slope-related erosion
            if 'erosion_risk_categories' in erosion_data:
                risk_cats = erosion_data['erosion_risk_categories']
                high_erosion = risk_cats.get('high_erosion_percent', 0)
                if high_erosion > 20:
                    warnings.append(f"⚠️ {high_erosion:.1f}% of area has high erosion risk - requires special attention.")
                    recommendations.append("Consider slope stabilization measures.")
        
        # Slope warnings
        if 'slope_analysis' in analysis_data:
            slope_data = analysis_data['slope_analysis']
            mean_slope = slope_data.get('mean_slope', 0)
            max_slope = slope_data.get('max_slope', 0)
            
            if mean_slope > 30:
                warnings.append(f"⚠️ STEEP TERRAIN: Average slope {mean_slope:.1f}° exceeds 30°. Special construction required.")
                recommendations.append("Use specialized construction techniques for steep terrain.")
                recommendations.append("Consider terracing or slope modification.")
            elif mean_slope > 15:
                recommendations.append(f"ℹ️ Moderate slopes ({mean_slope:.1f}°) - Standard construction practices apply.")
            
            if max_slope > 50:
                warnings.append(f"⚠️ EXTREME SLOPES: Maximum slope {max_slope:.1f}° detected. Avoid construction in these areas.")
            
            # Check slope distribution
            if 'slope_distribution' in slope_data:
                dist = slope_data['slope_distribution']
                very_steep = dist.get('very_steep', {})
                if isinstance(very_steep, dict):
                    very_steep_pct = very_steep.get('area_percentage', 0)
                    if very_steep_pct > 10:
                        warnings.append(f"⚠️ {very_steep_pct:.1f}% of area has very steep slopes (>50°).")
        
        # Water availability warnings
        if 'water_availability' in analysis_data:
            water_data = analysis_data['water_availability']
            if 'water_availability_score' in water_data:
                score_data = water_data['water_availability_score']
                classification = score_data.get('classification', '')
                mean_score = score_data.get('mean', 0)
                
                if 'Low' in classification or 'Very Low' in classification or mean_score < 0.3:
                    warnings.append(f"⚠️ LIMITED WATER AVAILABILITY: {classification}")
                    recommendations.append("Consider water management strategies and storage systems.")
                    recommendations.append("Plan for alternative water sources.")
                elif mean_score < 0.5:
                    recommendations.append(f"ℹ️ Moderate water availability - {classification}")
        
        # Terrain ruggedness warnings
        if 'terrain_ruggedness' in analysis_data:
            rugged_data = analysis_data['terrain_ruggedness']
            classification = rugged_data.get('classification', '')
            if 'Rugged' in classification or 'Very Rugged' in classification:
                warnings.append(f"⚠️ RUGGED TERRAIN: {classification}")
                recommendations.append("Plan for increased construction costs due to terrain complexity.")
                recommendations.append("Consider access routes and equipment requirements.")
        
        # Aspect analysis recommendations
        if 'aspect_analysis' in analysis_data:
            aspect_data = analysis_data['aspect_analysis']
            dominant_aspect = aspect_data.get('dominant_aspect', '')
            if dominant_aspect:
                if dominant_aspect == 'South':
                    recommendations.append("✅ South-facing slopes provide good solar exposure for development.")
                elif dominant_aspect == 'North':
                    recommendations.append("ℹ️ North-facing slopes may have limited solar exposure.")
        
        return warnings, recommendations
    
    def add_observations_section(self, story, analysis_data):
        """
        Add observations, warnings, and recommendations section.
        
        Args:
            story: List of report elements
            analysis_data: Analysis data dictionary
        """
        story.append(Paragraph("Warnings and Recommendations", self.styles['SectionHeader']))
        
        warnings, recommendations = self.extract_warnings_and_recommendations(analysis_data)
        
        # Add warnings section
        if warnings:
            story.append(Paragraph("Critical Warnings", self.styles['SubsectionHeader']))
            for warning in warnings:
                # Use red color for warnings
                warning_para = Paragraph(f"• {warning}", self.styles.get('ReportBodyText', self.styles['Normal']))
                story.append(warning_para)
            story.append(Spacer(1, 0.2*inch))
        
        # Add recommendations section
        if recommendations:
            story.append(Paragraph("Recommendations", self.styles['SubsectionHeader']))
            for rec in recommendations:
                story.append(Paragraph(f"• {rec}", self.styles.get('ReportBodyText', self.styles['Normal'])))
            story.append(Spacer(1, 0.2*inch))
        
        # If no warnings or recommendations, add a positive note
        if not warnings and not recommendations:
            story.append(Paragraph("✅ No critical issues identified. The terrain appears suitable for development.", 
                                 self.styles.get('ReportBodyText', self.styles['Normal'])))
        
        story.append(Spacer(1, 0.3*inch))
    
    def add_final_plan_section(self, story, analysis_data):
        """
        Add final plan and conclusions section.
        
        Args:
            story: List of report elements
            analysis_data: Analysis data dictionary
        """
        story.append(Paragraph("Final Plan and Conclusions", self.styles['SectionHeader']))
        
        conclusion_text = """
        Based on the comprehensive terrain analysis, the following conclusions can be drawn:
        
        The DEM data analysis provides valuable insights into the terrain characteristics, 
        enabling informed decision-making for land use planning and development. The analysis 
        covers elevation patterns, slope distributions, flood risk assessment, erosion 
        potential, and water availability.
        
        It is recommended that these findings be used in conjunction with additional site-specific 
        studies to develop a comprehensive development plan that accounts for all terrain 
        characteristics and environmental factors.
        """
        
        story.append(Paragraph(conclusion_text.strip(), self.styles.get('ReportBodyText', self.styles['Normal'])))
        story.append(Spacer(1, 0.3*inch))
    
    def generate_comprehensive_report(self, dem_path=None, analysis_data_path=None, analysis_data=None, 
                                     output_filename="FYP_Report.pdf"):
        """
        Generate a comprehensive PDF report.
        
        Args:
            dem_path: Optional path to DEM GeoTIFF file
            analysis_data_path: Optional path to JSON file with analysis data
            analysis_data: Optional analysis data dictionary (overrides file path)
            output_filename: Output PDF filename
            
        Returns:
            str: Path to generated PDF file
        """
        logger.info("Generating comprehensive PDF report...")
        
        # Load DEM data (optional)
        dem_array = None
        dem_metadata = None
        if dem_path and os.path.exists(dem_path):
            dem_array, transform, bounds, dem_metadata = self.load_dem_data(dem_path)
            if dem_array is None:
                logger.warning("Failed to load DEM data, continuing without DEM-based charts")
        
        # Load analysis data
        if analysis_data is None:
            if analysis_data_path:
                analysis_data = self.load_analysis_data(analysis_data_path)
            else:
                # Try to find analysis data in output directory
                analysis_data = {}
        
        # Create chart directory for this report
        chart_dir = os.path.join(self.output_dir, "charts", 
                                 datetime.now().strftime("%Y%m%d_%H%M%S"))
        os.makedirs(chart_dir, exist_ok=True)
        
        # Generate charts
        if dem_array is not None:
            self.generate_elevation_chart(dem_array, 
                                         os.path.join(chart_dir, "elevation_chart.png"))
        elif 'elevation_stats' in analysis_data:
            # Create a simple elevation chart from statistics if DEM not available
            logger.info("DEM not available, skipping elevation chart")
        
        if 'slope_analysis' in analysis_data:
            self.generate_slope_chart(analysis_data['slope_analysis'],
                                   os.path.join(chart_dir, "slope_chart.png"))
        
        if 'flood_risk_analysis' in analysis_data:
            self.generate_flood_risk_chart(analysis_data['flood_risk_analysis'],
                                          os.path.join(chart_dir, "flood_risk_chart.png"))
        
        if 'erosion_analysis' in analysis_data:
            self.generate_erosion_chart(analysis_data['erosion_analysis'],
                                     os.path.join(chart_dir, "erosion_chart.png"))
        
        if 'water_availability' in analysis_data:
            self.generate_water_availability_chart(analysis_data['water_availability'],
                                                  os.path.join(chart_dir, "water_availability_chart.png"))
        
        # Create PDF
        output_path = os.path.join(self.output_dir, output_filename)
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        story = []
        
        # Title page
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph("Terrain Analysis Report", self.styles['CustomTitle']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", 
                             self.styles['Normal']))
        story.append(PageBreak())
        
        # Add sections
        self.add_project_summary(story, analysis_data, dem_metadata)
        self.add_analysis_section(story, analysis_data, chart_dir)
        self.add_observations_section(story, analysis_data)
        self.add_final_plan_section(story, analysis_data)
        
        # Build PDF
        doc.build(story)
        logger.info(f"Comprehensive report generated: {output_path}")
        
        return output_path
    
    def generate_individual_analysis_report(self, analysis_type, analysis_data, 
                                           dem_path=None, output_filename=None):
        """
        Generate a report for a specific analysis type.
        
        Args:
            analysis_type: Type of analysis ('elevation', 'slope', 'flood', 'erosion', 'water')
            analysis_data: Analysis data dictionary
            dem_path: Optional path to DEM file for elevation analysis
            output_filename: Optional output filename
            
        Returns:
            str: Path to generated PDF file
        """
        logger.info(f"Generating individual report for {analysis_type} analysis...")
        
        if output_filename is None:
            output_filename = f"FYP_Report_{analysis_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Create chart directory
        chart_dir = os.path.join(self.output_dir, "charts", 
                                 datetime.now().strftime("%Y%m%d_%H%M%S"))
        os.makedirs(chart_dir, exist_ok=True)
        
        # Generate appropriate chart
        dem_array = None
        if dem_path:
            dem_array, _, _, _ = self.load_dem_data(dem_path)
        
        if analysis_type == 'elevation' and dem_array is not None:
            self.generate_elevation_chart(dem_array,
                                         os.path.join(chart_dir, "elevation_chart.png"))
        elif analysis_type == 'slope' and 'slope_analysis' in analysis_data:
            self.generate_slope_chart(analysis_data['slope_analysis'],
                                    os.path.join(chart_dir, "slope_chart.png"))
        elif analysis_type == 'flood' and 'flood_risk_analysis' in analysis_data:
            self.generate_flood_risk_chart(analysis_data['flood_risk_analysis'],
                                         os.path.join(chart_dir, "flood_risk_chart.png"))
        elif analysis_type == 'erosion' and 'erosion_analysis' in analysis_data:
            self.generate_erosion_chart(analysis_data['erosion_analysis'],
                                      os.path.join(chart_dir, "erosion_chart.png"))
        elif analysis_type == 'water' and 'water_availability' in analysis_data:
            self.generate_water_availability_chart(analysis_data['water_availability'],
                                                 os.path.join(chart_dir, "water_availability_chart.png"))
        
        # Create PDF
        output_path = os.path.join(self.output_dir, output_filename)
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        story = []
        
        # Title
        story.append(Spacer(1, 1*inch))
        title = f"{analysis_type.replace('_', ' ').title()} Analysis Report"
        story.append(Paragraph(title, self.styles['CustomTitle']))
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", 
                             self.styles['Normal']))
        story.append(PageBreak())
        
        # Analysis section
        story.append(Paragraph(f"{analysis_type.replace('_', ' ').title()} Analysis", 
                             self.styles['SectionHeader']))
        
        # Add chart if available
        chart_path = os.path.join(chart_dir, f"{analysis_type}_chart.png")
        if not os.path.exists(chart_path):
            # Try alternative names
            chart_files = {
                'elevation': 'elevation_chart.png',
                'slope': 'slope_chart.png',
                'flood': 'flood_risk_chart.png',
                'erosion': 'erosion_chart.png',
                'water': 'water_availability_chart.png'
            }
            chart_path = os.path.join(chart_dir, chart_files.get(analysis_type, ''))
        
        if os.path.exists(chart_path):
            img = Image(chart_path, width=6*inch, height=3*inch)
            story.append(img)
            story.append(Spacer(1, 0.2*inch))
        
        # Add data table
        data_key_map = {
            'elevation': 'elevation_stats',
            'slope': 'slope_analysis',
            'flood': 'flood_risk_analysis',
            'erosion': 'erosion_analysis',
            'water': 'water_availability'
        }
        
        data_key = data_key_map.get(analysis_type)
        if data_key and data_key in analysis_data:
            table = self.create_data_table(analysis_data[data_key])
            if table:
                story.append(table)
        
        story.append(Spacer(1, 0.3*inch))
        
        # Build PDF
        doc.build(story)
        logger.info(f"Individual {analysis_type} report generated: {output_path}")
        
        return output_path


def main():
    """
    Main function to demonstrate report generation.
    Can be used as a standalone script or imported as a module.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate PDF reports from DEM and analysis data')
    parser.add_argument('--dem', type=str, help='Path to DEM GeoTIFF file', 
                       default='data/dem_download.tif')
    parser.add_argument('--analysis', type=str, help='Path to analysis JSON file')
    parser.add_argument('--output', type=str, help='Output PDF filename', 
                       default='FYP_Report.pdf')
    parser.add_argument('--type', type=str, 
                       choices=['comprehensive', 'elevation', 'slope', 'flood', 'erosion', 'water'],
                       default='comprehensive', help='Type of report to generate')
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = ReportGenerator()
    
    # Load analysis data if provided
    analysis_data = None
    if args.analysis:
        analysis_data = generator.load_analysis_data(args.analysis)
    
    # Generate report
    if args.type == 'comprehensive':
        output_path = generator.generate_comprehensive_report(
            args.dem, 
            analysis_data_path=args.analysis,
            analysis_data=analysis_data,
            output_filename=args.output
        )
    else:
        if not analysis_data:
            print(f"Error: Analysis data required for {args.type} report")
            return
        
        output_path = generator.generate_individual_analysis_report(
            args.type,
            analysis_data,
            dem_path=args.dem if args.type == 'elevation' else None,
            output_filename=args.output
        )
    
    print(f"Report generated successfully: {output_path}")


if __name__ == "__main__":
    main()

