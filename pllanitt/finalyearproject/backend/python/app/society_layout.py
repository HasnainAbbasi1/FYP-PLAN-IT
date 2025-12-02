"""
Phase 4: Intelligent Society Layout Engine
Generates realistic Pakistani-style residential societies with sectors, plots, and amenities
"""

import math
import logging
from typing import List, Tuple, Dict, Any
from shapely.geometry import Polygon, Point, LineString, MultiPolygon
from shapely.ops import unary_union
import numpy as np

logger = logging.getLogger(__name__)

# Standard Pakistani plot sizes (in square meters)
PLOT_SIZES = {
    '3_marla': 75.87,      # 3 marla
    '5_marla': 126.45,     # 5 marla
    '7_marla': 177.03,     # 7 marla
    '10_marla': 252.90,    # 10 marla
    '1_kanal': 505.80,     # 1 kanal (20 marla)
    '2_kanal': 1011.60,    # 2 kanal
}

# Road widths in meters
ROAD_WIDTHS = {
    'main_boulevard': 24.38,    # 80 feet
    'sector_road': 12.19,       # 40 feet
    'internal_street': 9.14,    # 30 feet
    'service_lane': 6.10,       # 20 feet
}


class SocietyLayoutGenerator:
    """Generates intelligent society layouts with sectors, plots, and amenities"""
    
    def __init__(self, polygon_coords, percentages, terrain_data=None):
        """
        Initialize the society layout generator
        
        Args:
            polygon_coords: List of [lon, lat] coordinates
            percentages: Dict with zone percentages
            terrain_data: Optional terrain analysis data
        """
        self.polygon = Polygon(polygon_coords)
        self.percentages = percentages
        self.terrain_data = terrain_data or {}
        self.total_area = self.polygon.area
        
        # Convert to approximate square meters (rough conversion for lat/lon)
        # This is approximate; real conversion depends on location
        self.total_area_sqm = self.total_area * 111320 * 111320
        
        self.sectors = []
        self.plots = []
        self.roads = []
        self.amenities = []
        self.gates = []
        
    def generate_layout(self, layout_type='grid'):
        """
        Generate complete society layout with enhanced boundary validation
        
        Args:
            layout_type: 'grid', 'organic', 'radial', or 'cluster'
        
        Returns:
            Dict with sectors, plots, roads, amenities, and statistics
        """
        logger.info(f"🏗️ Generating {layout_type} society layout for {self.total_area_sqm:.0f} sqm")
        logger.info(f"📐 Polygon bounds: {self.polygon.bounds}")
        logger.info(f"📊 Polygon area: {self.total_area_sqm / 4046.86:.2f} acres ({self.total_area_sqm:.0f} sqm)")
        
        # Step 1: Create main road network
        self._create_main_roads()
        
        # Step 2: Subdivide into sectors
        self._create_sectors(layout_type)
        
        # Step 3: Generate plots in each sector
        self._generate_plots_in_sectors()
        
        # Step 4: Place amenities intelligently
        self._place_amenities()
        
        # Step 5: Place entry gates
        self._place_gates()
        
        # Step 6: Validate all elements are within polygon
        self._validate_boundaries()
        
        # Step 7: Generate statistics
        stats = self._calculate_statistics()
        
        logger.info(f"✅ Layout generation complete:")
        logger.info(f"   • {len(self.sectors)} sectors")
        logger.info(f"   • {len(self.plots)} plots")
        logger.info(f"   • {len(self.roads)} roads")
        logger.info(f"   • {len(self.amenities)} amenities")
        logger.info(f"   • {len(self.gates)} gates")
        
        return {
            'sectors': self.sectors,
            'plots': self.plots,
            'roads': self.roads,
            'amenities': self.amenities,
            'gates': self.gates,
            'statistics': stats,
            'layout_type': layout_type
        }
    
    def _validate_boundaries(self):
        """Validate that all generated elements are within polygon boundaries"""
        logger.info("🔍 Validating boundary compliance...")
        
        # Check plots
        outside_plots = 0
        for plot in self.plots:
            if not plot['geometry'].within(self.polygon):
                # Check if it's mostly within
                intersection = plot['geometry'].intersection(self.polygon)
                if intersection.area < (plot['geometry'].area * 0.7):
                    outside_plots += 1
        
        # Check amenities
        outside_amenities = 0
        for amenity in self.amenities:
            if not amenity['geometry'].within(self.polygon):
                outside_amenities += 1
        
        if outside_plots > 0:
            logger.warning(f"⚠️ {outside_plots} plots are significantly outside polygon boundaries")
        else:
            logger.info(f"✅ All {len(self.plots)} plots are within polygon boundaries")
        
        if outside_amenities > 0:
            logger.warning(f"⚠️ {outside_amenities} amenities are outside polygon boundaries")
        else:
            logger.info(f"✅ All {len(self.amenities)} amenities are within polygon boundaries")
    
    def _create_main_roads(self):
        """Create main boulevard and sector roads"""
        bounds = self.polygon.bounds  # (minx, miny, maxx, maxy)
        minx, miny, maxx, maxy = bounds
        
        width = maxx - minx
        height = maxy - miny
        
        # Main boulevard (horizontal through center)
        main_road_y = miny + height / 2
        self.roads.append({
            'type': 'main_boulevard',
            'geometry': LineString([(minx, main_road_y), (maxx, main_road_y)]),
            'width': ROAD_WIDTHS['main_boulevard'],
            'name': 'Main Boulevard'
        })
        
        # Vertical sector roads
        num_vertical_roads = max(2, int(width / 200))  # One road every ~200m
        for i in range(1, num_vertical_roads):
            road_x = minx + (width * i / num_vertical_roads)
            self.roads.append({
                'type': 'sector_road',
                'geometry': LineString([(road_x, miny), (road_x, maxy)]),
                'width': ROAD_WIDTHS['sector_road'],
                'name': f'Sector Road {i}'
            })
        
        logger.info(f"Created {len(self.roads)} main roads")
    
    def _create_sectors(self, layout_type='grid'):
        """Subdivide area into sectors"""
        bounds = self.polygon.bounds
        minx, miny, maxx, maxy = bounds
        
        width = maxx - minx
        height = maxy - miny
        
        # Determine sector grid based on area
        area_acres = self.total_area_sqm / 4046.86
        
        if area_acres < 10:
            # Small society: 2x2 sectors
            rows, cols = 2, 2
        elif area_acres < 50:
            # Medium society: 3x3 sectors
            rows, cols = 3, 3
        else:
            # Large society: 4x4 or more
            rows = max(3, min(5, int(math.sqrt(area_acres / 10))))
            cols = rows
        
        sector_width = width / cols
        sector_height = height / rows
        
        sector_labels = []
        for i in range(rows):
            for j in range(cols):
                sector_labels.append(chr(65 + i * cols + j))  # A, B, C, ...
        
        sector_idx = 0
        for i in range(rows):
            for j in range(cols):
                sector_minx = minx + j * sector_width
                sector_miny = miny + i * sector_height
                sector_maxx = sector_minx + sector_width
                sector_maxy = sector_miny + sector_height
                
                sector_polygon = Polygon([
                    (sector_minx, sector_miny),
                    (sector_maxx, sector_miny),
                    (sector_maxx, sector_maxy),
                    (sector_minx, sector_maxy)
                ])
                
                # Intersect with main polygon
                sector_polygon = sector_polygon.intersection(self.polygon)
                
                if sector_polygon.area > 0:
                    sector_area_sqm = sector_polygon.area * 111320 * 111320
                    
                    self.sectors.append({
                        'id': sector_labels[sector_idx] if sector_idx < len(sector_labels) else f'S{sector_idx}',
                        'geometry': sector_polygon,
                        'area_sqm': sector_area_sqm,
                        'bounds': sector_polygon.bounds,
                        'center': (sector_polygon.centroid.x, sector_polygon.centroid.y)
                    })
                    sector_idx += 1
        
        logger.info(f"Created {len(self.sectors)} sectors in {rows}x{cols} grid")
    
    def _generate_plots_in_sectors(self):
        """Generate individual plots within each sector"""
        residential_pct = self.percentages.get('residential', 40)
        commercial_pct = self.percentages.get('commercial', 20)
        
        for sector in self.sectors:
            sector_id = sector['id']
            sector_geom = sector['geometry']
            sector_area = sector['area_sqm']
            
            # Reserve 15% for roads within sector
            # Reserve 10% for green space within sector
            usable_area = sector_area * 0.75
            
            # 70% residential, 20% commercial of usable area
            residential_area = usable_area * (residential_pct / 100)
            commercial_area = usable_area * (commercial_pct / 100)
            
            # Generate residential plots
            self._generate_plots_for_zone(
                sector_id, 
                sector_geom, 
                residential_area, 
                'residential',
                preferred_size='5_marla'
            )
            
            # Generate commercial plots (if any)
            if commercial_area > 0:
                self._generate_plots_for_zone(
                    sector_id,
                    sector_geom,
                    commercial_area,
                    'commercial',
                    preferred_size='10_marla'
                )
        
        logger.info(f"Generated {len(self.plots)} total plots")
    
    def _generate_plots_for_zone(self, sector_id, sector_geom, target_area, zone_type, preferred_size='5_marla'):
        """Generate plots for a specific zone with better boundary checking and realistic gaps"""
        plot_size_sqm = PLOT_SIZES.get(preferred_size, 126.45)
        num_plots = int(target_area / plot_size_sqm)
        
        bounds = sector_geom.bounds
        minx, miny, maxx, maxy = bounds
        
        width = maxx - minx
        height = maxy - miny
        
        # Calculate plot dimensions with realistic gaps (2 meters = ~0.000018 degrees)
        plot_width = math.sqrt(plot_size_sqm / 111320 / 111320)
        plot_height = plot_width
        
        # Add gaps between plots (2 meters on each side)
        gap_size = 0.000018  # ~2 meters in degrees
        plot_width_with_gap = plot_width + gap_size
        plot_height_with_gap = plot_height + gap_size
        
        # Grid layout within sector with gaps
        plots_per_row = max(1, int(width / plot_width_with_gap))
        plots_per_col = max(1, int(height / plot_height_with_gap))
        
        plot_count = 0
        for row in range(plots_per_col):
            for col in range(plots_per_row):
                if plot_count >= num_plots:
                    break
                
                # Add gap offset
                plot_minx = minx + col * plot_width_with_gap + gap_size/2
                plot_miny = miny + row * plot_height_with_gap + gap_size/2
                plot_maxx = plot_minx + plot_width
                plot_maxy = plot_miny + plot_height
                
                plot_polygon = Polygon([
                    (plot_minx, plot_miny),
                    (plot_maxx, plot_miny),
                    (plot_maxx, plot_maxy),
                    (plot_minx, plot_maxy)
                ])
                
                # More strict boundary checking - only add plots that are mostly within sector
                if plot_polygon.within(sector_geom):
                    # Plot is fully within sector
                    plot_count += 1
                    self.plots.append({
                        'id': f'{sector_id}-{plot_count}',
                        'sector': sector_id,
                        'geometry': plot_polygon,
                        'size_marlas': plot_size_sqm / 25.2929,
                        'size_sqm': plot_size_sqm,
                        'type': zone_type,
                        'number': plot_count,
                        'center': (plot_polygon.centroid.x, plot_polygon.centroid.y)
                    })
                elif plot_polygon.intersects(sector_geom):
                    # Plot partially intersects - only add if >70% is within sector
                    intersection = plot_polygon.intersection(sector_geom)
                    if intersection.area > 0 and (intersection.area / plot_polygon.area) > 0.7:
                        # Use the clipped geometry
                        plot_count += 1
                        clipped_polygon = intersection if hasattr(intersection, 'exterior') else plot_polygon
                        self.plots.append({
                            'id': f'{sector_id}-{plot_count}',
                            'sector': sector_id,
                            'geometry': clipped_polygon,
                            'size_marlas': plot_size_sqm / 25.2929,
                            'size_sqm': plot_size_sqm,
                            'type': zone_type,
                            'number': plot_count,
                            'center': (clipped_polygon.centroid.x, clipped_polygon.centroid.y)
                        })
            
            if plot_count >= num_plots:
                break
    
    def _place_amenities(self):
        """Intelligently place community amenities within polygon boundaries"""
        total_plots = len([p for p in self.plots if p['type'] == 'residential'])
        estimated_population = total_plots * 5  # ~5 people per plot
        
        area_acres = self.total_area_sqm / 4046.86
        green_space_pct = self.percentages.get('green_space', 15)
        
        logger.info(f"📍 Placing amenities for {total_plots} plots, estimated population: {estimated_population}, area: {area_acres:.1f} acres")
        logger.info(f"🌳 Target green space: {green_space_pct}% ({self.total_area_sqm * green_space_pct / 100:.0f} sqm)")
        
        # Place amenities based on society size
        amenity_configs = []
        
        # Mosques (1 per 500 people, min 1, max 1 per sector)
        num_mosques = max(1, min(len(self.sectors), estimated_population // 500))
        amenity_configs.extend([
            {'type': 'mosque', 'size_sqm': 500, 'icon': '🕌', 'priority': 'high'}
            for _ in range(num_mosques)
        ])
        
        # GREEN SPACES: Calculate based on user-specified percentage
        target_green_space_sqm = self.total_area_sqm * (green_space_pct / 100)
        # Allocate green space across sectors (parks, playgrounds, gardens)
        num_sectors = len(self.sectors)
        if num_sectors > 0:
            green_space_per_sector = target_green_space_sqm / num_sectors
            
            # Create parks (large green spaces)
            num_parks = max(2, min(num_sectors, int(green_space_pct // 3)))  # More parks for higher green space %
            park_size = min(3000, green_space_per_sector * 0.6)  # 60% of sector green space for main parks
            amenity_configs.extend([
                {'type': 'park', 'size_sqm': park_size, 'icon': '🌳', 'priority': 'high'}
                for _ in range(num_parks)
            ])
            
            # Add playgrounds for residential areas
            num_playgrounds = max(1, num_sectors // 2)
            playground_size = min(1000, green_space_per_sector * 0.2)
            amenity_configs.extend([
                {'type': 'playground', 'size_sqm': playground_size, 'icon': '🎪', 'priority': 'medium'}
                for _ in range(num_playgrounds)
            ])
            
            # Add community gardens if green space % is high
            if green_space_pct >= 20:
                num_gardens = max(1, num_sectors // 3)
                garden_size = min(800, green_space_per_sector * 0.2)
                amenity_configs.extend([
                    {'type': 'garden', 'size_sqm': garden_size, 'icon': '🌺', 'priority': 'low'}
                    for _ in range(num_gardens)
                ])
        
        logger.info(f"✅ Planned {sum(1 for a in amenity_configs if a['type'] in ['park', 'playground', 'garden'])} green space amenities")
        
        # Schools (if large enough)
        if area_acres > 10:
            num_schools = max(1, estimated_population // 1000)
            amenity_configs.extend([
                {'type': 'school', 'size_sqm': 4000, 'icon': '🎓', 'priority': 'medium'}
                for _ in range(num_schools)
            ])
        
        # Commercial plaza
        if area_acres > 5:
            amenity_configs.append({
                'type': 'commercial_plaza', 'size_sqm': 3000, 'icon': '🏪', 'priority': 'medium'
            })
        
        # Community center
        if area_acres > 20:
            amenity_configs.append({
                'type': 'community_center', 'size_sqm': 1500, 'icon': '🏢', 'priority': 'low'
            })
        
        # Hospital/Dispensary
        if area_acres > 30:
            amenity_configs.append({
                'type': 'hospital', 'size_sqm': 2500, 'icon': '🏥', 'priority': 'medium'
            })
        
        # Place each amenity with better validation and spacing
        sector_index = 0
        amenity_counter = {}  # Track count per type for numbering
        
        for config in amenity_configs:
            amenity_type = config['type']
            amenity_counter[amenity_type] = amenity_counter.get(amenity_type, 0) + 1
            count = amenity_counter[amenity_type]
            
            # Cycle through sectors for better distribution
            if len(self.sectors) > 0:
                sector = self.sectors[sector_index % len(self.sectors)]
                sector_geom = sector['geometry']
                center = sector['center']
                
                # Offset center to avoid overlapping with other amenities
                offset_x = (sector_index % 3 - 1) * 0.0002  # Small offset in lon
                offset_y = ((sector_index // 3) % 3 - 1) * 0.0002  # Small offset in lat
                offset_center = (center[0] + offset_x, center[1] + offset_y)
                
                # Create amenity geometry with proper sizing
                amenity_size = math.sqrt(config['size_sqm'] / 111320 / 111320)
                amenity_polygon = Point(offset_center).buffer(amenity_size / 2)
                
                # Ensure amenity is within polygon boundaries
                if not amenity_polygon.within(self.polygon):
                    # Try to clip to polygon
                    amenity_polygon = amenity_polygon.intersection(self.polygon)
                    if amenity_polygon.is_empty or amenity_polygon.area == 0:
                        logger.warning(f"⚠️ Could not place {amenity_type} {count} within polygon boundaries")
                        sector_index += 1
                        continue
                
                # Check for overlap with existing amenities
                overlaps = False
                for existing in self.amenities:
                    if amenity_polygon.intersects(existing['geometry']):
                        overlap_area = amenity_polygon.intersection(existing['geometry']).area
                        if overlap_area > amenity_polygon.area * 0.3:  # Allow small overlaps
                            overlaps = True
                            break
                
                if overlaps:
                    logger.debug(f"⚠️ {amenity_type} {count} overlaps, trying next location")
                    sector_index += 1
                    continue
                
                self.amenities.append({
                    'id': f"{amenity_type}_{count}",
                    'type': amenity_type,
                    'geometry': amenity_polygon,
                    'size_sqm': config['size_sqm'],
                    'icon': config['icon'],
                    'sector': sector['id'],
                    'center': offset_center,
                    'name': f"{amenity_type.replace('_', ' ').title()} {count}"
                })
                logger.info(f"✅ Placed {amenity_type} {count} in sector {sector['id']}")
                sector_index += 1
        
        green_space_amenities = len([a for a in self.amenities if a['type'] in ['park', 'playground', 'garden']])
        logger.info(f"✅ Successfully placed {len(self.amenities)} amenities ({green_space_amenities} green spaces)")
    
    def _place_gates(self):
        """Place entry gates at strategic locations"""
        bounds = self.polygon.bounds
        minx, miny, maxx, maxy = bounds
        
        width = maxx - minx
        height = maxy - miny
        
        # Main gate (bottom center - main entry)
        main_gate_x = minx + width / 2
        main_gate_y = miny
        main_gate_point = Point(main_gate_x, main_gate_y)
        
        # Create main gate geometry
        gate_size = 0.00005  # Slightly larger for main gate
        main_gate_geom = main_gate_point.buffer(gate_size)
        
        self.gates.append({
            'id': 'main_gate',
            'type': 'main',
            'geometry': main_gate_geom,
            'center': (main_gate_x, main_gate_y),
            'name': 'Main Gate',
            'icon': '🚪',
            'position': 'south'
        })
        
        # Secondary gates based on society size
        area_acres = self.total_area_sqm / 4046.86
        
        if area_acres > 20:
            # Add secondary gate (top center)
            secondary_gate_x = minx + width / 2
            secondary_gate_y = maxy
            secondary_gate_point = Point(secondary_gate_x, secondary_gate_y)
            secondary_gate_geom = secondary_gate_point.buffer(gate_size * 0.8)
            
            self.gates.append({
                'id': 'secondary_gate_north',
                'type': 'secondary',
                'geometry': secondary_gate_geom,
                'center': (secondary_gate_x, secondary_gate_y),
                'name': 'North Gate',
                'icon': '🚪',
                'position': 'north'
            })
        
        if area_acres > 40:
            # Add side gates for larger societies
            # East gate
            east_gate_x = maxx
            east_gate_y = miny + height / 2
            east_gate_point = Point(east_gate_x, east_gate_y)
            east_gate_geom = east_gate_point.buffer(gate_size * 0.7)
            
            self.gates.append({
                'id': 'side_gate_east',
                'type': 'service',
                'geometry': east_gate_geom,
                'center': (east_gate_x, east_gate_y),
                'name': 'East Service Gate',
                'icon': '🚪',
                'position': 'east'
            })
            
            # West gate
            west_gate_x = minx
            west_gate_y = miny + height / 2
            west_gate_point = Point(west_gate_x, west_gate_y)
            west_gate_geom = west_gate_point.buffer(gate_size * 0.7)
            
            self.gates.append({
                'id': 'side_gate_west',
                'type': 'service',
                'geometry': west_gate_geom,
                'center': (west_gate_x, west_gate_y),
                'name': 'West Service Gate',
                'icon': '🚪',
                'position': 'west'
            })
        
        logger.info(f"✅ Placed {len(self.gates)} gates (1 main, {len(self.gates)-1} secondary/service)")
    
    def _calculate_statistics(self):
        """Calculate comprehensive society statistics"""
        residential_plots = [p for p in self.plots if p['type'] == 'residential']
        commercial_plots = [p for p in self.plots if p['type'] == 'commercial']
        
        total_plot_area = sum(p['size_sqm'] for p in self.plots)
        total_amenity_area = sum(a['size_sqm'] for a in self.amenities)
        total_road_area = self.total_area_sqm * (self.percentages.get('roads', 15) / 100)
        
        estimated_population = len(residential_plots) * 5
        
        # Count amenities by type
        amenity_counts = {}
        for amenity in self.amenities:
            amenity_type = amenity['type']
            amenity_counts[amenity_type] = amenity_counts.get(amenity_type, 0) + 1
        
        return {
            'total_sectors': len(self.sectors),
            'total_plots': len(self.plots),
            'residential_plots': len(residential_plots),
            'commercial_plots': len(commercial_plots),
            'total_area_sqm': self.total_area_sqm,
            'total_area_marlas': self.total_area_sqm / 25.2929,
            'total_area_acres': self.total_area_sqm / 4046.86,
            'plot_area_sqm': total_plot_area,
            'amenity_area_sqm': total_amenity_area,
            'road_area_sqm': total_road_area,
            'green_space_area_sqm': self.total_area_sqm * (self.percentages.get('green_space', 15) / 100),
            'estimated_population': estimated_population,
            'population_density': estimated_population / (self.total_area_sqm / 10000) if self.total_area_sqm > 0 else 0,  # per hectare
            'amenity_counts': amenity_counts,
            'average_plot_size_marlas': sum(p['size_marlas'] for p in self.plots) / len(self.plots) if self.plots else 0,
            'infrastructure': {
                'schools': amenity_counts.get('school', 0),
                'mosques': amenity_counts.get('mosque', 0),
                'parks': amenity_counts.get('park', 0),
                'commercial_plazas': amenity_counts.get('commercial_plaza', 0),
                'hospitals': amenity_counts.get('hospital', 0),
                'community_centers': amenity_counts.get('community_center', 0),
            }
        }


def generate_society_layout_dict(polygon_coords, percentages, terrain_data=None, layout_type='grid'):
    """
    Convenience function to generate society layout
    
    Returns dict suitable for JSON serialization
    """
    generator = SocietyLayoutGenerator(polygon_coords, percentages, terrain_data)
    layout = generator.generate_layout(layout_type)
    
    # Convert Shapely geometries to GeoJSON-like dicts
    serializable_layout = {
        'sectors': [
            {
                'id': s['id'],
                'area_sqm': s['area_sqm'],
                'bounds': s['bounds'],
                'center': s['center'],
                'coordinates': list(s['geometry'].exterior.coords) if hasattr(s['geometry'], 'exterior') else []
            }
            for s in layout['sectors']
        ],
        'plots': [
            {
                'id': p['id'],
                'sector': p['sector'],
                'type': p['type'],
                'size_marlas': p['size_marlas'],
                'size_sqm': p['size_sqm'],
                'number': p['number'],
                'center': p['center'],
                'coordinates': list(p['geometry'].exterior.coords) if hasattr(p['geometry'], 'exterior') else []
            }
            for p in layout['plots']
        ],
        'roads': [
            {
                'type': r['type'],
                'width': r['width'],
                'name': r['name'],
                'coordinates': list(r['geometry'].coords)
            }
            for r in layout['roads']
        ],
        'amenities': [
            {
                'id': a['id'],
                'type': a['type'],
                'size_sqm': a['size_sqm'],
                'icon': a['icon'],
                'sector': a.get('sector'),
                'center': a['center'],
                'name': a['name'],
                'coordinates': list(a['geometry'].exterior.coords) if hasattr(a['geometry'], 'exterior') else [a['center']]
            }
            for a in layout['amenities']
        ],
        'gates': [
            {
                'id': g['id'],
                'type': g['type'],
                'center': g['center'],
                'name': g['name'],
                'icon': g['icon'],
                'position': g['position'],
                'coordinates': list(g['geometry'].exterior.coords) if hasattr(g['geometry'], 'exterior') else [g['center']]
            }
            for g in layout.get('gates', [])
        ],
        'statistics': layout['statistics'],
        'layout_type': layout['layout_type']
    }
    
    return serializable_layout

