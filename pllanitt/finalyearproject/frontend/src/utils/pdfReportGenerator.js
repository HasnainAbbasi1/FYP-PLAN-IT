import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Comprehensive PDF Report Generator
 * Generates professional PDF reports with all analysis data
 */
export class PDFReportGenerator {
  constructor(reportData) {
    this.reportData = reportData;
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    this.lineHeight = 7;
    this.sectionSpacing = 10;
  }

  /**
   * Generate the complete PDF report
   */
  async generate() {
    // Cover page
    this.addCoverPage();
    
    // Table of contents
    this.addTableOfContents();
    
    // Executive Summary
    if (this.reportData.sections?.executiveSummary) {
      this.addNewPage();
      this.addSectionTitle('Executive Summary', this.margin);
      this.currentY += 5;
      const summary = this.reportData.sections.executiveSummary;
      if (summary.overview) {
        this.addText(summary.overview, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
        this.currentY += 10;
      }
      if (summary.keyMetrics) {
        this.addSubsectionTitle('Key Metrics');
        const metrics = Object.entries(summary.keyMetrics).map(([key, value]) => [
          key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          String(value)
        ]);
        this.addTable(metrics, ['Metric', 'Value']);
      }
    }
    
    // Project Overview
    this.addNewPage();
    this.addProjectOverview();
    
    // Terrain Analysis
    if (this.reportData.sections?.terrainAnalysis) {
      this.addNewPage();
      this.addTerrainAnalysis(this.reportData.sections.terrainAnalysis);
    }
    
    // Land Suitability
    if (this.reportData.sections?.landSuitability) {
      this.addNewPage();
      this.addLandSuitability(this.reportData.sections.landSuitability);
    }
    
    // Zoning Analysis
    if (this.reportData.sections?.zoning) {
      this.addNewPage();
      this.addZoningAnalysis(this.reportData.sections.zoning);
    }
    
    // Optimization Zoning
    if (this.reportData.sections?.optimizationZoning) {
      this.addNewPage();
      this.addOptimizationZoning(this.reportData.sections.optimizationZoning);
    }
    
    // Road Network Design
    if (this.reportData.sections?.roadNetwork) {
      this.addNewPage();
      this.addRoadNetwork(this.reportData.sections.roadNetwork);
    }
    
    // Land Subdivision
    if (this.reportData.sections?.subdivision) {
      this.addNewPage();
      this.addSubdivision(this.reportData.sections.subdivision);
    }
    
    // Design Elements
    if (this.reportData.sections?.design) {
      this.addNewPage();
      this.addDesignElements(this.reportData.sections.design);
    }
    
    // Recommendations
    if (this.reportData.sections?.recommendations) {
      this.addNewPage();
      this.addRecommendations(this.reportData.sections.recommendations);
    }
    
    // Technical Appendix
    this.addNewPage();
    this.addTechnicalAppendix();
    
    return this.doc;
  }

  /**
   * Add cover page
   */
  addCoverPage() {
    this.doc.setFillColor(41, 128, 185);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('PLAN-it', this.pageWidth / 2, 60, { align: 'center' });
    
    this.doc.setFontSize(24);
    this.doc.text('Project Analysis Report', this.pageWidth / 2, 80, { align: 'center' });
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(this.reportData.projectTitle || 'Project Report', this.pageWidth / 2, 110, { align: 'center' });
    
    this.doc.setFontSize(12);
    this.doc.text(`Location: ${this.reportData.projectLocation || 'N/A'}`, this.pageWidth / 2, 130, { align: 'center' });
    this.doc.text(`Generated: ${new Date(this.reportData.generatedAt).toLocaleDateString()}`, this.pageWidth / 2, 145, { align: 'center' });
    
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Add table of contents
   */
  addTableOfContents() {
    this.addNewPage();
    this.addSectionTitle('Table of Contents', 20);
    this.currentY += 5;
    
    const sections = [
      { title: 'Executive Summary', page: 3 },
      { title: 'Project Overview', page: 4 },
      { title: 'Terrain Analysis', page: this.reportData.sections?.terrainAnalysis ? 5 : null },
      { title: 'Land Suitability Analysis', page: this.reportData.sections?.landSuitability ? 6 : null },
      { title: 'Zoning Analysis', page: this.reportData.sections?.zoning ? 7 : null },
      { title: 'Optimization Zoning', page: this.reportData.sections?.optimizationZoning ? 8 : null },
      { title: 'Road Network Design', page: this.reportData.sections?.roadNetwork ? 9 : null },
      { title: 'Land Subdivision', page: this.reportData.sections?.subdivision ? 10 : null },
      { title: 'Design Elements', page: this.reportData.sections?.design ? 11 : null },
      { title: 'Recommendations', page: this.reportData.sections?.recommendations ? 12 : null },
      { title: 'Technical Appendix', page: 13 }
    ].filter(s => s.page !== null);
    
    sections.forEach((section, index) => {
      if (this.currentY > this.pageHeight - 30) {
        this.addNewPage();
        this.currentY = this.margin;
      }
      this.doc.setFontSize(11);
      this.doc.text(section.title, this.margin, this.currentY);
      const dots = '.'.repeat(60);
      this.doc.text(dots, this.pageWidth - 60, this.currentY);
      this.doc.text(`Page ${section.page}`, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += this.lineHeight;
    });
  }

  /**
   * Add project overview section
   */
  addProjectOverview() {
    this.addSectionTitle('Project Overview', this.margin);
    this.currentY += 5;
    
    const overview = [
      ['Project Title', this.reportData.projectTitle || 'N/A'],
      ['Location', this.reportData.projectLocation || 'N/A'],
      ['Type', this.reportData.projectType || 'N/A'],
      ['Status', this.reportData.projectStatus || 'N/A'],
      ['Priority', this.reportData.projectPriority || 'N/A'],
      ['Progress', `${this.reportData.projectProgress || 0}%`],
      ['Area', `${this.reportData.area || 0} hectares`],
      ['Budget', this.reportData.projectBudget ? `$${parseFloat(this.reportData.projectBudget).toLocaleString()}` : 'Not specified'],
      ['Start Date', this.reportData.startDate ? new Date(this.reportData.startDate).toLocaleDateString() : 'N/A'],
      ['End Date', this.reportData.endDate ? new Date(this.reportData.endDate).toLocaleDateString() : 'N/A']
    ];
    
    this.addTable(overview, ['Property', 'Value']);
    
    if (this.reportData.projectDescription) {
      this.currentY += 5;
      this.addSubsectionTitle('Description');
      this.addText(this.reportData.projectDescription, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    }
  }

  /**
   * Add terrain analysis section
   */
  addTerrainAnalysis(terrainData) {
    this.addSectionTitle('Terrain Analysis', this.margin);
    this.currentY += 5;
    
    // Analysis Date
    if (terrainData.analysisDate) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Analysis Date: ${new Date(terrainData.analysisDate).toLocaleString()}`, this.margin, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 5;
    }
    
    // Elevation Statistics
    if (terrainData.elevation || terrainData.results?.elevation_stats) {
      const elevation = terrainData.elevation || terrainData.results?.elevation_stats || {};
      this.addSubsectionTitle('Elevation Statistics');
      const elevationData = [
        ['Mean Elevation', `${this.formatNumber(elevation.mean)} m`],
        ['Minimum Elevation', `${this.formatNumber(elevation.min)} m`],
        ['Maximum Elevation', `${this.formatNumber(elevation.max)} m`],
        ['Elevation Range', `${this.formatNumber(elevation.range)} m`],
        ['Standard Deviation', `${this.formatNumber(elevation.std)} m`],
        ['Median Elevation', `${this.formatNumber(elevation.median)} m`]
      ].filter(row => row[1] !== 'undefined m' && row[1] !== 'NaN m');
      this.addTable(elevationData, ['Metric', 'Value']);
    }
    
    // Slope Analysis
    if (terrainData.slope || terrainData.results?.slope_analysis) {
      const slope = terrainData.slope || terrainData.results?.slope_analysis || {};
      this.currentY += 5;
      this.addSubsectionTitle('Slope Analysis');
      const slopeData = [
        ['Mean Slope', `${this.formatNumber(slope.mean_slope)}°`],
        ['Maximum Slope', `${this.formatNumber(slope.max_slope)}°`],
        ['Minimum Slope', `${this.formatNumber(slope.min_slope)}°`],
        ['Standard Deviation', `${this.formatNumber(slope.std_slope)}°`]
      ].filter(row => row[1] !== 'undefined°' && row[1] !== 'NaN°');
      
      if (slopeData.length > 0) {
        this.addTable(slopeData, ['Metric', 'Value']);
      }
      
      // Slope Distribution
      if (slope.slope_distribution || slope.category_stats) {
        this.currentY += 5;
        this.addSubsectionTitle('Slope Distribution');
        const distribution = slope.slope_distribution || slope.category_stats || {};
        const distData = Object.entries(distribution).map(([key, value]) => {
          const name = value.name || key;
          const percentage = value.area_percentage || value.percentage || 0;
          return [name, `${this.formatNumber(percentage)}%`];
        });
        if (distData.length > 0) {
          this.addTable(distData, ['Category', 'Area Percentage']);
        }
      }
    }
    
    // Flood Risk Analysis
    if (terrainData.floodRisk || terrainData.results?.flood_risk_analysis) {
      const flood = terrainData.floodRisk || terrainData.results?.flood_risk_analysis || {};
      this.currentY += 5;
      this.addSubsectionTitle('Flood Risk Analysis');
      if (flood.flood_stats) {
        const floodData = [
          ['High Risk Area', `${this.formatNumber(flood.flood_stats.high_risk_area * 100)}%`],
          ['Medium Risk Area', `${this.formatNumber(flood.flood_stats.medium_risk_area * 100)}%`],
          ['Low Risk Area', `${this.formatNumber(flood.flood_stats.low_risk_area * 100)}%`],
          ['Flood Risk Score', this.formatNumber(flood.flood_risk_score)]
        ].filter(row => row[1] !== 'undefined%' && row[1] !== 'NaN%');
        if (floodData.length > 0) {
          this.addTable(floodData, ['Metric', 'Value']);
        }
      }
    }
    
    // Erosion Analysis
    if (terrainData.erosion || terrainData.results?.erosion_analysis) {
      const erosion = terrainData.erosion || terrainData.results?.erosion_analysis || {};
      this.currentY += 5;
      this.addSubsectionTitle('Erosion Analysis');
      if (erosion.erosion_stats) {
        const erosionData = [
          ['High Erosion Risk', `${this.formatNumber(erosion.erosion_stats.high_risk_area * 100)}%`],
          ['Mean Erosion Rate', `${this.formatNumber(erosion.erosion_stats.mean_erosion_rate)} tons/ha/year`],
          ['Erosion Risk Score', this.formatNumber(erosion.erosion_risk_score)]
        ].filter(row => row[1] !== 'undefined%' && row[1] !== 'NaN%');
        if (erosionData.length > 0) {
          this.addTable(erosionData, ['Metric', 'Value']);
        }
      }
    }
    
    // Water Availability
    if (terrainData.waterAvailability || terrainData.results?.water_availability) {
      const water = terrainData.waterAvailability || terrainData.results?.water_availability || {};
      this.currentY += 5;
      this.addSubsectionTitle('Water Availability Assessment');
      if (water.water_stats) {
        const waterData = [
          ['Water Availability Score', this.formatNumber(water.water_stats.availability_score)],
          ['Drainage Density', `${this.formatNumber(water.water_stats.drainage_density)} km/km²`],
          ['Water Source Proximity', this.formatNumber(water.water_stats.source_proximity)]
        ].filter(row => row[1] !== 'undefined' && row[1] !== 'NaN');
        if (waterData.length > 0) {
          this.addTable(waterData, ['Metric', 'Value']);
        }
      }
    }
  }

  /**
   * Add land suitability section
   */
  addLandSuitability(landData) {
    this.addSectionTitle('Land Suitability Analysis', this.margin);
    this.currentY += 5;
    
    // Analysis Date
    if (landData.analysisDate) {
      this.doc.setFontSize(10);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Last analyzed: ${new Date(landData.analysisDate).toLocaleString()}`, this.margin, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 5;
    }
    
    // Residential Suitability
    if (landData.residentialSuitability) {
      this.addSubsectionTitle('Residential Suitability');
      const residential = landData.residentialSuitability;
      const residentialScore = residential.percentage || (residential.score ? residential.score * 100 : 0);
      const residentialRating = residential.rating || (residentialScore >= 70 ? 'High' : residentialScore >= 50 ? 'Medium' : 'Low');
      
      this.addTable([
        ['Based on Real Terrain Analysis', `${this.formatNumber(residentialScore)}% suitability`],
        ['Overall Residential Suitability', residentialRating + ' Suitability'],
        ['Suitability Score', `${this.formatNumber(residentialScore)}%`]
      ], ['Metric', 'Value']);
      
      // Add assessment text
      this.currentY += 3;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      let assessment = '';
      if (residentialScore >= 70) {
        assessment = 'High suitability for residential development. Ideal conditions for housing projects with minimal site preparation required.';
      } else if (residentialScore >= 50) {
        assessment = 'Medium suitability for residential development. Some site preparation and engineering may be required.';
      } else {
        assessment = 'Limited suitability for residential development. Significant site preparation and specialized engineering required.';
      }
      this.addText(assessment, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
      this.doc.setFont('helvetica', 'normal');
    }
    
    // Commercial Suitability
    if (landData.commercialSuitability) {
      this.currentY += 8;
      this.addSubsectionTitle('Commercial Suitability');
      const commercial = landData.commercialSuitability;
      const commercialScore = commercial.percentage || (commercial.score ? commercial.score * 100 : 0);
      const commercialRating = commercial.rating || (commercialScore >= 70 ? 'High' : commercialScore >= 50 ? 'Medium' : 'Low');
      
      this.addTable([
        ['Based on Real Terrain Analysis', `${this.formatNumber(commercialScore)}% suitability`],
        ['Overall Commercial Suitability', commercialRating + ' Suitability'],
        ['Suitability Score', `${this.formatNumber(commercialScore)}%`]
      ], ['Metric', 'Value']);
      
      // Add assessment text
      this.currentY += 3;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'italic');
      let assessment = '';
      if (commercialScore >= 70) {
        assessment = 'High suitability for commercial development. Excellent conditions for retail, office, and commercial projects.';
      } else if (commercialScore >= 50) {
        assessment = 'Medium suitability for commercial development. Some site preparation and infrastructure investment may be required.';
      } else {
        assessment = 'Limited suitability for commercial development. Significant site preparation and infrastructure investment required.';
      }
      this.addText(assessment, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
      this.doc.setFont('helvetica', 'normal');
    }
    
    // AI Recommendations
    if (landData.aiRecommendations && Array.isArray(landData.aiRecommendations) && landData.aiRecommendations.length > 0) {
      this.currentY += 8;
      this.addSubsectionTitle('AI Recommendations');
      this.doc.setFontSize(10);
      this.doc.setTextColor(50, 50, 150);
      this.addText('Machine learning insights based on real terrain data', this.margin, this.currentY, this.pageWidth - 2 * this.margin);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 5;
      
      landData.aiRecommendations.forEach((rec, index) => {
        if (this.currentY > this.pageHeight - 40) {
          this.addNewPage();
          this.currentY = this.margin;
        }
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${index + 1}. ${rec.title}`, this.margin, this.currentY);
        this.currentY += this.lineHeight;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(10);
        this.addText(rec.description, this.margin + 5, this.currentY, this.pageWidth - 2 * this.margin - 10);
        this.currentY += this.lineHeight + 3;
      });
    }
    
    // Water Management Information
    if (landData.waterInfo) {
      this.currentY += 5;
      this.addSubsectionTitle('Water Management Information');
      const waterInfo = landData.waterInfo;
      const waterData = [
        ['Water Area Percentage', `${this.formatNumber(waterInfo.water_area_percentage || 0)}%`],
        ['Has Water Bodies', waterInfo.has_water ? 'Yes' : 'No'],
        ['Water Type', waterInfo.water_type || 'N/A'],
        ['Detection Method', waterInfo.detection_method || 'N/A']
      ];
      this.addTable(waterData, ['Property', 'Value']);
      
      // Add water management recommendation if needed
      if (!waterInfo.has_water || (waterInfo.water_area_percentage || 0) === 0) {
        this.currentY += 3;
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(200, 0, 0);
        this.addText('Water Management Required', this.margin, this.currentY, this.pageWidth - 2 * this.margin);
        this.doc.setTextColor(0, 0, 0);
        this.currentY += this.lineHeight;
        this.doc.setFont('helvetica', 'normal');
        this.addText('No water bodies detected and low water availability. Implement comprehensive water management including storage systems, rainwater harvesting, and efficient usage planning.', this.margin, this.currentY, this.pageWidth - 2 * this.margin);
      }
    }
    
    // Suitability Classification
    if (landData.suitabilityClassification) {
      this.currentY += 8;
      this.addSubsectionTitle('Overall Suitability Classification');
      const classification = landData.suitabilityClassification;
      const classData = [
        ['Classification Class', classification.class || 'N/A'],
        ['Classification Label', classification.label || 'N/A'],
        ['Suitability Score', `${this.formatNumber((classification.score || 0) * 100)}%`],
        ['Is Suitable', classification.is_suitable ? 'Yes' : 'No']
      ];
      this.addTable(classData, ['Property', 'Value']);
    }
    
    // Warnings and Restrictions
    if (landData.warnings && Array.isArray(landData.warnings) && landData.warnings.length > 0) {
      this.currentY += 8;
      this.addSubsectionTitle('Warnings');
      this.doc.setFontSize(10);
      this.doc.setTextColor(200, 100, 0);
      landData.warnings.forEach((warning) => {
        if (this.currentY > this.pageHeight - 20) {
          this.addNewPage();
          this.currentY = this.margin;
        }
        this.addText(`⚠ ${warning}`, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
        this.currentY += this.lineHeight;
      });
      this.doc.setTextColor(0, 0, 0);
    }
    
    if (landData.restrictions && Array.isArray(landData.restrictions) && landData.restrictions.length > 0) {
      this.currentY += 5;
      this.addSubsectionTitle('Restrictions');
      this.doc.setFontSize(10);
      this.doc.setTextColor(200, 0, 0);
      landData.restrictions.forEach((restriction) => {
        if (this.currentY > this.pageHeight - 20) {
          this.addNewPage();
          this.currentY = this.margin;
        }
        this.addText(`🚫 ${restriction}`, this.margin, this.currentY, this.pageWidth - 2 * this.margin);
        this.currentY += this.lineHeight;
      });
      this.doc.setTextColor(0, 0, 0);
    }
    
    // Legacy support for old data format
    if (landData.suitabilityScores && !landData.residentialSuitability) {
      this.currentY += 5;
      this.addSubsectionTitle('Suitability Scores');
      const scores = Object.entries(landData.suitabilityScores).map(([key, value]) => [
        key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        `${this.formatNumber(value)}%`
      ]);
      this.addTable(scores, ['Factor', 'Score']);
    }
    
    if (landData.results && !landData.aiRecommendations) {
      this.currentY += 5;
      this.addSubsectionTitle('Analysis Results');
      this.addText(JSON.stringify(landData.results, null, 2), this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    }
  }

  /**
   * Add zoning analysis section
   */
  addZoningAnalysis(zoningData) {
    this.addSectionTitle('Zoning Analysis', this.margin);
    this.currentY += 5;
    
    this.addTable([
      ['Zoning Type', zoningData.zoningType || 'N/A'],
      ['Analysis Date', zoningData.analysisDate ? new Date(zoningData.analysisDate).toLocaleDateString() : 'N/A']
    ], ['Property', 'Value']);
    
    if (zoningData.results) {
      this.currentY += 5;
      this.addSubsectionTitle('Zoning Results');
      this.addText(JSON.stringify(zoningData.results, null, 2), this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    }
  }

  /**
   * Add optimization zoning section
   */
  addOptimizationZoning(optData) {
    this.addSectionTitle('Optimization Zoning Analysis', this.margin);
    this.currentY += 5;
    
    if (optData.fitnessScore !== undefined) {
      this.addTable([
        ['Fitness Score', this.formatNumber(optData.fitnessScore)],
        ['Generations', optData.generations || 'N/A'],
        ['Method', optData.method || 'N/A']
      ], ['Metric', 'Value']);
    }
    
    if (optData.statistics) {
      this.currentY += 5;
      this.addSubsectionTitle('Zone Statistics');
      this.addText(JSON.stringify(optData.statistics, null, 2), this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    }
  }

  /**
   * Add road network section
   */
  addRoadNetwork(roadData) {
    this.addSectionTitle('Road Network Design', this.margin);
    this.currentY += 5;
    
    // Network Statistics
    if (roadData.networkStatistics) {
      this.addSubsectionTitle('Network Statistics');
      const stats = roadData.networkStatistics;
      const networkData = [
        ['Total Road Length', `${this.formatNumber(stats.total_road_length_km)} km`],
        ['Pedestrian Network', `${this.formatNumber(stats.pedestrian_length_km)} km`],
        ['Bike Network', `${this.formatNumber(stats.bike_length_km)} km`],
        ['Total Segments', String(stats.total_segments || 0)]
      ].filter(row => row[1] !== 'undefined km' && row[1] !== 'NaN km');
      this.addTable(networkData, ['Metric', 'Value']);
    }
    
    // Multi-modal Features
    if (roadData.multiModalFeatures) {
      this.currentY += 5;
      this.addSubsectionTitle('Multi-Modal Features');
      const features = roadData.multiModalFeatures;
      const featureData = [
        ['Primary Roads', String(features.primaryRoads || 0)],
        ['Secondary Roads', String(features.secondaryRoads || 0)],
        ['Local Roads', String(features.localRoads || 0)],
        ['Residential Roads', String(features.residentialRoads || 0)],
        ['Pedestrian Paths', String(features.pedestrianPaths || 0)],
        ['Bike Paths', String(features.bikePaths || 0)]
      ];
      this.addTable(featureData, ['Road Type', 'Count']);
    }
    
    // Traffic Analysis
    if (roadData.trafficAnalysis) {
      this.currentY += 5;
      this.addSubsectionTitle('Traffic Analysis');
      const traffic = roadData.trafficAnalysis;
      if (traffic.estimated_capacity) {
        const capacityData = [
          ['Primary Roads', `${traffic.estimated_capacity.primary || 0} veh/hr`],
          ['Secondary Roads', `${traffic.estimated_capacity.secondary || 0} veh/hr`],
          ['Local Roads', `${traffic.estimated_capacity.local || 0} veh/hr`],
          ['Residential', `${traffic.estimated_capacity.residential || 0} veh/hr`]
        ];
        this.addTable(capacityData, ['Road Type', 'Capacity']);
      }
    }
    
    // Accessibility Analysis
    if (roadData.accessibilityAnalysis) {
      this.currentY += 5;
      this.addSubsectionTitle('Accessibility Analysis');
      const accessibility = roadData.accessibilityAnalysis;
      const accessData = [
        ['Parcels with Access', String(accessibility.parcels_with_access || 0)],
        ['Average Distance to Road', `${this.formatNumber(accessibility.average_distance_to_road)} m`],
        ['Accessibility Score', `${this.formatNumber(accessibility.accessibility_score)}%`]
      ];
      this.addTable(accessData, ['Metric', 'Value']);
    }
  }

  /**
   * Add subdivision section
   */
  addSubdivision(subdivisionData) {
    this.addSectionTitle('Land Subdivision', this.margin);
    this.currentY += 5;
    
    this.addTable([
      ['Total Parcels', String(subdivisionData.totalParcels || 0)]
    ], ['Metric', 'Value']);
    
    if (subdivisionData.statistics) {
      this.currentY += 5;
      this.addSubsectionTitle('Subdivision Statistics');
      this.addText(JSON.stringify(subdivisionData.statistics, null, 2), this.margin, this.currentY, this.pageWidth - 2 * this.margin);
    }
  }

  /**
   * Add design elements section
   */
  addDesignElements(designData) {
    this.addSectionTitle('Design Elements', this.margin);
    this.currentY += 5;
    
    // Buildings
    if (designData.buildings) {
      this.addSubsectionTitle('Buildings');
      const buildings = designData.buildings;
      this.addTable([
        ['Total Buildings', String(buildings.count || 0)],
        ['Total Area', `${this.formatNumber(buildings.totalArea)} m²`]
      ], ['Metric', 'Value']);
    }
    
    // Roads
    if (designData.roads) {
      this.currentY += 5;
      this.addSubsectionTitle('Roads');
      const roads = designData.roads;
      this.addTable([
        ['Total Roads', String(roads.count || 0)],
        ['Total Length', `${this.formatNumber(roads.totalLength)} m`]
      ], ['Metric', 'Value']);
    }
    
    // Parcels
    if (designData.parcels) {
      this.currentY += 5;
      this.addSubsectionTitle('Parcels');
      const parcels = designData.parcels;
      this.addTable([
        ['Total Parcels', String(parcels.count || 0)],
        ['Total Area', `${this.formatNumber(parcels.totalArea)} m²`]
      ], ['Metric', 'Value']);
    }
    
    // Green Spaces
    if (designData.greenSpaces) {
      this.currentY += 5;
      this.addSubsectionTitle('Green Spaces');
      const greenSpaces = designData.greenSpaces;
      this.addTable([
        ['Total Green Spaces', String(greenSpaces.count || 0)],
        ['Total Area', `${this.formatNumber(greenSpaces.totalArea)} m²`]
      ], ['Metric', 'Value']);
    }
    
    // Infrastructure
    if (designData.infrastructure) {
      this.currentY += 5;
      this.addSubsectionTitle('Infrastructure');
      this.addTable([
        ['Total Infrastructure', String(designData.infrastructure.count || 0)]
      ], ['Metric', 'Value']);
    }
  }

  /**
   * Add recommendations section
   */
  addRecommendations(recommendations) {
    this.addSectionTitle('Recommendations', this.margin);
    this.currentY += 5;
    
    if (Array.isArray(recommendations)) {
      recommendations.forEach((rec, index) => {
        if (this.currentY > this.pageHeight - 30) {
          this.addNewPage();
          this.currentY = this.margin;
        }
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${index + 1}. ${rec.type.toUpperCase()} - ${rec.priority} Priority`, this.margin, this.currentY);
        this.currentY += this.lineHeight;
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(rec.message, this.margin + 5, this.currentY, { maxWidth: this.pageWidth - 2 * this.margin - 10 });
        this.currentY += this.lineHeight;
        this.doc.setFontSize(10);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(`Impact: ${rec.impact}`, this.margin + 5, this.currentY);
        this.doc.setTextColor(0, 0, 0);
        this.currentY += this.lineHeight + 3;
      });
    }
  }

  /**
   * Add technical appendix
   */
  addTechnicalAppendix() {
    this.addSectionTitle('Technical Appendix', this.margin);
    this.currentY += 5;
    
    this.addSubsectionTitle('Report Metadata');
    this.addTable([
      ['Report ID', this.reportData.id],
      ['Report Type', this.reportData.reportType || 'Full Report'],
      ['Generated At', new Date(this.reportData.generatedAt).toLocaleString()],
      ['Project ID', this.reportData.projectId]
    ], ['Property', 'Value']);
    
    this.currentY += 10;
    this.addSubsectionTitle('Data Sources');
    this.addText('This report was generated using real DEM (Digital Elevation Model) data and advanced terrain analysis algorithms. All calculations are based on actual geographic and terrain data.', this.margin, this.currentY, this.pageWidth - 2 * this.margin);
  }

  // Helper methods
  addNewPage() {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  addSectionTitle(title, x) {
    if (this.currentY > this.pageHeight - 40) {
      this.addNewPage();
    }
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, x, this.currentY);
    this.currentY += this.lineHeight + 2;
  }

  addSubsectionTitle(title) {
    if (this.currentY > this.pageHeight - 30) {
      this.addNewPage();
    }
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += this.lineHeight;
  }

  addTable(data, headers = null) {
    if (this.currentY > this.pageHeight - 40) {
      this.addNewPage();
    }
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const colWidth = (this.pageWidth - 2 * this.margin) / 2;
    const startY = this.currentY;
    
    // Headers
    if (headers) {
      this.doc.setFont('helvetica', 'bold');
      const header1 = headers[0] !== null && headers[0] !== undefined ? String(headers[0]) : '';
      const header2 = headers[1] !== null && headers[1] !== undefined ? String(headers[1]) : '';
      this.doc.text(header1, this.margin, this.currentY);
      this.doc.text(header2, this.margin + colWidth, this.currentY);
      this.currentY += this.lineHeight;
      this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
      this.currentY += 2;
    }
    
    // Data rows
    this.doc.setFont('helvetica', 'normal');
    data.forEach((row) => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage();
        this.currentY = this.margin;
      }
      // Convert all values to strings to avoid jsPDF errors
      const value1 = row[0] !== null && row[0] !== undefined ? String(row[0]) : 'N/A';
      const value2 = row[1] !== null && row[1] !== undefined ? String(row[1]) : 'N/A';
      this.doc.text(value1, this.margin, this.currentY);
      this.doc.text(value2, this.margin + colWidth, this.currentY);
      this.currentY += this.lineHeight;
    });
    
    this.currentY += 3;
  }

  addText(text, x, y, maxWidth) {
    const lines = this.doc.splitTextToSize(text, maxWidth);
    lines.forEach((line) => {
      if (this.currentY > this.pageHeight - 20) {
        this.addNewPage();
        this.currentY = this.margin;
      }
      this.doc.setFontSize(10);
      this.doc.text(line, x, this.currentY);
      this.currentY += this.lineHeight;
    });
  }

  formatNumber(num) {
    if (num === null || num === undefined || num === '' || isNaN(num)) return 'N/A';
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return 'N/A';
    return parsed.toFixed(2);
  }
}

/**
 * Generate and download PDF report
 */
export async function generatePDFReport(reportData, filename = null) {
  const generator = new PDFReportGenerator(reportData);
  const doc = await generator.generate();
  
  const reportTypeSuffix = reportData.reportType ? `_${reportData.reportType}` : '';
  const defaultFilename = `${(reportData.projectTitle || 'report').replace(/[^a-z0-9]/gi, '_')}${reportTypeSuffix}_report_${Date.now()}.pdf`;
  const finalFilename = filename || defaultFilename;
  
  doc.save(finalFilename);
  return doc;
}

