// models/DEM.js
const mongoose = require('mongoose');

const demDataSchema = new mongoose.Schema({
  bounds: {
    north: { type: Number, required: true, min: -90, max: 90 },
    south: { type: Number, required: true, min: -90, max: 90 },
    east: { type: Number, required: true, min: -180, max: 180 },
    west: { type: Number, required: true, min: -180, max: 180 }
  },
  resolution: {
    type: Number,
    required: true,
    default: 30, // 30 meters default resolution
    min: 1,
    max: 1000
  },
  elevationData: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    elevation: { type: Number, required: true },
    accuracy: { type: Number, default: null }
  }],
  metadata: {
    source: { type: String, default: 'SRTM' },
    processingDate: { type: Date, default: Date.now },
    dataPoints: { type: Number, required: true },
    minElevation: { type: Number, required: true },
    maxElevation: { type: Number, required: true },
    avgElevation: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'cached'],
    default: 'processing'
  },
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Cache for 24 hours
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for area calculation
demDataSchema.virtual('area').get(function() {
  const { north, south, east, west } = this.bounds;
  // Approximate area in square kilometers
  const latDiff = north - south;
  const lngDiff = east - west;
  const avgLat = (north + south) / 2;
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos(avgLat * Math.PI / 180);
  
  return Math.abs(latDiff * kmPerDegreeLat * lngDiff * kmPerDegreeLng);
});

// Static method to generate cache key
demDataSchema.statics.generateCacheKey = function(bounds, resolution) {
  const { north, south, east, west } = bounds;
  return `dem_${north}_${south}_${east}_${west}_${resolution}`.replace(/\./g, '_');
};

// Static method to validate bounds
demDataSchema.statics.validateBounds = function(bounds) {
  const { north, south, east, west } = bounds;
  
  if (typeof north !== 'number' || typeof south !== 'number' ||
      typeof east !== 'number' || typeof west !== 'number') {
    throw new Error('All bounds must be numbers');
  }
  
  if (north < -90 || north > 90 || south < -90 || south > 90) {
    throw new Error('Latitude values must be between -90 and 90');
  }
  
  if (east < -180 || east > 180 || west < -180 || west > 180) {
    throw new Error('Longitude values must be between -180 and 180');
  }
  
  if (north <= south) {
    throw new Error('North boundary must be greater than south boundary');
  }
  
  if (east <= west) {
    throw new Error('East boundary must be greater than west boundary');
  }
  
  return true;
};

// Instance method to calculate statistics
demDataSchema.methods.calculateStatistics = function() {
  if (!this.elevationData || this.elevationData.length === 0) {
    return null;
  }
  
  const elevations = this.elevationData.map(point => point.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const sum = elevations.reduce((acc, val) => acc + val, 0);
  const avg = sum / elevations.length;
  
  // Calculate standard deviation
  const variance = elevations.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / elevations.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    min,
    max,
    average: Math.round(avg * 100) / 100,
    standardDeviation: Math.round(stdDev * 100) / 100,
    dataPoints: elevations.length
  };
};

// Pre-save hook to update metadata
demDataSchema.pre('save', function(next) {
  if (this.elevationData && this.elevationData.length > 0) {
    const stats = this.calculateStatistics();
    this.metadata.dataPoints = stats.dataPoints;
    this.metadata.minElevation = stats.min;
    this.metadata.maxElevation = stats.max;
    this.metadata.avgElevation = stats.average;
  }
  next();
});

// Index for efficient querying
demDataSchema.index({ 'bounds.north': 1, 'bounds.south': 1, 'bounds.east': 1, 'bounds.west': 1 });
demDataSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DEM', demDataSchema);