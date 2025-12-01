import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Save, 
  Undo, 
  Redo,
  Palette,
  Pencil,
  Eraser,
  X,
  Move,
  Square,
  Route,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * Image Customization Editor Component
 * Allows users to customize zoning visualization images
 * 
 * Features:
 * - Drawing and erasing tools
 * - Drag and drop blocks: Click "Move Blocks" tool to see detected blocks with blue outlines
 *   - Hover over blocks to see green outline (grab cursor)
 *   - Click and drag blocks to move them around
 *   - Blocks are automatically detected when image loads
 */
const ImageCustomizationEditor = ({ 
  imageUrl, 
  polygonId, 
  onSave, 
  onClose 
}) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Drag and drop state for existing blocks in image
  const [detectedBlocks, setDetectedBlocks] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [originalImageData, setOriginalImageData] = useState(null); // Store original image for restoration
  const [isDetectingBlocks, setIsDetectingBlocks] = useState(false);
  const [movedBlocks, setMovedBlocks] = useState(new Set()); // Track which blocks have been moved from original position
  const [originalBlockPositions, setOriginalBlockPositions] = useState(new Map()); // Track original positions of moved blocks
  
  // Road network state
  const [roadNetworkData, setRoadNetworkData] = useState(null);
  const [showRoads, setShowRoads] = useState(true);
  const [isLoadingRoads, setIsLoadingRoads] = useState(false);
  const [roadVisibility, setRoadVisibility] = useState({
    primary: true,
    secondary: true,
    local: true,
    residential: true,
    pedestrian: true,
    bike: true,
    emergency: true
  });
  const [polygonBounds, setPolygonBounds] = useState(null); // Store polygon bounds for coordinate transformation

  // Load image when component mounts or imageUrl changes
  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      console.log('Loading image:', imageUrl);
      const img = new Image();
      
      // Handle CORS - try without crossOrigin first, then with
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        setImage(img);
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        console.log('Image drawn on canvas');
        
        // Detect blocks in the image
        detectBlocksInImage(img, ctx);
        
        // Trigger road network bounds update after image loads
        if (polygonId) {
          setTimeout(() => {
            // Re-fetch bounds now that image is loaded
            const fetchBounds = async () => {
              try {
                const API_BASE_URL = "http://localhost:8000";
                const response = await fetch(`${API_BASE_URL}/api/polygon/${polygonId}`);
                if (response.ok) {
                  const polygonData = await response.json();
                  const geojson = polygonData.geojson || polygonData.geometry;
                  
                  if (geojson && geojson.coordinates) {
                    const coords = geojson.coordinates[0] || geojson.coordinates;
                    if (coords && coords.length > 0) {
                      let minLon = Infinity, maxLon = -Infinity;
                      let minLat = Infinity, maxLat = -Infinity;
                      
                      coords.forEach((coord) => {
                        const [lon, lat] = Array.isArray(coord) ? coord : [coord[0], coord[1]];
                        if (typeof lon === 'number' && typeof lat === 'number') {
                          minLon = Math.min(minLon, lon);
                          maxLon = Math.max(maxLon, lon);
                          minLat = Math.min(minLat, lat);
                          maxLat = Math.max(maxLat, lat);
                        }
                      });
                      
                      if (minLon !== Infinity) {
                        setPolygonBounds({
                          geoBounds: { minLon, maxLon, minLat, maxLat },
                          canvasBounds: {
                            minX: 0,
                            minY: 0,
                            maxX: canvas.width,
                            maxY: canvas.height
                          }
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn('Could not update bounds after image load:', error);
              }
            };
            fetchBounds();
          }, 100);
        }
        
        saveToHistory();
      };
      
      img.onerror = (error) => {
        console.error('Failed to load image:', imageUrl, error);
        // Try loading without CORS
        const img2 = new Image();
        img2.onload = () => {
          console.log('Image loaded without CORS');
          setImage(img2);
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          canvas.width = img2.width;
          canvas.height = img2.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img2, 0, 0);
          saveToHistory();
        };
        img2.onerror = () => {
          console.error('Image failed to load even without CORS');
          alert(`Failed to load image from: ${imageUrl}\n\nPlease check:\n1. The image URL is correct\n2. The Python backend is running\n3. CORS is enabled`);
        };
        img2.src = imageUrl;
      };
      
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Fetch road network data when polygonId changes
  useEffect(() => {
    if (polygonId) {
      fetchRoadNetwork();
    }
  }, [polygonId]);

  // Fetch road network from API
  const fetchRoadNetwork = async () => {
    if (!polygonId) return;
    
    setIsLoadingRoads(true);
    try {
      const API_BASE_URL = "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/api/road_network_results`);
      if (response.ok) {
        const data = await response.json();
        const roadNetworks = Array.isArray(data) ? data : (data.road_networks || []);
        const roadNetwork = roadNetworks.find(rn => 
          rn.polygon_id === polygonId || 
          rn.polygon_id?.toString() === polygonId?.toString()
        );
        
        if (roadNetwork && roadNetwork.road_network) {
          setRoadNetworkData(roadNetwork.road_network);
          console.log('Road network loaded for polygon:', polygonId);
          console.log(`   - Primary: ${roadNetwork.road_network.primary_roads?.features?.length || 0}`);
          console.log(`   - Secondary: ${roadNetwork.road_network.secondary_roads?.features?.length || 0}`);
          console.log(`   - Local: ${roadNetwork.road_network.local_roads?.features?.length || 0}`);
        } else {
          console.log('⚠️ No road network found for polygon:', polygonId);
          setRoadNetworkData(null);
        }
      } else {
        console.warn('⚠️ Failed to fetch road networks:', response.status);
        setRoadNetworkData(null);
      }
    } catch (error) {
      console.error('Error fetching road network:', error);
      setRoadNetworkData(null);
    } finally {
      setIsLoadingRoads(false);
    }
  };

  // Extract polygon bounds - fetch polygon data to get actual GeoJSON bounds
  useEffect(() => {
    const fetchPolygonBounds = async () => {
      if (!polygonId || !image || !canvasRef.current) return;
      
      try {
        const API_BASE_URL = "http://localhost:8000";
        // Try to fetch polygon data to get actual bounds
        const response = await fetch(`${API_BASE_URL}/api/polygon/${polygonId}`);
        if (response.ok) {
          const polygonData = await response.json();
          const geojson = polygonData.geojson || polygonData.geometry;
          
          if (geojson && geojson.coordinates) {
            // Extract bounds from polygon coordinates
            const coords = geojson.coordinates[0] || geojson.coordinates;
            if (coords && coords.length > 0) {
              let minLon = Infinity, maxLon = -Infinity;
              let minLat = Infinity, maxLat = -Infinity;
              
              coords.forEach((coord) => {
                const [lon, lat] = Array.isArray(coord) ? coord : [coord[0], coord[1]];
                if (typeof lon === 'number' && typeof lat === 'number') {
                  minLon = Math.min(minLon, lon);
                  maxLon = Math.max(maxLon, lon);
                  minLat = Math.min(minLat, lat);
                  maxLat = Math.max(maxLat, lat);
                }
              });
              
              // Validate bounds
              if (minLon !== Infinity && maxLon !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
                const canvas = canvasRef.current;
                // Map geographic bounds to canvas bounds (full image)
                setPolygonBounds({
                  geoBounds: { minLon, maxLon, minLat, maxLat },
                  canvasBounds: {
                    minX: 0,
                    minY: 0,
                    maxX: canvas.width,
                    maxY: canvas.height
                  }
                });
                console.log('Polygon bounds set:', { minLon, maxLon, minLat, maxLat });
                return;
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch polygon bounds:', error);
      }
      
      // Fallback: Try to extract bounds from road network data if available
      if (roadNetworkData) {
        try {
          const allFeatures = [
            ...(roadNetworkData.primary_roads?.features || []),
            ...(roadNetworkData.secondary_roads?.features || []),
            ...(roadNetworkData.local_roads?.features || []),
            ...(roadNetworkData.residential_roads?.features || []),
            ...(roadNetworkData.pedestrian_network?.features || []),
            ...(roadNetworkData.bike_network?.features || []),
            ...(roadNetworkData.emergency_routes?.features || [])
          ];
          
          if (allFeatures.length > 0) {
            let minLon = Infinity, maxLon = -Infinity;
            let minLat = Infinity, maxLat = -Infinity;
            
            allFeatures.forEach(feature => {
              const coords = feature.geometry.coordinates;
              if (feature.geometry.type === 'LineString') {
                coords.forEach(([lon, lat]) => {
                  minLon = Math.min(minLon, lon);
                  maxLon = Math.max(maxLon, lon);
                  minLat = Math.min(minLat, lat);
                  maxLat = Math.max(maxLat, lat);
                });
              } else if (feature.geometry.type === 'MultiLineString') {
                coords.forEach(line => {
                  line.forEach(([lon, lat]) => {
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                  });
                });
              }
            });
            
            if (minLon !== Infinity && maxLon !== -Infinity && minLat !== Infinity && maxLat !== -Infinity) {
              const canvas = canvasRef.current;
              setPolygonBounds({
                geoBounds: { minLon, maxLon, minLat, maxLat },
                canvasBounds: {
                  minX: 0,
                  minY: 0,
                  maxX: canvas.width,
                  maxY: canvas.height
                }
              });
              console.log('Polygon bounds extracted from road network');
              return;
            }
          }
        } catch (error) {
          console.warn('Could not extract bounds from road network:', error);
        }
      }
      
      // Final fallback: use image bounds (roads won't be positioned correctly, but won't crash)
      const canvas = canvasRef.current;
      setPolygonBounds({
        geoBounds: null,
        canvasBounds: {
          minX: 0,
          minY: 0,
          maxX: canvas.width,
          maxY: canvas.height
        }
      });
      console.warn('⚠️ Using fallback bounds - roads may not be positioned correctly');
    };
    
    if (polygonId && image && canvasRef.current) {
      fetchPolygonBounds();
    }
  }, [polygonId, image, roadNetworkData]);

  // Convert GeoJSON coordinates to canvas coordinates
  const geoToCanvas = useCallback((lon, lat) => {
    if (!polygonBounds || !polygonBounds.geoBounds || !polygonBounds.canvasBounds) {
      return { x: 0, y: 0 };
    }
    
    const { geoBounds, canvasBounds } = polygonBounds;
    
    // Validate inputs
    if (typeof lon !== 'number' || typeof lat !== 'number' || 
        !isFinite(lon) || !isFinite(lat)) {
      return { x: 0, y: 0 };
    }
    
    // Check if bounds are valid
    const lonRange = geoBounds.maxLon - geoBounds.minLon;
    const latRange = geoBounds.maxLat - geoBounds.minLat;
    
    if (lonRange <= 0 || latRange <= 0 || !isFinite(lonRange) || !isFinite(latRange)) {
      return { x: 0, y: 0 };
    }
    
    // Normalize coordinates (0-1 range)
    // Clamp to bounds to handle roads that extend slightly beyond polygon
    const clampedLon = Math.max(geoBounds.minLon, Math.min(geoBounds.maxLon, lon));
    const clampedLat = Math.max(geoBounds.minLat, Math.min(geoBounds.maxLat, lat));
    
    const normalizedX = (clampedLon - geoBounds.minLon) / lonRange;
    const normalizedY = 1 - (clampedLat - geoBounds.minLat) / latRange; // Flip Y axis (canvas Y increases downward)
    
    // Map to canvas coordinates
    const x = canvasBounds.minX + normalizedX * (canvasBounds.maxX - canvasBounds.minX);
    const y = canvasBounds.minY + normalizedY * (canvasBounds.maxY - canvasBounds.minY);
    
    // Ensure coordinates are within canvas bounds
    return {
      x: Math.max(0, Math.min(canvasBounds.maxX, x)),
      y: Math.max(0, Math.min(canvasBounds.maxY, y))
    };
  }, [polygonBounds]);

  // Optimized color distance calculation using weighted RGB distance
  const colorDistance = useCallback((r1, g1, b1, r2, g2, b2) => {
    // Weighted RGB distance (more accurate than simple Euclidean)
    const rMean = (r1 + r2) / 2;
    const rDelta = r1 - r2;
    const gDelta = g1 - g2;
    const bDelta = b1 - b2;
    return Math.sqrt(
      (2 + rMean / 256) * rDelta * rDelta +
      4 * gDelta * gDelta +
      (2 + (255 - rMean) / 256) * bDelta * bDelta
    );
  }, []);

  // Detect COMPLETE SINGLE BLOCK by finding its rectangular boundaries
  const findBlockBoundsFast = useCallback((startX, startY, width, height, data, targetColor, threshold) => {
    const [tr, tg, tb] = targetColor;
    
    // Strategy: Find the complete rectangular boundary by scanning in all 4 directions
    // until we hit the block boundaries (white background or different color)
    
    // First, verify this is actually a block pixel
    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];
    
    if (startA < 100) {
      return { x: startX, y: startY, width: 0, height: 0 };
    }
    
    const startDist = colorDistance(startR, startG, startB, tr, tg, tb);
    if (startDist >= threshold * 1.5) {
      return { x: startX, y: startY, width: 0, height: 0 };
    }
    
    // Find left boundary - scan left until we hit white or different color
    let leftX = startX;
    for (let x = startX - 1; x >= 0; x--) {
      let foundBlockColor = false;
      // Sample multiple Y positions to ensure we're still in the block
      for (let sampleY = Math.max(0, startY - 10); sampleY < Math.min(height, startY + 10); sampleY += 2) {
        const idx = (sampleY * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a < 100) continue;
        
        // Check if it's white background (block boundary)
        if (r > 245 && g > 245 && b > 245) {
          break; // Hit white boundary
        }
        
        // Check if it's still the block color or a border
        const dist = colorDistance(r, g, b, tr, tg, tb);
        const isBorder = (r < 70 && g < 70 && b < 70 && a > 200);
        
        // More lenient matching for boundary detection to catch complete blocks
        // Use 2.0x threshold for better boundary detection (works for Commercial, Park, etc.)
        if (dist < threshold * 2.0 || isBorder) {
          foundBlockColor = true;
          break;
        }
      }
      
      if (!foundBlockColor) {
        break; // Hit boundary
      }
      leftX = x;
    }
    
    // Find right boundary
    let rightX = startX;
    for (let x = startX + 1; x < width; x++) {
      let foundBlockColor = false;
      for (let sampleY = Math.max(0, startY - 10); sampleY < Math.min(height, startY + 10); sampleY += 2) {
        const idx = (sampleY * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a < 100) continue;
        
        if (r > 245 && g > 245 && b > 245) {
          break;
        }
        
        const dist = colorDistance(r, g, b, tr, tg, tb);
        const isBorder = (r < 70 && g < 70 && b < 70 && a > 200);
        
        // More lenient matching for boundary detection (2.0x threshold)
        if (dist < threshold * 2.0 || isBorder) {
          foundBlockColor = true;
          break;
        }
      }
      
      if (!foundBlockColor) {
        break;
      }
      rightX = x;
    }
    
    // Find top boundary - scan the full width we found
    let topY = startY;
    for (let y = startY - 1; y >= 0; y--) {
      let foundBlockColor = false;
      // Sample across the width we found
      for (let sampleX = leftX; sampleX <= rightX && sampleX < width; sampleX += 5) {
        const idx = (y * width + sampleX) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a < 100) continue;
        
        if (r > 245 && g > 245 && b > 245) {
          break;
        }
        
        const dist = colorDistance(r, g, b, tr, tg, tb);
        const isBorder = (r < 70 && g < 70 && b < 70 && a > 200);
        
        // More lenient matching for boundary detection (2.0x threshold)
        if (dist < threshold * 2.0 || isBorder) {
          foundBlockColor = true;
          break;
        }
      }
      
      if (!foundBlockColor) {
        break;
      }
      topY = y;
    }
    
    // Find bottom boundary
    let bottomY = startY;
    for (let y = startY + 1; y < height; y++) {
      let foundBlockColor = false;
      for (let sampleX = leftX; sampleX <= rightX && sampleX < width; sampleX += 5) {
        const idx = (y * width + sampleX) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a < 100) continue;
        
        if (r > 245 && g > 245 && b > 245) {
          break;
        }
        
        const dist = colorDistance(r, g, b, tr, tg, tb);
        const isBorder = (r < 70 && g < 70 && b < 70 && a > 200);
        
        // More lenient matching for boundary detection (2.0x threshold)
        if (dist < threshold * 2.0 || isBorder) {
          foundBlockColor = true;
          break;
        }
      }
      
      if (!foundBlockColor) {
        break;
      }
      bottomY = y;
    }
    
    // Return the complete rectangular block
    return {
      x: Math.max(0, leftX),
      y: Math.max(0, topY),
      width: Math.min(width, rightX + 1) - Math.max(0, leftX),
      height: Math.min(height, bottomY + 1) - Math.max(0, topY)
    };
  }, [colorDistance]);

  // Detect ALL colored blocks/zones in the 2D visualization image (optimized, non-blocking)
  const detectBlocksInImage = useCallback((img, ctx) => {
    try {
      setIsDetectingBlocks(true);
      console.log('Detecting ALL blocks/zones in 2D visualization image (OPTIMIZED)...');
      
      // Limit image size for performance - resize if too large
      const maxDimension = 1500; // Reduced from 2000 for faster processing
      let workWidth = img.width;
      let workHeight = img.height;
      let scaleFactor = 1;
      
      if (img.width > maxDimension || img.height > maxDimension) {
        scaleFactor = Math.min(maxDimension / img.width, maxDimension / img.height);
        workWidth = Math.floor(img.width * scaleFactor);
        workHeight = Math.floor(img.height * scaleFactor);
        console.log(`Resizing for detection: ${img.width}x${img.height} -> ${workWidth}x${workHeight} (scale: ${scaleFactor.toFixed(2)})`);
      }
      
      // Create a temporary canvas to analyze the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = workWidth;
      tempCanvas.height = workHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0, workWidth, workHeight);
      
      const imageData = tempCtx.getImageData(0, 0, workWidth, workHeight);
      const data = imageData.data;
      
      // Zone colors to detect (based on actual 2D visualization colors from backend)
      // Using tighter thresholds and fewer color variations for better accuracy
      const zoneColors = [
        { 
          name: 'Residential', 
          colors: [
            [219, 234, 254], // #dbeafe - Very light blue (primary)
            [191, 219, 254], // #bfdbfe - Light blue
            [147, 197, 253], // #93c5fd - Medium light blue
          ], 
          threshold: 25 // Tighter threshold for better accuracy
        },
        { 
          name: 'Commercial', 
          colors: [
            [255, 107, 107], // #ff6b6b - Bright red/coral (primary - actual backend color)
            [255, 115, 115], // Slightly lighter red
            [255, 100, 100], // Slightly darker red
            [250, 110, 110], // Light red variant
            [245, 105, 105], // Medium red variant
            [240, 100, 100], // Lighter red variant
            [230, 95, 95],   // Darker red variant
            [251, 191, 138], // #fbbf8a - Peach (steep warning)
            [251, 146, 60],  // #fb923c - Orange (very steep warning)
            [201, 42, 42],   // #c92a2a - Dark red (edge color)
          ], 
          threshold: 60  // More lenient threshold to catch variations from alpha blending and compression
        },
        { 
          name: 'Park', 
          colors: [
            [45, 212, 191],  // #2dd4bf - Teal green (primary)
            [50, 220, 200],  // Lighter teal
            [40, 200, 180],  // Darker teal
            [20, 184, 166],  // #14b8a6 - Teal
            [16, 185, 129],  // #10b981 - Emerald
            [30, 200, 175],  // Medium teal variant
          ], 
          threshold: 35  // Increased threshold for better detection
        },
        { 
          name: 'Amenities', 
          colors: [
            [244, 114, 182], // #f472b6 - Pink (MOSQUE) - pure color
            [250, 130, 195], // Lighter pink variant
            [238, 100, 170], // Darker pink variant
            [251, 113, 133], // #fb7185 - Rose (HOSPITAL) - pure color
            [255, 125, 145], // Lighter rose variant
            [245, 100, 120], // Darker rose variant
            [56, 189, 248],  // #38bdf8 - Light blue/cyan (SCHOOL) - pure color
            [70, 200, 255],  // Lighter blue variant
            [45, 175, 235],  // Darker blue variant
            [250, 204, 21],  // #facc15 - Yellow (GRID STATION) - pure color
            [255, 215, 35],  // Lighter yellow variant
            [245, 195, 15],  // Darker yellow variant
            // Blended colors (amenity on commercial background with alpha 0.8)
            [200, 120, 140], // Pink blended with red background
            [180, 110, 120], // Rose blended with red background
            [150, 150, 200], // Blue blended with red background
            [220, 160, 80],  // Yellow blended with red background
          ], 
          threshold: 65 // Higher threshold to catch blended colors, variations, and compression artifacts
        },
        { 
          name: 'Green Space', 
          colors: [
            [50, 205, 50],   // Lime green
            [34, 139, 34],   // Forest green
            [124, 252, 0],   // Lawn green
          ], 
          threshold: 30 
        },
        { 
          name: 'Mosque', 
          colors: [
            [244, 114, 182], // #f472b6 - Pink (primary)
            [250, 125, 190], // Lighter pink
            [240, 105, 175], // Slightly darker pink
            [236, 72, 153],  // #ec4899 - Darker pink
            [219, 39, 119],  // #db2777 - Deep pink
            [230, 90, 165],  // Medium pink variant
          ], 
          threshold: 40  // Increased threshold for better detection
        },
        { 
          name: 'Hospital', 
          colors: [
            [251, 113, 133], // #fb7185 - Pink-red (primary)
            [255, 125, 145], // Lighter pink-red
            [245, 100, 120], // Slightly darker pink-red
            [244, 63, 94],   // #f43f5e - Red-pink
            [225, 29, 72],   // #e11d48 - Deep red-pink
            [235, 85, 110],  // Medium pink-red variant
          ], 
          threshold: 40  // Increased threshold for better detection
        },
        { 
          name: 'School', 
          colors: [
            [56, 189, 248],  // #38bdf8 - Blue (primary)
            [70, 200, 255],  // Lighter blue
            [45, 175, 235],  // Slightly darker blue
            [14, 165, 233],  // #0ea5e9 - Sky blue
            [2, 132, 199],   // #0284c7 - Darker blue
            [30, 180, 240],  // Medium blue variant
          ], 
          threshold: 40  // Increased threshold for better detection
        },
        { 
          name: 'Grid Station', 
          colors: [
            [250, 204, 21],  // #facc15 - Yellow (primary)
            [255, 215, 35],  // Lighter yellow
            [245, 195, 15],  // Slightly darker yellow
            [234, 179, 8],   // #eab308 - Gold
            [202, 138, 4],   // #ca8a04 - Darker gold
            [240, 190, 12],  // Medium yellow variant
          ], 
          threshold: 40  // Increased threshold for better detection
        },
      ];
      
      const blocks = [];
      const visited = new Set();
      // Increased sample step for faster processing (fewer pixels to check)
      const sampleStep = Math.max(8, Math.floor(workWidth / 300)); 
      const minBlockSize = Math.max(40, Math.floor(60 * scaleFactor)); // Smaller minimum for better detection
      
      console.log(`⚙️ Detection settings: step=${sampleStep}, minSize=${minBlockSize}, scale=${scaleFactor.toFixed(2)}`);
      
      // Use requestAnimationFrame to break up work and avoid blocking
      let y = 0;
      const processChunk = () => {
        try {
          const chunkSize = 100; // Increased chunk size for faster processing
          const endY = Math.min(y + chunkSize, workHeight - minBlockSize);
          
          for (; y < endY; y += sampleStep) {
            for (let x = 0; x < workWidth - minBlockSize; x += sampleStep) {
              const key = `${Math.floor(x/sampleStep)}_${Math.floor(y/sampleStep)}`;
              if (visited.has(key)) continue;
              
              const idx = (y * workWidth + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];
              
              // Skip transparent pixels
              if (a < 128) continue;
              // Skip white/very light colors (likely backgrounds, roads, text)
              // But allow commercial red and park teal which might appear lighter
              if (r > 245 && g > 245 && b > 245) continue;
              // Skip very dark colors (likely borders, text)
              if (r < 25 && g < 25 && b < 25) continue;
              // Don't skip red-ish pixels that might be commercial (r > 200, g and b much lower)
              // Don't skip teal/green pixels that might be park (g > 180, b > 150, r < 100)
              // This helps catch commercial and park blocks even if they're slightly lighter
              
              // Check if this pixel matches any zone color (optimized matching)
              // Prioritize Commercial and Amenities FIRST, then Park, then Residential
              let matchedZone = null;
              let bestMatch = Infinity;
              
              // Check zones in priority order: Commercial > Park > Amenities > Residential
              // This ensures Commercial and Park are detected before other zones
              const commercialZones = zoneColors.filter(z => z.name === 'Commercial');
              const parkZones = zoneColors.filter(z => z.name === 'Park' || z.name === 'Green Space');
              const amenityZones = zoneColors.filter(z => 
                z.name === 'Amenities' || z.name === 'Mosque' || z.name === 'Hospital' || 
                z.name === 'School' || z.name === 'Grid Station'
              );
              const residentialZone = zoneColors.find(z => z.name === 'Residential');
              const zonesToCheck = [
                ...commercialZones,  // Check commercial FIRST (highest priority)
                ...parkZones,         // Then parks (high priority)
                ...amenityZones,      // Then amenities
                ...(residentialZone ? [residentialZone] : [])  // Residential last
              ];
              
              for (const zone of zonesToCheck) {
                for (const zoneColor of zone.colors) {
                  const [zr, zg, zb] = zoneColor;
                  const distance = colorDistance(r, g, b, zr, zg, zb);
                  
                  if (distance < zone.threshold && distance < bestMatch) {
                    bestMatch = distance;
                    matchedZone = { ...zone, matchedColor: zoneColor };
                  }
                }
              }
              
              if (matchedZone) {
                // Find the complete single block by detecting its rectangular boundaries
                // Use the threshold directly - the function will handle boundary detection
                const bounds = findBlockBoundsFast(x, y, workWidth, workHeight, data, matchedZone.matchedColor, matchedZone.threshold);
                
                // Use smaller minimum size for amenities (they're overlays, so smaller)
                const isAmenityType = matchedZone.name === 'Amenities' || 
                                     matchedZone.name === 'Mosque' || 
                                     matchedZone.name === 'Hospital' || 
                                     matchedZone.name === 'School' || 
                                     matchedZone.name === 'Grid Station';
                const effectiveMinSize = isAmenityType ? Math.max(20, Math.floor(minBlockSize * 0.5)) : minBlockSize;
                
                // Only add blocks that meet minimum size
                const isReasonableSize = bounds.width >= effectiveMinSize && bounds.height >= effectiveMinSize;
                const blockArea = bounds.width * bounds.height;
                const minArea = effectiveMinSize * effectiveMinSize * (isAmenityType ? 0.5 : 0.8); // More lenient for amenities
                
                if (isReasonableSize && blockArea >= minArea) {
                  // Check if this block overlaps significantly with an existing block
                  // Use more lenient overlap detection to allow complete blocks
                  const overlaps = blocks.some(existing => {
                    // Check if blocks are of the same type and overlapping
                    if (existing.type !== matchedZone.name) {
                      // Different types - only consider overlap if very significant (>60%)
                      const overlapX = Math.max(0, Math.min(bounds.x + bounds.width, existing.x + existing.width) - Math.max(bounds.x, existing.x));
                      const overlapY = Math.max(0, Math.min(bounds.y + bounds.height, existing.y + existing.height) - Math.max(bounds.y, existing.y));
                      const overlapArea = overlapX * overlapY;
                      const thisArea = bounds.width * bounds.height;
                      const existingArea = existing.width * existing.height;
                      // For different types, require >60% overlap to consider them the same
                      return overlapArea > thisArea * 0.6 || overlapArea > existingArea * 0.6;
                    } else {
                      // Same type - check if this is likely the same block (center-based check)
                      const thisCenterX = bounds.x + bounds.width / 2;
                      const thisCenterY = bounds.y + bounds.height / 2;
                      const existingCenterX = existing.x + existing.width / 2;
                      const existingCenterY = existing.y + existing.height / 2;
                      const centerDistance = Math.sqrt(
                        Math.pow(thisCenterX - existingCenterX, 2) + 
                        Math.pow(thisCenterY - existingCenterY, 2)
                      );
                      const avgSize = (bounds.width + bounds.height + existing.width + existing.height) / 4;
                      
                      // If centers are very close (< 30% of average size), it's likely the same block
                      if (centerDistance < avgSize * 0.3) {
                        // Check if this new detection is larger (more complete) than existing
                        const thisArea = bounds.width * bounds.height;
                        const existingArea = existing.width * existing.height;
                        // If new block is significantly larger (>20%), replace the old one
                        if (thisArea > existingArea * 1.2) {
                          // Remove the smaller existing block
                          const index = blocks.findIndex(b => b.id === existing.id);
                          if (index >= 0) {
                            blocks.splice(index, 1);
                          }
                          return false; // Don't skip this block, replace the old one
                        }
                        return true; // Same block, skip
                      }
                      
                      // Check area overlap
                      const overlapX = Math.max(0, Math.min(bounds.x + bounds.width, existing.x + existing.width) - Math.max(bounds.x, existing.x));
                      const overlapY = Math.max(0, Math.min(bounds.y + bounds.height, existing.y + existing.height) - Math.max(bounds.y, existing.y));
                      const overlapArea = overlapX * overlapY;
                      const thisArea = bounds.width * bounds.height;
                      const existingArea = existing.width * existing.height;
                      // For same type, use 50% threshold to allow complete block detection
                      return overlapArea > thisArea * 0.5 || overlapArea > existingArea * 0.5;
                    }
                  });
                  
                  if (!overlaps) {
                    // Mark all pixels in this block as visited (with larger step for speed)
                    // Use a smaller step to ensure complete block coverage
                    const visitStep = Math.max(1, Math.floor(sampleStep * 1.5));
                    for (let by = bounds.y; by < bounds.y + bounds.height && by < workHeight; by += visitStep) {
                      for (let bx = bounds.x; bx < bounds.x + bounds.width && bx < workWidth; bx += visitStep) {
                        visited.add(`${Math.floor(bx/sampleStep)}_${Math.floor(by/sampleStep)}`);
                      }
                    }
                    
                    // Scale coordinates back to original image size
                    const originalX = Math.floor(bounds.x / scaleFactor);
                    const originalY = Math.floor(bounds.y / scaleFactor);
                    const originalWidth = Math.floor(bounds.width / scaleFactor);
                    const originalHeight = Math.floor(bounds.height / scaleFactor);
                    
                    blocks.push({
                      id: Date.now() + blocks.length,
                      x: originalX,
                      y: originalY,
                      width: originalWidth,
                      height: originalHeight,
                      type: matchedZone.name,
                      color: `rgb(${matchedZone.matchedColor.join(',')})`,
                      originalX: originalX,
                      originalY: originalY,
                      imageData: null
                    });
                  }
                }
              }
            }
          }
          
          // Continue processing if not done
          if (y < workHeight - minBlockSize) {
            requestAnimationFrame(processChunk);
          } else {
            // Finished processing
            console.log(`Detected ${blocks.length} blocks/zones in 2D visualization image`);
            
            // Log breakdown by type with detailed info
            const blocksByType = {};
            blocks.forEach(block => {
              blocksByType[block.type] = (blocksByType[block.type] || 0) + 1;
            });
            console.log('Blocks by type:', blocksByType);
            console.log('All detected blocks (first 10):', blocks.slice(0, 10).map(b => `${b.type} at (${b.x}, ${b.y})`));
            
            // Log specific counts for debugging
            const commercialCount = blocks.filter(b => b.type === 'Commercial').length;
            const parkCount = blocks.filter(b => b.type === 'Park' || b.type === 'Green Space').length;
            const amenityCount = blocks.filter(b => 
              b.type === 'Amenities' || b.type === 'Mosque' || b.type === 'Hospital' || 
              b.type === 'School' || b.type === 'Grid Station'
            ).length;
            console.log(`Commercial blocks detected: ${commercialCount}`);
            console.log(`Park blocks detected: ${parkCount}`);
            console.log(`Amenity blocks detected: ${amenityCount}`);
            if (commercialCount === 0) {
              console.warn('⚠️ WARNING: No commercial blocks detected! Check color matching.');
            }
            if (parkCount === 0) {
              console.warn('⚠️ WARNING: No park blocks detected! Check color matching.');
            }
            if (amenityCount === 0) {
              console.warn('⚠️ WARNING: No amenity blocks detected! Check color matching.');
            }
            
            // Warn if only residential blocks detected
            if (blocksByType['Residential'] === blocks.length && blocks.length > 0) {
              console.warn('⚠️ WARNING: Only Residential blocks detected! Other block types may not be visible or colors may need adjustment.');
            }
            
            setDetectedBlocks(blocks);
            setIsDetectingBlocks(false);
            
            if (blocks.length === 0) {
              console.warn('⚠️ No colored blocks detected in the image. Make sure the image contains colored zones (residential, commercial, park, etc.)');
            }
          }
        } catch (chunkError) {
          console.error('Error in processChunk:', chunkError);
          setIsDetectingBlocks(false);
        }
      };
      
      // Start processing
      processChunk();
      
    } catch (error) {
      console.error('Error detecting blocks:', error);
      setIsDetectingBlocks(false);
    }
  }, [image, colorDistance, findBlockBoundsFast]);


  // Draw outlines around detected blocks
  const drawBlockOutlines = (ctx, blocks) => {
    blocks.forEach(block => {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(block.x, block.y, block.width, block.height);
      ctx.setLineDash([]);
    });
  };

  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(canvas.toDataURL());
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[newIndex];
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[newIndex];
    }
  };

  // Handle mouse down
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Account for scale transform on container
    const containerScale = scale;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    console.log('Mouse down at:', x, y, 'Tool:', selectedTool, 'Blocks:', detectedBlocks.length);
    
    // Check if clicking on a detected block (for dragging)
    if (selectedTool === 'move' && detectedBlocks.length > 0) {
      console.log(`Checking ${detectedBlocks.length} blocks at click position (${x}, ${y})`);
      
      // Debug: Log all blocks and their bounds
      const blocksInArea = detectedBlocks.filter(block => {
        const isInside = x >= block.x && x <= block.x + block.width &&
               y >= block.y && y <= block.y + block.height;
        if (isInside) {
          console.log(`Block in click area: ${block.type} at (${block.x}, ${block.y}) size: ${block.width}x${block.height}, bounds: x[${block.x}, ${block.x + block.width}], y[${block.y}, ${block.y + block.height}]`);
        }
        return isInside;
      });
      console.log(`Found ${blocksInArea.length} blocks at click position`);
      blocksInArea.forEach(b => console.log(`  - ${b.type} (${b.x}, ${b.y})`));
      
      // Select SINGLE block - check blocks in reverse order (top blocks first) and find the first match
      // This ensures only ONE block is selected for dragging, regardless of type (Residential, Commercial, Park, Amenities)
      const clickedBlock = [...detectedBlocks].reverse().find(block => {
        const isInside = x >= block.x && x <= block.x + block.width &&
               y >= block.y && y <= block.y + block.height;
        if (isInside) {
          console.log(`Found block: ${block.type} at (${block.x}, ${block.y}) size: ${block.width}x${block.height}`);
        }
        return isInside;
      });
      
      if (clickedBlock) {
        console.log('Block selected for dragging:', clickedBlock.type, 'ID:', clickedBlock.id);
        const ctx = canvas.getContext('2d');
        
        // Save the CURRENT block image data from canvas (the actual colored block from image)
        const currentBlockData = ctx.getImageData(
          clickedBlock.x,
          clickedBlock.y,
          clickedBlock.width,
          clickedBlock.height
        );
        
        // Make sure the block is fully opaque (no transparency)
        // Set alpha channel to 255 (fully opaque) for all pixels
        const data = currentBlockData.data;
        for (let i = 3; i < data.length; i += 4) {
          data[i] = 255; // Set alpha to fully opaque
        }
        
        console.log(`Saved block image data: ${clickedBlock.width}x${clickedBlock.height} pixels (fully opaque)`);
        
        // Store it in the block for later use
        const blockWithData = {
          ...clickedBlock,
          savedImageData: currentBlockData
        };
        
        setIsDragging(true);
        setDraggedBlock(blockWithData);
        setDragOffset({
          x: x - clickedBlock.x,
          y: y - clickedBlock.y
        });
        
        // IMMEDIATELY remove the block from canvas - make original position white/empty RIGHT NOW
        // Create a white/empty background for the original position
        const emptyBgCanvas = document.createElement('canvas');
        emptyBgCanvas.width = clickedBlock.width;
        emptyBgCanvas.height = clickedBlock.height;
        const emptyBgCtx = emptyBgCanvas.getContext('2d');
        emptyBgCtx.fillStyle = '#ffffff';
        emptyBgCtx.fillRect(0, 0, clickedBlock.width, clickedBlock.height);
        const emptyBgData = emptyBgCtx.getImageData(0, 0, clickedBlock.width, clickedBlock.height);
        
        // Store the empty background
        setOriginalImageData({
          blockId: clickedBlock.id,
          imageData: emptyBgCanvas.toDataURL(),
          imageDataObj: emptyBgData,
          x: clickedBlock.x,
          y: clickedBlock.y
        });
        
        // Mark this block as moved and store its original position
        setMovedBlocks(prev => new Set([...prev, clickedBlock.id]));
        setOriginalBlockPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(clickedBlock.id, { x: clickedBlock.x, y: clickedBlock.y, width: clickedBlock.width, height: clickedBlock.height });
          return newMap;
        });
        
        // IMMEDIATELY clear the block from its original position on the canvas - DO THIS FIRST
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(clickedBlock.x, clickedBlock.y, clickedBlock.width, clickedBlock.height);
        
        // Draw a border to show the empty space
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(clickedBlock.x, clickedBlock.y, clickedBlock.width, clickedBlock.height);
        ctx.setLineDash([]);
        
        console.log('Block IMMEDIATELY removed from original position - now white/empty at:', clickedBlock.x, clickedBlock.y);
        
        // Change cursor to grabbing
        canvas.style.cursor = 'grabbing';
        return;
      } else {
        console.log('No block found at click position. Make sure you clicked on a colored zone.');
      }
    }
    
    // Drawing tools
    if (selectedTool === 'pencil' || selectedTool === 'eraser') {
      setIsDrawing(true);
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    
    // Add block tool
    if (selectedTool === 'add-block') {
      const newBlock = {
        id: Date.now(),
        x: x - 50,
        y: y - 50,
        width: 100,
        height: 100,
        color: selectedColor,
        type: 'Custom',
        label: `Block ${detectedBlocks.length + 1}`
      };
      setDetectedBlocks([...detectedBlocks, newBlock]);
      // Draw the new block on canvas
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = selectedColor;
      ctx.fillRect(newBlock.x, newBlock.y, newBlock.width, newBlock.height);
      saveToHistory();
    }
  };

  // Draw road network on canvas
  const drawRoadNetwork = useCallback((ctx, canvas) => {
    if (!roadNetworkData || !showRoads || !polygonBounds || !polygonBounds.geoBounds) {
      return;
    }
    
    // Get all road features
    const allRoadFeatures = [
      ...(roadVisibility.primary && roadNetworkData.primary_roads?.features || []),
      ...(roadVisibility.secondary && roadNetworkData.secondary_roads?.features || []),
      ...(roadVisibility.local && roadNetworkData.local_roads?.features || []),
      ...(roadVisibility.residential && roadNetworkData.residential_roads?.features || []),
      ...(roadVisibility.pedestrian && roadNetworkData.pedestrian_network?.features || []),
      ...(roadVisibility.bike && roadNetworkData.bike_network?.features || []),
      ...(roadVisibility.emergency && roadNetworkData.emergency_routes?.features || [])
    ];
    
    if (allRoadFeatures.length === 0) {
      return;
    }
    
    console.log(`Drawing ${allRoadFeatures.length} road features on canvas`);
    
    // Road style mapping
    const getRoadStyle = (roadType) => {
      const styles = {
        primary: { color: '#dc2626', width: 6, opacity: 0.9 },
        secondary: { color: '#2563eb', width: 4, opacity: 0.8 },
        local: { color: '#16a34a', width: 3, opacity: 0.7 },
        residential: { color: '#ca8a04', width: 2, opacity: 0.6 },
        pedestrian: { color: '#9333ea', width: 2, opacity: 0.5, dash: [5, 5] },
        bike: { color: '#0891b2', width: 2, opacity: 0.6, dash: [10, 5] },
        emergency: { color: '#ea580c', width: 5, opacity: 0.8 }
      };
      return styles[roadType] || styles.local;
    };
    
    // Draw each road feature
    let drawnCount = 0;
    allRoadFeatures.forEach((feature, index) => {
      try {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
          return;
        }
        
        const roadType = feature.properties?.road_type || 'local';
        const style = getRoadStyle(roadType);
        const coords = feature.geometry.coordinates;
        
        if (!coords || (Array.isArray(coords) && coords.length === 0)) {
          return;
        }
        
        ctx.save();
        ctx.globalAlpha = style.opacity;
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (style.dash) {
          ctx.setLineDash(style.dash);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        
        if (feature.geometry.type === 'LineString') {
          let firstPoint = true;
          let validPoints = 0;
          
          coords.forEach((coord) => {
            if (!Array.isArray(coord) || coord.length < 2) return;
            
            const [lon, lat] = coord;
            if (typeof lon !== 'number' || typeof lat !== 'number' || 
                !isFinite(lon) || !isFinite(lat)) {
              return;
            }
            
            const { x, y } = geoToCanvas(lon, lat);
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
              validPoints++;
            } else {
              ctx.lineTo(x, y);
              validPoints++;
            }
          });
          
          if (validPoints > 0) {
            ctx.stroke();
            drawnCount++;
          }
        } else if (feature.geometry.type === 'MultiLineString') {
          coords.forEach(line => {
            if (!Array.isArray(line)) return;
            
            let firstPoint = true;
            line.forEach((coord) => {
              if (!Array.isArray(coord) || coord.length < 2) return;
              
              const [lon, lat] = coord;
              if (typeof lon !== 'number' || typeof lat !== 'number' || 
                  !isFinite(lon) || !isFinite(lat)) {
                return;
              }
              
              const { x, y } = geoToCanvas(lon, lat);
              if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
              } else {
                ctx.lineTo(x, y);
              }
            });
          });
          ctx.stroke();
          drawnCount++;
        }
        
        ctx.restore();
      } catch (error) {
        console.warn(`Error drawing road feature ${index}:`, error);
      }
    });
    
    if (drawnCount > 0) {
      console.log(`Successfully drew ${drawnCount} road features`);
    }
  }, [roadNetworkData, showRoads, roadVisibility, polygonBounds, geoToCanvas]);

  // Redraw canvas with image, blocks, and road network
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Don't redraw if currently dragging (to avoid interfering with drag)
    if (isDragging) {
      return;
    }
    
    // Redraw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    
    // Draw road network (before blocks so roads appear under blocks)
    drawRoadNetwork(ctx, canvas);
    
    // Draw all blocks at their current positions with their actual content
    if (detectedBlocks.length > 0) {
      detectedBlocks.forEach(block => {
        const isHovered = hoveredBlock?.id === block.id;
        const isDragged = draggedBlock?.id === block.id;
        
        // Skip drawing dragged block (it's drawn during drag)
        if (isDragged && isDragging) {
          return;
        }
        
        // Draw the actual block content if we have saved image data
        if (block.savedImageData) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.putImageData(block.savedImageData, block.x, block.y);
        }
      });
    }
    
    // Draw detected blocks with outlines (only in move mode)
    if (selectedTool === 'move' && detectedBlocks.length > 0) {
      detectedBlocks.forEach(block => {
        const isHovered = hoveredBlock?.id === block.id;
        const isDragged = draggedBlock?.id === block.id;
        
        // Skip drawing outline for dragged block (it's drawn during drag)
        if (isDragged && isDragging) {
          return;
        }
        
        // Draw selection outline with different colors for hover/drag states
        ctx.strokeStyle = isDragged ? '#ef4444' : (isHovered ? '#10b981' : '#3b82f6');
        ctx.lineWidth = isDragged || isHovered ? 5 : 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(block.x, block.y, block.width, block.height);
        ctx.setLineDash([]);
        
        // Draw a semi-transparent overlay to highlight the entire block when selected/hovered
        if (isHovered || isDragged) {
          ctx.fillStyle = isDragged ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
          ctx.fillRect(block.x, block.y, block.width, block.height);
        }
        
        // Draw block type label with background
        const labelWidth = Math.min(120, block.width - 4);
        ctx.fillStyle = isDragged ? 'rgba(239, 68, 68, 0.9)' : (isHovered ? 'rgba(16, 185, 129, 0.9)' : 'rgba(59, 130, 246, 0.8)');
        ctx.fillRect(block.x + 2, block.y + 2, labelWidth, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(block.type || 'Block', block.x + 5, block.y + 17);
      });
    }
  }, [image, detectedBlocks, selectedTool, hoveredBlock, draggedBlock, isDragging, movedBlocks, originalBlockPositions, drawRoadNetwork]);

  // Update canvas when blocks change, tool changes, or road network changes
  // BUT: Never redraw during dragging to avoid interfering
  useEffect(() => {
    if (image && !isDragging) {
      redrawCanvas();
    }
  }, [image, detectedBlocks, selectedTool, hoveredBlock, draggedBlock, isDragging, redrawCanvas, showRoads, roadVisibility, roadNetworkData]);
  
  // Extract image data for all blocks after detection
  useEffect(() => {
    if (image && detectedBlocks.length > 0 && !isDetectingBlocks && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Ensure image is drawn on canvas before extracting
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      
      // Extract image data for blocks that don't have it yet
      const blocksWithImageData = detectedBlocks.map(block => {
        if (!block.savedImageData) {
          try {
            const blockData = ctx.getImageData(block.x, block.y, block.width, block.height);
            // Make fully opaque
            const data = blockData.data;
            for (let i = 3; i < data.length; i += 4) {
              data[i] = 255;
            }
            return { ...block, savedImageData: blockData };
          } catch (e) {
            console.warn('Could not extract image data for block:', block.id, e);
            return block;
          }
        }
        return block;
      });
      
      // Only update if we actually added image data
      if (blocksWithImageData.some((b, i) => b.savedImageData !== detectedBlocks[i]?.savedImageData)) {
        setDetectedBlocks(blocksWithImageData);
      }
    }
  }, [image, detectedBlocks.length, isDetectingBlocks]);
  
  // Redraw when detection completes
  useEffect(() => {
    if (image && detectedBlocks.length > 0 && !isDetectingBlocks && !isDragging) {
      setTimeout(() => {
        redrawCanvas();
      }, 100);
    }
  }, [isDetectingBlocks, detectedBlocks.length, image, isDragging, redrawCanvas]);

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Update cursor when hovering over blocks in move mode
    if (selectedTool === 'move' && !isDragging) {
      const hovered = [...detectedBlocks].reverse().find(block => {
        return x >= block.x && x <= block.x + block.width &&
               y >= block.y && y <= block.y + block.height;
      });
      
      if (hovered) {
        if (hoveredBlock?.id !== hovered.id) {
          setHoveredBlock(hovered);
          canvas.style.cursor = 'grab';
        }
      } else {
        if (hoveredBlock) {
          setHoveredBlock(null);
          canvas.style.cursor = 'move';
        }
      }
    }
    
    // Handle dragging detected blocks - actually move the block content
    if (isDragging && draggedBlock && image) {
      e.preventDefault();
      e.stopPropagation();
      
      const newX = Math.max(0, Math.min(x - dragOffset.x, canvas.width - draggedBlock.width));
      const newY = Math.max(0, Math.min(y - dragOffset.y, canvas.height - draggedBlock.height));
      
      // Only update if position changed significantly (to avoid too many redraws)
      if (Math.abs(newX - draggedBlock.x) < 2 && Math.abs(newY - draggedBlock.y) < 2) {
        return;
      }
      
      const ctx = canvas.getContext('2d');
      
      // CRITICAL: ALWAYS keep the ORIGINAL position empty (white) - FORCE FILL EVERY TIME
      if (originalImageData && originalImageData.blockId === draggedBlock.id) {
        // FORCE fill with white - do this EVERY time during drag to prevent block from reappearing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(originalImageData.x, originalImageData.y, draggedBlock.width, draggedBlock.height);
        
        // Draw dashed border to show it's empty
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(originalImageData.x, originalImageData.y, draggedBlock.width, draggedBlock.height);
        ctx.setLineDash([]);
      }
      
      // Step 2: Clear any previous intermediate position (if block was moved before)
      // Restore base image at the previous drag position (so other blocks show properly)
      if (draggedBlock.x !== originalImageData?.x || draggedBlock.y !== originalImageData?.y) {
        // Restore base image content at previous position
        ctx.clearRect(draggedBlock.x, draggedBlock.y, draggedBlock.width, draggedBlock.height);
        ctx.drawImage(image, draggedBlock.x, draggedBlock.y, draggedBlock.width, draggedBlock.height,
                     draggedBlock.x, draggedBlock.y, draggedBlock.width, draggedBlock.height);
      }
      
      // Step 3: Draw the block at the NEW position - show actual block content (not white, not transparent)
      if (draggedBlock.savedImageData) {
        // Set composite operation to ensure full coverage
        ctx.globalCompositeOperation = 'source-over';
        
        // Use putImageData to draw the actual block content (with its colors) at the new position
        // The savedImageData is already fully opaque (alpha = 255), so it will show the block's actual colors
        ctx.putImageData(draggedBlock.savedImageData, newX, newY);
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
      }
      
      // Step 4: Draw selection outline at new position (red to show it's being dragged)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(newX, newY, draggedBlock.width, draggedBlock.height);
      ctx.setLineDash([]);
      
      // Step 5: Update state
      const updatedBlocks = detectedBlocks.map(block => {
        if (block.id === draggedBlock.id) {
          return {
            ...block,
            x: newX,
            y: newY
          };
        }
        return block;
      });
      setDetectedBlocks(updatedBlocks);
      setDraggedBlock({ ...draggedBlock, x: newX, y: newY });
      
      return;
    }
    
    // Handle drawing
    if (isDrawing && (selectedTool === 'pencil' || selectedTool === 'eraser')) {
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (selectedTool === 'pencil') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = selectedColor;
      } else if (selectedTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      }
      
      ctx.stroke();
    }
  };

  // Handle mouse up
  const handleMouseUp = (e) => {
    if (e) {
      e.preventDefault();
    }
    
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
    
    if (isDragging && draggedBlock) {
      console.log('Mouse up - ending drag, block placed at:', draggedBlock.x, draggedBlock.y);
      const canvas = canvasRef.current;
      if (canvas && image) {
        const ctx = canvas.getContext('2d');
        
        // Step 1: Check if there's another block at the drop position - save its image data first
        const blockAtDropPosition = detectedBlocks.find(b => 
          b.id !== draggedBlock.id &&
          draggedBlock.x < b.x + b.width &&
          draggedBlock.x + draggedBlock.width > b.x &&
          draggedBlock.y < b.y + b.height &&
          draggedBlock.y + draggedBlock.height > b.y
        );
        
        // Step 2: Restore the ORIGINAL position with base image content (not white) so other blocks can be placed there
        if (originalImageData && originalImageData.blockId === draggedBlock.id) {
          // Restore the base image content at original position (not white)
          ctx.clearRect(originalImageData.x, originalImageData.y, draggedBlock.width, draggedBlock.height);
          ctx.drawImage(image, originalImageData.x, originalImageData.y, draggedBlock.width, draggedBlock.height,
                       originalImageData.x, originalImageData.y, draggedBlock.width, draggedBlock.height);
        }
        
        // Step 3: Clear any intermediate position (if block was at different position during drag)
        const oldBlock = detectedBlocks.find(b => b.id === draggedBlock.id);
        if (oldBlock && (oldBlock.x !== draggedBlock.x || oldBlock.y !== draggedBlock.y) &&
            (oldBlock.x !== originalImageData?.x || oldBlock.y !== originalImageData?.y)) {
          // Restore base image at intermediate position
          ctx.clearRect(oldBlock.x, oldBlock.y, oldBlock.width, oldBlock.height);
          ctx.drawImage(image, oldBlock.x, oldBlock.y, oldBlock.width, oldBlock.height,
                       oldBlock.x, oldBlock.y, oldBlock.width, oldBlock.height);
        }
        
        // Step 4: If dropping on another block, clear that block's area first (restore base image)
        if (blockAtDropPosition) {
          console.log('Dropping on another block, clearing that block first:', blockAtDropPosition.id);
          // Restore base image where the other block was
          ctx.clearRect(blockAtDropPosition.x, blockAtDropPosition.y, blockAtDropPosition.width, blockAtDropPosition.height);
          ctx.drawImage(image, blockAtDropPosition.x, blockAtDropPosition.y, blockAtDropPosition.width, blockAtDropPosition.height,
                       blockAtDropPosition.x, blockAtDropPosition.y, blockAtDropPosition.width, blockAtDropPosition.height);
        }
        
        // Step 5: Draw the dragged block at the NEW position (final placement) - show actual block content
        if (draggedBlock.savedImageData) {
          // Set composite operation to ensure full coverage (draws on top of everything)
          ctx.globalCompositeOperation = 'source-over';
          
          // putImageData will draw the actual block content (with its colors) at the new position
          // This will cover whatever is there (base image or another block)
          ctx.putImageData(draggedBlock.savedImageData, draggedBlock.x, draggedBlock.y);
          
          // Reset composite operation
          ctx.globalCompositeOperation = 'source-over';
          
          console.log('Block placed at new position with actual content:', draggedBlock.x, draggedBlock.y);
        }
        
        // Step 6: Update detectedBlocks to reflect the new position and preserve savedImageData
        const updatedBlocks = detectedBlocks.map(block => {
          if (block.id === draggedBlock.id) {
            return {
              ...block,
              x: draggedBlock.x,
              y: draggedBlock.y,
              savedImageData: draggedBlock.savedImageData // Preserve the image data for redrawCanvas
            };
          }
          return block;
        });
        setDetectedBlocks(updatedBlocks);
        
        // Step 7: If we dropped on another block, remove that block from detectedBlocks (it's been covered)
        if (blockAtDropPosition) {
          const blocksWithoutOverlapped = updatedBlocks.filter(b => b.id !== blockAtDropPosition.id);
          setDetectedBlocks(blocksWithoutOverlapped);
          console.log('Removed overlapped block from detected blocks:', blockAtDropPosition.id);
        }
      }
      
      setIsDragging(false);
      setDraggedBlock(null);
      setOriginalImageData(null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = selectedTool === 'move' ? 'move' : 'crosshair';
      }
      saveToHistory();
      // Don't call redrawCanvas here - we've already drawn everything manually above
      // redrawCanvas would clear and redraw, potentially overwriting our changes
    }
  };

  // Zoom in
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  // Zoom out
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  // Download image
  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `customized_polygon_${polygonId}_${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  // Save customization
  const handleSave = () => {
    if (canvasRef.current && onSave) {
      const imageData = canvasRef.current.toDataURL();
      onSave({
        polygonId,
        imageData,
        scale,
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border-b border-accent-light-border dark:border-accent-dark-border flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={selectedTool === 'pencil' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('pencil')}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Draw
          </Button>
          <Button
            variant={selectedTool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('eraser')}
          >
            <Eraser className="w-4 h-4 mr-2" />
            Erase
          </Button>
          <Button
            variant={selectedTool === 'move' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedTool('move');
              // Force redraw to show blocks when switching to move mode
              if (image && detectedBlocks.length > 0) {
                setTimeout(() => redrawCanvas(), 50);
              }
            }}
          >
            <Move className="w-4 h-4 mr-2" />
            Move Blocks {detectedBlocks.length > 0 && `(${detectedBlocks.length})`}
          </Button>
          <Button
            variant={selectedTool === 'add-block' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTool('add-block')}
          >
            <Square className="w-4 h-4 mr-2" />
            Add Block
          </Button>
          {roadNetworkData && (
            <Button
              variant={showRoads ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowRoads(!showRoads)}
              title="Toggle road network visibility"
            >
              {showRoads ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showRoads ? 'Hide Roads' : 'Show Roads'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label>Color</Label>
          <Input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-12 h-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label>Brush Size: {brushSize}px</Label>
          <Slider
            value={[brushSize]}
            onValueChange={([value]) => setBrushSize(value)}
            min={1}
            max={50}
            step={1}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="mx-2 text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
        
        {/* Road Network Controls */}
        {roadNetworkData && (
          <div className="toolbar-section" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', width: '100%' }}>
            <Label className="text-xs text-muted-foreground mb-2 block">
              <Route className="w-3 h-3 inline mr-1" />
              Road Network Layers
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={roadVisibility.primary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, primary: !roadVisibility.primary})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Primary
              </Button>
              <Button
                variant={roadVisibility.secondary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, secondary: !roadVisibility.secondary})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Secondary
              </Button>
              <Button
                variant={roadVisibility.local ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, local: !roadVisibility.local})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Local
              </Button>
              <Button
                variant={roadVisibility.pedestrian ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, pedestrian: !roadVisibility.pedestrian})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Pedestrian
              </Button>
              <Button
                variant={roadVisibility.bike ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, bike: !roadVisibility.bike})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Bike
              </Button>
              <Button
                variant={roadVisibility.emergency ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, emergency: !roadVisibility.emergency})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Emergency
              </Button>
              <Button
                variant={roadVisibility.residential ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoadVisibility({...roadVisibility, residential: !roadVisibility.residential})}
                style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
              >
                Residential
              </Button>
            </div>
            {roadNetworkData && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Primary:</span>
                  <span className="font-semibold text-red-600">{roadNetworkData.primary_roads?.features?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Secondary:</span>
                  <span className="font-semibold text-blue-600">{roadNetworkData.secondary_roads?.features?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Local:</span>
                  <span className="font-semibold text-green-600">{roadNetworkData.local_roads?.features?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">
                    {[
                      roadNetworkData.primary_roads?.features?.length || 0,
                      roadNetworkData.secondary_roads?.features?.length || 0,
                      roadNetworkData.local_roads?.features?.length || 0,
                      roadNetworkData.residential_roads?.features?.length || 0,
                      roadNetworkData.pedestrian_network?.features?.length || 0,
                      roadNetworkData.bike_network?.features?.length || 0,
                      roadNetworkData.emergency_routes?.features?.length || 0
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex justify-center items-center p-8 bg-slate-50 dark:bg-slate-900 origin-center" style={{ transform: `scale(${scale})` }}>
        {!image && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading image...</p>
              <p className="text-xs text-gray-500 mt-2">{imageUrl}</p>
            </div>
          </div>
        )}
        {isDetectingBlocks && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Detecting blocks...</span>
            </div>
          </div>
        )}
        {isLoadingRoads && (
          <div className="absolute top-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-sm">Loading road network...</span>
            </div>
          </div>
        )}
        {roadNetworkData && showRoads && (
          <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg z-10 border border-gray-200">
            <div className="flex items-center gap-2 text-xs">
              <Route className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">
                Road network: {
                  [
                    roadNetworkData.primary_roads?.features?.length || 0,
                    roadNetworkData.secondary_roads?.features?.length || 0,
                    roadNetworkData.local_roads?.features?.length || 0
                  ].reduce((a, b) => a + b, 0)
                } roads
              </span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`border-2 border-accent-light-border dark:border-accent-dark-border rounded-lg shadow-card bg-white dark:bg-slate-800 max-w-full max-h-full block hover:border-accent transition-all duration-200 ${
            selectedTool === 'move' ? 'cursor-move' : 
            selectedTool === 'pencil' ? 'cursor-crosshair' : 
            selectedTool === 'eraser' ? 'cursor-cell' : 
            'cursor-crosshair'
          }`}
          data-tool={selectedTool}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          style={{ 
            display: image ? 'block' : 'none',
            userSelect: 'none',
            touchAction: 'none'
          }}
        />
      </div>
    </div>
  );
};

export default ImageCustomizationEditor;

