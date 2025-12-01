"""
PDF Report Generator for Final Year Project (FYP) Urban Planning System
Generates comprehensive PDF reports with terrain analysis, land suitability, and design data.
"""

import os
import io
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, Image as RLImage, KeepTogether, Frame, PageTemplate
    )
    from reportlab.pdfgen import canvas
    import pandas as pd
    REPORTLAB_AVAILABLE = True
except ImportError as e:
    logging.error(f"ReportLab import error: {e}")
    REPORTLAB_AVAILABLE = False

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generate comprehensive PDF reports for urban planning projects"""
    
    def __init__(self, output_dir: str = "reports"):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab, pandas, and jinja2 are required for PDF generation")
        
        self.output_dir = output_dir
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Subtitle style
        self.styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#3b82f6'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Section heading
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#059669'),
            spaceAfter=10,
            spaceBefore=10,
            fontName='Helvetica-Bold'
        ))
        
        # Body text
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))
    
    def load_analysis_data(self, analysis_data_path: str) -> Dict:
        """
        Load analysis data from a JSON file
        
        Args:
            analysis_data_path: Path to JSON file containing analysis data
            
        Returns:
            Dictionary containing analysis data
        """
        import json
        try:
            with open(analysis_data_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading analysis data from {analysis_data_path}: {e}")
            return {}
    
    def generate_comprehensive_report(self,
                                     dem_path: Optional[str] = None,
                                     analysis_data_path: Optional[str] = None,
                                     analysis_data: Optional[Dict] = None,
                                     output_filename: str = "FYP_Report.pdf",
                                     polygons_data: Optional[List[Dict]] = None,
                                     project_data: Optional[Dict] = None) -> str:
        """
        Generate a comprehensive PDF report with all available analyses
        
        Args:
            dem_path: Path to DEM file
            analysis_data_path: Path to JSON file with analysis data
            analysis_data: Dictionary containing analysis results
            output_filename: Name of output PDF file
            polygons_data: List of polygon analysis data
            project_data: Project information
            
        Returns:
            Path to generated PDF file
        """
        # Load analysis data from file if provided
        if analysis_data_path and not analysis_data:
            analysis_data = self.load_analysis_data(analysis_data_path)
        
        # Use the main generate_report method
        output_path = os.path.join(self.output_dir, output_filename)
        return self.generate_report(
            output_path=output_path,
            dem_path=dem_path,
            analysis_data=analysis_data,
            polygons_data=polygons_data,
            project_data=project_data,
            report_type="comprehensive"
        )
    
    def generate_individual_analysis_report(self,
                                           analysis_type: str,
                                           analysis_data: Dict,
                                           dem_path: Optional[str] = None,
                                           output_filename: str = None) -> str:
        """
        Generate a report for a specific analysis type
        
        Args:
            analysis_type: Type of analysis (elevation, slope, flood, etc.)
            analysis_data: Dictionary containing analysis results
            dem_path: Path to DEM file
            output_filename: Name of output PDF file
            
        Returns:
            Path to generated PDF file
        """
        if output_filename is None:
            output_filename = f"FYP_Report_{analysis_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        output_path = os.path.join(self.output_dir, output_filename)
        return self.generate_report(
            output_path=output_path,
            dem_path=dem_path,
            analysis_data=analysis_data,
            polygons_data=None,
            project_data=None,
            report_type=analysis_type
        )
    
    def generate_report(self, 
                       output_path: str,
                       dem_path: Optional[str] = None,
                       analysis_data: Optional[Dict] = None,
                       polygons_data: Optional[List[Dict]] = None,
                       project_data: Optional[Dict] = None,
                       report_type: str = "comprehensive") -> str:
        """
        Generate a comprehensive PDF report
        
        Args:
            output_path: Path where PDF will be saved
            dem_path: Path to DEM file
            analysis_data: Dictionary containing analysis results
            polygons_data: List of polygon analysis data
            project_data: Project information
            report_type: Type of report (comprehensive, elevation, slope, etc.)
        
        Returns:
            Path to generated PDF file
        """
        try:
            # Log what data we received
            logger.info(f"📄 Generating report with:")
            logger.info(f"   - Polygons data: {len(polygons_data) if polygons_data else 0} polygon(s)")
            logger.info(f"   - Analysis data: {bool(analysis_data)}")
            logger.info(f"   - Project data: {bool(project_data)}")
            if polygons_data:
                for i, p in enumerate(polygons_data):
                    logger.info(f"   - Polygon {i+1}: has terrain={bool(p.get('terrain_analysis'))}, suitability={bool(p.get('land_suitability'))}, zoning={bool(p.get('zoning'))}")
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
            
            # Create PDF document
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Build story (content)
            story = []
            
            # Add cover page
            story.extend(self._create_cover_page(project_data, report_type))
            story.append(PageBreak())
            
            # Add executive summary
            story.extend(self._create_executive_summary(analysis_data, polygons_data, project_data))
            story.append(PageBreak())
            
            # Add table of contents
            story.extend(self._create_table_of_contents(report_type))
            story.append(PageBreak())
            
            # Add report sections based on type
            if report_type == "comprehensive" or report_type == "terrain":
                story.extend(self._create_terrain_section(analysis_data, polygons_data))
                story.append(PageBreak())
            
            if report_type == "comprehensive" or report_type == "land_suitability":
                story.extend(self._create_suitability_section(analysis_data, polygons_data))
                story.append(PageBreak())
            
            if report_type == "comprehensive" or report_type == "zoning":
                story.extend(self._create_zoning_section(analysis_data, polygons_data))
                story.append(PageBreak())
            
            if report_type == "comprehensive" or report_type == "design":
                story.extend(self._create_design_section(analysis_data, polygons_data))
                story.append(PageBreak())
            
            # Add recommendations
            story.extend(self._create_recommendations_section(analysis_data, polygons_data))
            story.append(PageBreak())
            
            # Add appendix
            story.extend(self._create_appendix(dem_path, project_data))
            
            # Build PDF
            doc.build(story, onFirstPage=self._add_page_number, onLaterPages=self._add_page_number)
            
            logger.info(f"✅ PDF report generated successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating PDF report: {str(e)}")
            raise
    
    def _create_cover_page(self, project_data: Optional[Dict], report_type: str) -> List:
        """Create report cover page"""
        story = []
        
        # Add spacer
        story.append(Spacer(1, 2*inch))
        
        # Title
        title = Paragraph("Urban Planning Analysis Report", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Subtitle
        subtitle_text = self._get_report_type_name(report_type)
        subtitle = Paragraph(subtitle_text, self.styles['CustomSubtitle'])
        story.append(subtitle)
        story.append(Spacer(1, 0.5*inch))
        
        # Project information
        if project_data:
            project_info = [
                f"<b>Project:</b> {project_data.get('title', 'N/A')}",
                f"<b>Location:</b> {project_data.get('location', 'Not specified')}"
            ]
            # Only add type if it exists
            if project_data.get('type'):
                project_info.append(f"<b>Type:</b> {project_data.get('type')}")
            
            project_info.append(f"<b>Status:</b> {project_data.get('status', 'In Progress')}")
            
            # Add description if available
            if project_data.get('description'):
                project_info.append(f"<b>Description:</b> {project_data.get('description')}")
            
            for info in project_info:
                p = Paragraph(info, self.styles['CustomBody'])
                story.append(p)
                story.append(Spacer(1, 0.1*inch))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Generation date
        date_text = f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        date_para = Paragraph(date_text, self.styles['CustomBody'])
        story.append(date_para)
        
        return story
    
    def _create_executive_summary(self, analysis_data: Optional[Dict], 
                                  polygons_data: Optional[List[Dict]], 
                                  project_data: Optional[Dict]) -> List:
        """Create executive summary section"""
        story = []
        
        # Section heading
        heading = Paragraph("Executive Summary", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary text
        summary_text = """
        This report provides a comprehensive analysis of the urban planning project, 
        including terrain analysis, land suitability assessment, zoning evaluation, 
        and design recommendations. The analysis is based on Digital Elevation Model (DEM) 
        data and advanced geospatial analysis techniques.
        """
        summary = Paragraph(summary_text, self.styles['CustomBody'])
        story.append(summary)
        story.append(Spacer(1, 0.2*inch))
        
        # Key statistics
        if polygons_data and len(polygons_data) > 0:
            story.append(Paragraph("<b>Key Statistics:</b>", self.styles['SectionHeading']))
            story.append(Spacer(1, 0.1*inch))
            
            stats_data = self._extract_key_statistics(analysis_data, polygons_data)
            if stats_data:
                stats_table = self._create_statistics_table(stats_data)
                story.append(stats_table)
        
        return story
    
    def _create_table_of_contents(self, report_type: str) -> List:
        """Create table of contents"""
        story = []
        
        heading = Paragraph("Table of Contents", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.3*inch))
        
        sections = [
            "1. Executive Summary",
            "2. Terrain Analysis",
            "3. Land Suitability Assessment",
            "4. Zoning Analysis",
            "5. Design Elements",
            "6. Recommendations",
            "7. Appendix"
        ]
        
        for section in sections:
            p = Paragraph(section, self.styles['CustomBody'])
            story.append(p)
            story.append(Spacer(1, 0.1*inch))
        
        return story
    
    def _create_terrain_section(self, analysis_data: Optional[Dict], 
                               polygons_data: Optional[List[Dict]]) -> List:
        """Create terrain analysis section"""
        story = []
        
        heading = Paragraph("Terrain Analysis", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        intro_text = """
        The terrain analysis examines the topographic characteristics of the project area, 
        including elevation, slope, aspect, and potential hazards such as flooding and erosion.
        """
        story.append(Paragraph(intro_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        # Process polygon data
        has_any_terrain_data = False
        if polygons_data and len(polygons_data) > 0:
            for i, polygon_data in enumerate(polygons_data):
                polygon_id = polygon_data.get('polygon_id', i+1)
                story.append(Paragraph(f"<b>Area {i+1} (Polygon ID: {polygon_id})</b>", self.styles['SectionHeading']))
                
                terrain_data = polygon_data.get('terrain_analysis', {})
                if terrain_data:
                    has_any_terrain_data = True
                    # Elevation statistics
                    elevation_stats = terrain_data.get('elevation_stats', {})
                    if elevation_stats:
                        story.append(Paragraph("<b>Elevation Statistics:</b>", self.styles['CustomBody']))
                        elev_table = self._create_stats_table(elevation_stats, "Elevation (m)")
                        story.append(elev_table)
                        story.append(Spacer(1, 0.1*inch))
                    
                    # Slope statistics
                    slope_stats = terrain_data.get('slope_stats', {})
                    if slope_stats:
                        story.append(Paragraph("<b>Slope Statistics:</b>", self.styles['CustomBody']))
                        slope_table = self._create_stats_table(slope_stats, "Slope (°)")
                        story.append(slope_table)
                        story.append(Spacer(1, 0.1*inch))
                    
                    # Hazard analysis
                    flood_risk = terrain_data.get('flood_risk', {})
                    erosion_risk = terrain_data.get('erosion_risk', {})
                    
                    if flood_risk or erosion_risk:
                        story.append(Paragraph("<b>Hazard Assessment:</b>", self.styles['CustomBody']))
                        hazard_table = self._create_hazard_table(flood_risk, erosion_risk)
                        story.append(hazard_table)
                else:
                    story.append(Paragraph(f"<i>No terrain analysis data available for this area. Please run terrain analysis in the application.</i>", self.styles['CustomBody']))
                
                story.append(Spacer(1, 0.2*inch))
            
            if not has_any_terrain_data:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Note:</b> No terrain analysis has been performed yet. Run terrain analysis from the Analysis menu to populate this section.", self.styles['CustomBody']))
        else:
            story.append(Paragraph("No areas selected for analysis. Please select project areas and run terrain analysis to generate data.", self.styles['CustomBody']))
        
        return story
    
    def _create_suitability_section(self, analysis_data: Optional[Dict], 
                                   polygons_data: Optional[List[Dict]]) -> List:
        """Create land suitability section"""
        story = []
        
        heading = Paragraph("Land Suitability Assessment", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        intro_text = """
        Land suitability analysis evaluates the appropriateness of different areas 
        for various land uses based on terrain characteristics, constraints, and requirements.
        """
        story.append(Paragraph(intro_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        has_any_suitability_data = False
        if polygons_data and len(polygons_data) > 0:
            for i, polygon_data in enumerate(polygons_data):
                polygon_id = polygon_data.get('polygon_id', i+1)
                story.append(Paragraph(f"<b>Area {i+1} (Polygon ID: {polygon_id})</b>", self.styles['SectionHeading']))
                
                suitability_data = polygon_data.get('land_suitability', {})
                if suitability_data:
                    has_any_suitability_data = True
                    # Suitability scores
                    scores = suitability_data.get('suitability_scores', {})
                    if scores:
                        story.append(Paragraph("<b>Suitability Scores:</b>", self.styles['CustomBody']))
                        scores_table = self._create_suitability_scores_table(scores)
                        story.append(scores_table)
                else:
                    story.append(Paragraph(f"<i>No land suitability data available for this area. Please run suitability analysis in the application.</i>", self.styles['CustomBody']))
                
                story.append(Spacer(1, 0.2*inch))
            
            if not has_any_suitability_data:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Note:</b> No land suitability analysis has been performed yet. Run suitability analysis from the Analysis menu to populate this section.", self.styles['CustomBody']))
        else:
            story.append(Paragraph("No areas selected for analysis. Please select project areas and run land suitability analysis to generate data.", self.styles['CustomBody']))
        
        return story
    
    def _create_zoning_section(self, analysis_data: Optional[Dict], 
                              polygons_data: Optional[List[Dict]]) -> List:
        """Create zoning analysis section"""
        story = []
        
        heading = Paragraph("Zoning Analysis", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        intro_text = """
        Zoning analysis examines the distribution and organization of different land use zones 
        within the project area, ensuring optimal allocation of resources and compliance with planning standards.
        """
        story.append(Paragraph(intro_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        has_any_zoning_data = False
        if polygons_data and len(polygons_data) > 0:
            for i, polygon_data in enumerate(polygons_data):
                polygon_id = polygon_data.get('polygon_id', i+1)
                story.append(Paragraph(f"<b>Area {i+1} (Polygon ID: {polygon_id})</b>", self.styles['SectionHeading']))
                
                zoning_data = polygon_data.get('zoning', {})
                if zoning_data:
                    has_any_zoning_data = True
                    zone_distribution = zoning_data.get('zone_distribution', {})
                    if zone_distribution:
                        story.append(Paragraph("<b>Zone Distribution:</b>", self.styles['CustomBody']))
                        zone_table = self._create_zone_distribution_table(zone_distribution)
                        story.append(zone_table)
                else:
                    story.append(Paragraph(f"<i>No zoning data available for this area. Please run zoning analysis in the application.</i>", self.styles['CustomBody']))
                
                story.append(Spacer(1, 0.2*inch))
            
            if not has_any_zoning_data:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Note:</b> No zoning analysis has been performed yet. Run zoning analysis from the Analysis menu to populate this section.", self.styles['CustomBody']))
        else:
            story.append(Paragraph("No areas selected for analysis. Please select project areas and run zoning analysis to generate data.", self.styles['CustomBody']))
        
        return story
    
    def _create_design_section(self, analysis_data: Optional[Dict], 
                              polygons_data: Optional[List[Dict]]) -> List:
        """Create design elements section"""
        story = []
        
        heading = Paragraph("Design Elements", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        intro_text = """
        This section details the design elements including buildings, roads, parcels, 
        green spaces, and infrastructure components planned for the project area.
        """
        story.append(Paragraph(intro_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        if analysis_data:
            design_data = analysis_data.get('design', {})
            if design_data:
                # Buildings
                buildings = design_data.get('buildings', {})
                if buildings and buildings.get('count', 0) > 0:
                    story.append(Paragraph("<b>Buildings:</b>", self.styles['SectionHeading']))
                    story.append(Paragraph(f"Total Count: {buildings.get('count', 0)}", self.styles['CustomBody']))
                    story.append(Paragraph(f"Total Area: {buildings.get('totalArea', 0):.2f} m²", self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
                
                # Roads
                roads = design_data.get('roads', {})
                if roads and roads.get('count', 0) > 0:
                    story.append(Paragraph("<b>Roads:</b>", self.styles['SectionHeading']))
                    story.append(Paragraph(f"Total Count: {roads.get('count', 0)}", self.styles['CustomBody']))
                    story.append(Paragraph(f"Total Length: {roads.get('totalLength', 0):.2f} m", self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
                
                # Parcels
                parcels = design_data.get('parcels', {})
                if parcels and parcels.get('count', 0) > 0:
                    story.append(Paragraph("<b>Parcels:</b>", self.styles['SectionHeading']))
                    story.append(Paragraph(f"Total Count: {parcels.get('count', 0)}", self.styles['CustomBody']))
                    story.append(Paragraph(f"Total Area: {parcels.get('totalArea', 0):.2f} m²", self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
                
                # Green Spaces
                green_spaces = design_data.get('greenSpaces', {})
                if green_spaces and green_spaces.get('count', 0) > 0:
                    story.append(Paragraph("<b>Green Spaces:</b>", self.styles['SectionHeading']))
                    story.append(Paragraph(f"Total Count: {green_spaces.get('count', 0)}", self.styles['CustomBody']))
                    story.append(Paragraph(f"Total Area: {green_spaces.get('totalArea', 0):.2f} m²", self.styles['CustomBody']))
                    story.append(Spacer(1, 0.1*inch))
        else:
            story.append(Paragraph("No design data available.", self.styles['CustomBody']))
        
        return story
    
    def _create_recommendations_section(self, analysis_data: Optional[Dict], 
                                       polygons_data: Optional[List[Dict]]) -> List:
        """Create recommendations section"""
        story = []
        
        heading = Paragraph("Recommendations", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        recommendations = [
            "1. <b>Terrain Management:</b> Implement proper drainage systems in low-lying areas to mitigate flood risks.",
            "2. <b>Slope Stabilization:</b> Consider terracing or retaining walls for areas with steep slopes (>30°).",
            "3. <b>Land Use Optimization:</b> Allocate land uses according to suitability scores to maximize efficiency.",
            "4. <b>Green Infrastructure:</b> Integrate green spaces throughout the development for environmental benefits.",
            "5. <b>Transportation Network:</b> Ensure road networks provide adequate connectivity and emergency access.",
            "6. <b>Sustainable Development:</b> Incorporate sustainable design principles and renewable energy solutions.",
            "7. <b>Risk Mitigation:</b> Address identified hazards (flooding, erosion) in the design phase.",
            "8. <b>Monitoring:</b> Establish ongoing monitoring systems for environmental and structural performance."
        ]
        
        for rec in recommendations:
            p = Paragraph(rec, self.styles['CustomBody'])
            story.append(p)
            story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _create_appendix(self, dem_path: Optional[str], project_data: Optional[Dict]) -> List:
        """Create appendix section"""
        story = []
        
        heading = Paragraph("Appendix", self.styles['CustomTitle'])
        story.append(heading)
        story.append(Spacer(1, 0.2*inch))
        
        # Technical information
        story.append(Paragraph("<b>A. Technical Information</b>", self.styles['SectionHeading']))
        
        tech_info = [
            f"<b>DEM Data Source:</b> {dem_path if dem_path else 'N/A'}",
            f"<b>Analysis Software:</b> FYP Urban Planning System v1.0",
            f"<b>Coordinate System:</b> WGS84 (EPSG:4326)",
            f"<b>Report Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        ]
        
        for info in tech_info:
            p = Paragraph(info, self.styles['CustomBody'])
            story.append(p)
            story.append(Spacer(1, 0.1*inch))
        
        # Glossary
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("<b>B. Glossary</b>", self.styles['SectionHeading']))
        
        glossary = [
            "<b>DEM:</b> Digital Elevation Model - a 3D representation of terrain surface",
            "<b>Slope:</b> The steepness or degree of incline of a surface",
            "<b>Aspect:</b> The compass direction that a slope faces",
            "<b>Flood Risk:</b> Probability of flooding based on elevation and drainage",
            "<b>Erosion Risk:</b> Susceptibility to soil erosion based on slope and land cover",
            "<b>Land Suitability:</b> Appropriateness of land for specific uses",
            "<b>Zoning:</b> Division of land into zones for different uses"
        ]
        
        for term in glossary:
            p = Paragraph(term, self.styles['CustomBody'])
            story.append(p)
            story.append(Spacer(1, 0.1*inch))
        
        return story
    
    def _create_stats_table(self, stats: Dict, unit: str) -> Table:
        """Create a statistics table"""
        data = [
            ['Metric', 'Value'],
            ['Minimum', f"{stats.get('min', 0):.2f} {unit}"],
            ['Maximum', f"{stats.get('max', 0):.2f} {unit}"],
            ['Mean', f"{stats.get('mean', 0):.2f} {unit}"],
            ['Median', f"{stats.get('median', 0):.2f} {unit}"],
            ['Std Dev', f"{stats.get('std', 0):.2f} {unit}"]
        ]
        
        table = Table(data, colWidths=[2*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _create_statistics_table(self, stats_data: List) -> Table:
        """Create key statistics table"""
        data = [['Metric', 'Value']] + stats_data
        
        table = Table(data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightblue),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        
        return table
    
    def _create_hazard_table(self, flood_risk: Dict, erosion_risk: Dict) -> Table:
        """Create hazard assessment table"""
        data = [
            ['Hazard Type', 'Risk Level', 'Affected Area'],
            ['Flood Risk', flood_risk.get('risk_level', 'N/A'), f"{flood_risk.get('affected_area_pct', 0):.1f}%"],
            ['Erosion Risk', erosion_risk.get('risk_level', 'N/A'), f"{erosion_risk.get('affected_area_pct', 0):.1f}%"]
        ]
        
        table = Table(data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightpink),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _create_suitability_scores_table(self, scores: Dict) -> Table:
        """Create land suitability scores table"""
        data = [['Land Use', 'Suitability Score']]
        
        for land_use, score in scores.items():
            data.append([land_use.replace('_', ' ').title(), f"{score:.2f}"])
        
        table = Table(data, colWidths=[2.5*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _create_zone_distribution_table(self, zone_dist: Dict) -> Table:
        """Create zone distribution table"""
        data = [['Zone Type', 'Area (m²)', 'Percentage']]
        
        total_area = sum(zone_dist.values())
        for zone_type, area in zone_dist.items():
            percentage = (area / total_area * 100) if total_area > 0 else 0
            data.append([zone_type.replace('_', ' ').title(), f"{area:.2f}", f"{percentage:.1f}%"])
        
        table = Table(data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b5cf6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lavender),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _extract_key_statistics(self, analysis_data: Optional[Dict], 
                               polygons_data: Optional[List[Dict]]) -> List:
        """Extract key statistics for executive summary"""
        stats = []
        
        if polygons_data and len(polygons_data) > 0:
            stats.append(['Number of Areas Analyzed', str(len(polygons_data))])
            
            # Count analyses
            terrain_count = sum(1 for p in polygons_data if p.get('terrain_analysis'))
            suitability_count = sum(1 for p in polygons_data if p.get('land_suitability'))
            
            stats.append(['Terrain Analyses', str(terrain_count)])
            stats.append(['Suitability Analyses', str(suitability_count)])
        
        if analysis_data:
            design = analysis_data.get('design', {})
            if design:
                stats.append(['Total Buildings', str(design.get('buildings', {}).get('count', 0))])
                stats.append(['Total Roads', str(design.get('roads', {}).get('count', 0))])
                stats.append(['Total Parcels', str(design.get('parcels', {}).get('count', 0))])
        
        return stats if stats else [['No data available', '-']]
    
    def _get_report_type_name(self, report_type: str) -> str:
        """Get human-readable report type name"""
        type_names = {
            'comprehensive': 'Comprehensive Analysis Report',
            'terrain': 'Terrain Analysis Report',
            'elevation': 'Elevation Analysis Report',
            'slope': 'Slope Analysis Report',
            'flood': 'Flood Risk Assessment Report',
            'erosion': 'Erosion Risk Assessment Report',
            'land_suitability': 'Land Suitability Report',
            'zoning': 'Zoning Analysis Report',
            'design': 'Design Elements Report'
        }
        return type_names.get(report_type, 'Analysis Report')
    
    def _add_page_number(self, canvas, doc):
        """Add page number to each page"""
        page_num = canvas.getPageNumber()
        text = f"Page {page_num}"
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.drawRightString(doc.pagesize[0] - 72, 30, text)
        canvas.restoreState()

