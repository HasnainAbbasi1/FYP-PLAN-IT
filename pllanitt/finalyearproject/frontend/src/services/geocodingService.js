/**
 * Geocoding Service - Optimized API wrapper for Nominatim OpenStreetMap
 * Features:
 * - Request caching to reduce API calls
 * - Request cancellation for better performance
 * - Rate limiting awareness
 * - Retry logic with exponential backoff
 * - Consistent error handling
 */

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Rate limiting: Nominatim allows 1 request per second
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// Request configuration
const REQUEST_TIMEOUT = 8000; // 8 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second initial retry delay

// Cache storage
const searchCache = new Map();
const reverseCache = new Map();
let lastRequestTime = 0;
const pendingRequests = new Map();

/**
 * Get cache key for search
 */
const getSearchCacheKey = (query) => {
  return `search:${query.toLowerCase().trim()}`;
};

/**
 * Get cache key for reverse geocoding
 */
const getReverseCacheKey = (lat, lng) => {
  return `reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;
};

/**
 * Clean expired cache entries
 */
const cleanCache = (cache) => {
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    // Remove oldest 20% of entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    entries.slice(0, toRemove).forEach(([key]) => cache.delete(key));
  }
};

/**
 * Check if cache entry is valid
 */
const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

/**
 * Rate limiting: ensure minimum delay between requests
 */
const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
};

/**
 * Make API request with retry logic
 */
const makeRequest = async (url, options, retryCount = 0) => {
  try {
    await waitForRateLimit();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'PLAN-it Urban Planning App',
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      // Retry on server errors (5xx)
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeRequest(url, options, retryCount + 1);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES && !error.message.includes('HTTP')) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeRequest(url, options, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Search for locations using Nominatim API
 * @param {string} query - Search query
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Array>} Array of location results
 */
export const searchLocations = async (query, signal = null) => {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return [];
  }
  
  // Check cache
  const cacheKey = getSearchCacheKey(trimmedQuery);
  const cached = searchCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }
  
  // Check if there's a pending request for this query
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create request promise
  const requestPromise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedQuery)}&limit=5&addressdetails=1&extratags=1`;
      
      const data = await makeRequest(url, {
        signal: signal || undefined
      });
      
      // Validate and normalize response
      const results = Array.isArray(data) ? data : [];
      
      // Cache the results
      searchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });
      
      cleanCache(searchCache);
      
      return results;
    } catch (error) {
      console.error('Error searching locations:', error);
      throw error;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<string|null>} Address string or null
 */
export const reverseGeocode = async (lat, lng, signal = null) => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates');
  }
  
  // Round coordinates to 4 decimal places for caching (≈11 meters precision)
  const roundedLat = parseFloat(lat.toFixed(4));
  const roundedLng = parseFloat(lng.toFixed(4));
  
  // Check cache
  const cacheKey = getReverseCacheKey(roundedLat, roundedLng);
  const cached = reverseCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }
  
  // Check if there's a pending request for these coordinates
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create request promise
  const requestPromise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&addressdetails=1&zoom=18`;
      
      const data = await makeRequest(url, {
        signal: signal || undefined
      });
      
      const address = data?.display_name || null;
      
      // Cache the result
      if (address) {
        reverseCache.set(cacheKey, {
          data: address,
          timestamp: Date.now()
        });
        cleanCache(reverseCache);
      }
      
      return address;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
};

/**
 * Clear all caches
 */
export const clearCache = () => {
  searchCache.clear();
  reverseCache.clear();
  pendingRequests.clear();
};

/**
 * Get cache statistics (for debugging)
 */
export const getCacheStats = () => {
  return {
    searchCacheSize: searchCache.size,
    reverseCacheSize: reverseCache.size,
    pendingRequests: pendingRequests.size
  };
};

