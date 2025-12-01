import { useState, useCallback } from 'react';
import { 
  fetchLandUseData, 
  fetchSatelliteImagery, 
  fetchFloodRiskData,
  geocodeLocation 
} from '../services/dataIngestionApi';
import DEMDataService from '../services/demDataService';

export const useDataIngestion = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState({});
  const [progress, setProgress] = useState({});
  const [bounds, setBounds] = useState({
    latMin: '37.7749',
    latMax: '37.8049',
    lngMin: '-122.4194',
    lngMax: '-122.3894'
  });
  const [coordinateSystem, setCoordinateSystem] = useState('wgs84');
  const [searchLocation, setSearchLocation] = useState('');

  const updateBounds = useCallback((newBounds) => {
    setBounds(prev => ({ ...prev, ...newBounds }));
  }, []);

  const searchAndSetLocation = useCallback(async (query) => {
    setLoading(prev => ({ ...prev, geocoding: true }));
    
    const result = await geocodeLocation(query);
    
    if (result.success) {
      // Update bounds based on geocoded location (approximate 1km radius)
      const offset = 0.005; // roughly 500m
      updateBounds({
        latMin: (result.lat - offset).toString(),
        latMax: (result.lat + offset).toString(),
        lngMin: (result.lng - offset).toString(),
        lngMax: (result.lng + offset).toString()
      });
      
      setSearchLocation(result.displayName);
    }
    
    setLoading(prev => ({ ...prev, geocoding: false }));
    return result;
  }, [updateBounds]);

  const fetchDataSource = useCallback(async (sourceType, options = {}) => {
    const loadingKey = `fetch_${sourceType}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    setProgress(prev => ({ ...prev, [loadingKey]: 0 }));

    let result;
    const boundsObj = {
      latMin: parseFloat(bounds.latMin),
      latMax: parseFloat(bounds.latMax),
      lngMin: parseFloat(bounds.lngMin),
      lngMax: parseFloat(bounds.lngMax)
    };

    // Progress tracking function
    const progressCallback = (progressPercent) => {
      setProgress(prev => ({
        ...prev,
        [loadingKey]: progressPercent
      }));
    };

    try {
      switch (sourceType) {
        case 'elevation':
          result = await DEMDataService.fetchDEMData(boundsObj, {
            onProgress: progressCallback,
            ...options
          });
          break;
        case 'landuse':
          result = await fetchLandUseData(boundsObj);
          break;
        case 'imagery':
          result = await fetchSatelliteImagery(boundsObj);
          break;
        case 'flood':
          result = await fetchFloodRiskData(boundsObj);
          break;
        default:
          throw new Error('Unknown data source type');
      }

      if (result.success) {
        const newDataset = {
          id: Date.now(),
          name: getDatasetName(sourceType),
          type: sourceType,
          source: result.metadata?.source || 'Unknown',
          dateAdded: new Date().toISOString().split('T')[0],
          status: 'valid',
          size: result.size,
          data: result.data,
          metadata: result.metadata,
          downloadUrl: result.downloadUrl
        };

        setDatasets(prev => [...prev, newDataset]);
      }
    } catch (error) {
      console.error(`Error fetching ${sourceType} data:`, error);
      result = { success: false, error: error.message };
    } finally {
      setProgress(prev => ({ ...prev, [loadingKey]: 100 }));
      setTimeout(() => {
        setLoading(prev => ({ ...prev, [loadingKey]: false }));
        setProgress(prev => ({ ...prev, [loadingKey]: 0 }));
      }, 500);
    }

    return result;
  }, [bounds]);

  const uploadFile = useCallback((file) => {
    const newDataset = {
      id: Date.now(),
      name: file.name,
      type: getFileType(file.name),
      source: 'User Upload',
      dateAdded: new Date().toISOString().split('T')[0],
      status: 'processing',
      size: file.size,
      data: file
    };

    setDatasets(prev => [...prev, newDataset]);

    // Simulate processing
    setTimeout(() => {
      setDatasets(prev => 
        prev.map(dataset => 
          dataset.id === newDataset.id 
            ? { ...dataset, status: 'valid' }
            : dataset
        )
      );
    }, 2000);

    return newDataset;
  }, []);

  const removeDataset = useCallback((datasetId) => {
    setDatasets(prev => prev.filter(dataset => dataset.id !== datasetId));
  }, []);

  const validateDataset = useCallback((datasetId) => {
    setDatasets(prev => 
      prev.map(dataset => 
        dataset.id === datasetId 
          ? { ...dataset, status: dataset.status === 'valid' ? 'needs_review' : 'valid' }
          : dataset
      )
    );
  }, []);

  return {
    datasets,
    loading,
    progress,
    bounds,
    coordinateSystem,
    searchLocation,
    updateBounds,
    setCoordinateSystem,
    setSearchLocation,
    searchAndSetLocation,
    fetchDataSource,
    uploadFile,
    removeDataset,
    validateDataset
  };
};

// Helper functions
const getDatasetName = (type) => {
  const names = {
    elevation: 'Digital Elevation Model',
    landuse: 'Land Use Data',
    imagery: 'Satellite Imagery',
    flood: 'Flood Risk Assessment'
  };
  return names[type] || 'Unknown Dataset';
};

const getFileType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  if (extension === 'geojson' || extension === 'json') return 'vector';
  if (extension === 'csv') return 'tabular';
  if (extension === 'tif' || extension === 'tiff') return 'raster';
  if (extension === 'shp') return 'vector';
  return 'unknown';
};