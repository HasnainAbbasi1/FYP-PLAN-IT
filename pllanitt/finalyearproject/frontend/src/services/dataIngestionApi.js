const OPENTOPOGRAPHY_API_KEY = '4e545b4a2979963437de8be5f0ef4506';
const OPENTOPOGRAPHY_BASE_URL = 'https://cloud.sdsc.edu/v1/CommunityDEM';

// OpenTopography API service
export const fetchElevationData = async (bounds) => {
  const { latMin, latMax, lngMin, lngMax } = bounds;
  
  try {
    const response = await fetch(
      `${OPENTOPOGRAPHY_BASE_URL}?demtype=SRTMGL3&south=${latMin}&north=${latMax}&west=${lngMin}&east=${lngMax}&outputFormat=GTiff&API_Key=${OPENTOPOGRAPHY_API_KEY}`,
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/octet-stream'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    return {
      success: true,
      data: blob,
      size: blob.size,
      type: 'elevation',
      source: 'OpenTopography'
    };
  } catch (error) {
    console.error('Error fetching elevation data:', error);
    return {
      success: false,
      error: error.message,
      type: 'elevation',
      source: 'OpenTopography'
    };
  }
};

// Mock API for other data sources
export const fetchLandUseData = async (bounds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          features: [],
          type: 'FeatureCollection'
        },
        size: 1024 * 50, // 50KB mock size
        type: 'landuse',
        source: 'Mock Service',
        metadata: {
          source: 'Mock Land Use Service',
          fetchDate: new Date().toISOString()
        }
      });
    }, 2000);
  });
};

export const fetchSatelliteImagery = async (bounds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: 'mock_satellite_image_url',
        size: 1024 * 1024 * 5, // 5MB mock size
        type: 'imagery',
        source: 'Mock Service',
        metadata: {
          source: 'Mock Satellite Service',
          fetchDate: new Date().toISOString()
        }
      });
    }, 3000);
  });
};

export const fetchFloodRiskData = async (bounds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          riskLevel: 'moderate',
          zones: []
        },
        size: 1024 * 20, // 20KB mock size
        type: 'flood',
        source: 'Mock FEMA Service',
        metadata: {
          source: 'Mock FEMA Service',
          fetchDate: new Date().toISOString()
        }
      });
    }, 1500);
  });
};

// Improved geocoding service with better error handling
export const geocodeLocation = async (query) => {
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error: 'Please enter a location to search'
    };
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'DataIngestionApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding service error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: `No results found for "${query}". Try a more specific location.`
      };
    }
    
    const result = data[0];
    return {
      success: true,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      results: data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name
      }))
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: `Failed to search location: ${error.message}`
    };
  }
};