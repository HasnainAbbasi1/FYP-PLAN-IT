import React, { useState } from 'react';
import { 
  TrendingUp, 
  Mountain, 
  Activity, 
  AlertTriangle, 
  Droplet, 
  Building2, 
  BarChart3, 
  CheckCircle, 
  FileText,
  Info,
  Waves,
  MapPin,
  Target
} from 'lucide-react';

const TerrainAnalysisPanel = ({ analysisData, onLayerToggle }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeLayers, setActiveLayers] = useState({
    slope: true,
    elevation: true,
    flood: false,
    zoning: false
  });

  if (!analysisData) {
    return (
      <div className="flex flex-col gap-6 m-0 p-0 bg-transparent border-none rounded-none overflow-visible">
        <div className="flex flex-col gap-6 p-0 bg-transparent">
          <p>No terrain analysis data available. Process an area to see analysis results.</p>
        </div>
      </div>
    );
  }

  // Support current backend schema (stats + validation + preview/downloads)
  const { stats, validation, preview_url, tif_url, classified_url, json_url } = analysisData || {};

  // Backward-compat or future fields
  const {
    slope_analysis,
    flood_analysis,
    erosion_analysis,
    zoning_analysis,
    water_availability
  } = analysisData;

  const handleLayerToggle = (layer) => {
    const newLayers = {
      ...activeLayers,
      [layer]: !activeLayers[layer]
    };
    setActiveLayers(newLayers);
    onLayerToggle(newLayers);
  };

  // Flatten JSON into key path => value rows (safe)
  const flattenJson = (obj, parentKey = '') => {
    const rows = [];
    const seen = new WeakSet();
    const MAX_DEPTH = 6;
    const helper = (value, keyPath, depth) => {
      if (depth > MAX_DEPTH) { rows.push([keyPath, '…']); return; }
      if (value !== null && typeof value === 'object') {
        if (seen.has(value)) { rows.push([keyPath, '[Circular]']); return; }
        seen.add(value);
        if (Array.isArray(value)) {
          rows.push([keyPath, `Array(${value.length})`]);
          value.forEach((v, i) => helper(v, `${keyPath}[${i}]`, depth + 1));
        } else {
          rows.push([keyPath || 'root', `Object(${Object.keys(value || {}).length})`]);
          Object.entries(value || {}).forEach(([k, v]) => helper(v, keyPath ? `${keyPath}.${k}` : k, depth + 1));
        }
      } else {
        rows.push([keyPath, value]);
      }
    };
    try { helper(obj, parentKey, 0); } catch (e) { rows.push(['error', String(e)]); }
    return rows;
  };

  // ---------------- UI helpers ----------------
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const renderDetails = (data, pathPrefix = '', depth = 0) => {
    const MAX_DEPTH = 6;
    if (depth > MAX_DEPTH) {
      return (
        <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px" key={`${pathPrefix}.__depth`}>
          <span className="text-muted-foreground font-medium text-sm">{pathPrefix || 'value'}</span>
          <span className="font-bold text-foreground text-base">…</span>
        </div>
      );
    }
    if (data === null || data === undefined) return (
      <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px"><span className="text-muted-foreground font-medium text-sm">{pathPrefix || 'value'}</span><span className="font-bold text-foreground text-base">—</span></div>
    );
    if (typeof data !== 'object') {
      return (
        <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px" key={pathPrefix}>
          <span className="text-muted-foreground font-medium text-sm">{pathPrefix}</span>
          <span className="font-bold text-foreground text-base">{String(data)}</span>
        </div>
      );
    }

    if (Array.isArray(data)) {
      return (
        <div className="mb-2 border border-border rounded-lg overflow-hidden" key={pathPrefix}>
          <div className="px-4 py-2 bg-muted cursor-pointer hover:bg-accent transition-colors flex items-center justify-between" onClick={() => toggle(pathPrefix)}>
            {pathPrefix || 'Array'} ({data.length}) <span className="text-muted-foreground">{expanded[pathPrefix] ? '▾' : '▸'}</span>
          </div>
          {expanded[pathPrefix] && (
            <div className="p-2">
              {data.map((v, i) => (
                <div className="mb-1" key={`${pathPrefix}[${i}]`}>
                  {renderDetails(v, `${pathPrefix}[${i}]`, depth + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // object
    const keys = Object.keys(data);
    return (
      <div className="mb-2 border border-border rounded-lg overflow-hidden" key={pathPrefix}>
        <div className="px-4 py-2 bg-muted cursor-pointer hover:bg-accent transition-colors flex items-center justify-between" onClick={() => toggle(pathPrefix)}>
          {pathPrefix || 'Object'} ({keys.length}) <span className="text-muted-foreground">{expanded[pathPrefix] ? '▾' : '▸'}</span>
        </div>
        {expanded[pathPrefix] && (
          <div className="p-2 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
            {keys.map((k) => (
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px" key={`${pathPrefix}.${k}`}>
                <span className="text-muted-foreground font-medium text-sm">{k}</span>
                <span className="font-bold text-foreground text-base">
                  {typeof data[k] === 'object' ? (
                    <div className="ml-2">
                      {renderDetails(data[k], `${pathPrefix ? pathPrefix + '.' : ''}${k}`, depth + 1)}
                    </div>
                  ) : (
                    String(data[k])
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Safe stringify (guards circular refs)
  const safeStringify = (obj) => {
    const seen = new WeakSet();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        if (typeof value === 'function') return '[Function]';
        return value;
      }, 2);
    } catch {
      try { return JSON.stringify(obj); } catch { return '{}'; }
    }
  };

  const SlopeTab = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 m-0">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
        <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Mountain className="w-5 h-5 inline mr-2" />Slope Analysis</h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
            <span className="text-muted-foreground font-medium text-sm">Mean Slope:</span>
            <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>{slope_analysis?.mean_slope?.toFixed(2)}<span style={{ fontSize: '16px' }}>°</span></span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
            <span className="text-muted-foreground font-medium text-sm">Max Slope:</span>
            <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>{slope_analysis?.max_slope?.toFixed(2)}<span style={{ fontSize: '16px' }}>°</span></span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
            <span className="text-muted-foreground font-medium text-sm">Min Slope:</span>
            <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>{slope_analysis?.min_slope?.toFixed(2)}<span style={{ fontSize: '16px' }}>°</span></span>
          </div>
        </div>
        
        <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Slope Distribution</h5>
        {slope_analysis?.category_stats && Object.entries(slope_analysis.category_stats).map(([id, stat]) => (
          <div key={id} className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
            <span className="text-muted-foreground font-medium text-sm">{stat.name}:</span>
            <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>{stat.area_percentage}%</span>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
        <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Info className="w-5 h-5 inline mr-2" />Slope Recommendations</h4>
        <div className="rounded-xl p-4 my-4 border-l-4 border-primary shadow-md bg-muted text-foreground border-l-primary">
          <strong className="text-sm" style={{ fontSize: '14px' }}>Construction Guidelines:</strong>
          <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
            <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Slopes &lt;15°: Suitable for most development</li>
            <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Slopes 15-30°: Requires engineered foundations</li>
            <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Slopes &gt;30°: Limited development potential</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const FloodTab = () => {
    // Support both old and new flood analysis formats
    const riskStats = flood_analysis?.risk_statistics || flood_analysis?.flood_stats;
    const recommendations = flood_analysis?.recommendations || [];
    
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 m-0">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Waves className="w-5 h-5 inline mr-2" />Flood Risk Assessment</h4>
          {riskStats?.high_risk_area_percent !== undefined ? (
            // New advanced format with percentages
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>High Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-red-600 to-red-700"></span>
                  {riskStats.high_risk_area_percent?.toFixed(2)}% <span style={{ fontSize: '11px' }}>({riskStats.high_risk_area_pixels?.toLocaleString()} pixels)</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Medium Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-yellow-500 to-yellow-600"></span>
                  {riskStats.medium_risk_area_percent?.toFixed(2)}% <span style={{ fontSize: '11px' }}>({riskStats.medium_risk_area_pixels?.toLocaleString()} pixels)</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Low Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-green-500 to-green-600"></span>
                  {riskStats.low_risk_area_percent?.toFixed(2)}% <span style={{ fontSize: '11px' }}>({riskStats.low_risk_area_pixels?.toLocaleString()} pixels)</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Mean Risk Score:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>{riskStats.mean_risk_score?.toFixed(2)} / 3.0</span>
              </div>
            </div>
          ) : (
            // Old format
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>High Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-red-600 to-red-700"></span>
                  {flood_analysis?.flood_stats?.high_risk_area?.toLocaleString()} pixels
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Medium Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-yellow-500 to-yellow-600"></span>
                  {flood_analysis?.flood_stats?.medium_risk_area?.toLocaleString()} pixels
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Low Risk Area:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>
                  <span className="inline-block w-3 h-3 rounded-full mr-2 shadow-md bg-gradient-to-br from-green-500 to-green-600"></span>
                  {flood_analysis?.flood_stats?.low_risk_area?.toLocaleString()} pixels
                </span>
              </div>
            </div>
          )}

          {flood_analysis?.risk_factors && (
            <div className="stat-grid" style={{marginTop: '20px'}}>
              <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Risk Factors</h5>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Elevation Risk:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '13px' }}>{flood_analysis.risk_factors.elevation_risk?.mean?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Flow Accumulation Risk:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '13px' }}>{flood_analysis.risk_factors.flow_accumulation_risk?.mean?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
                <span className="text-muted-foreground font-medium text-sm" style={{ fontSize: '11px' }}>Drainage Proximity Risk:</span>
                <span className="font-bold text-foreground text-base" style={{ fontSize: '13px' }}>{flood_analysis.risk_factors.drainage_proximity_risk?.mean?.toFixed(2)}</span>
              </div>
            </div>
          )}

          <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Flood Risk Legend</h5>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 my-4">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-lg border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <div className="w-5 h-5 rounded-md border-2 border-white shadow-md" style={{backgroundColor: '#4caf50'}}></div>
              <span className="text-xs" style={{ fontSize: '12px' }}>Low Risk</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-lg border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <div className="w-5 h-5 rounded-md border-2 border-white shadow-md" style={{backgroundColor: '#ff9800'}}></div>
              <span className="text-xs" style={{ fontSize: '12px' }}>Medium Risk</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-lg border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <div className="w-5 h-5 rounded-md border-2 border-white shadow-md" style={{backgroundColor: '#f44336'}}></div>
              <span className="text-xs" style={{ fontSize: '12px' }}>High Risk</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Info className="w-5 h-5 inline mr-2" />Flood Mitigation</h4>
          <div className="rounded-xl p-4 my-4 border-l-4 border-yellow-500 shadow-md bg-muted text-foreground border-l-yellow-500">
            <strong style={{ fontSize: '14px' }}>Recommended Actions:</strong>
            {recommendations.length > 0 ? (
              <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            ) : (
              <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
                <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Implement proper drainage systems in high-risk areas</li>
                <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Consider elevation requirements for new construction</li>
                <li>Preserve natural floodplains and wetlands</li>
                <li>Install flood barriers where necessary</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ErosionTab = () => {
    // Support both old and new erosion analysis formats
    const soilLoss = erosion_analysis?.annual_soil_loss || {};
    const erosionStats = erosion_analysis?.erosion_stats || {};
    const erosionRisk = erosion_analysis?.erosion_risk_categories || {};
    const usleFactors = erosion_analysis?.usle_factors || {};
    const recommendations = erosion_analysis?.recommendations || erosionStats?.recommendations || [];
    
    const meanLoss = soilLoss.mean || erosionStats.mean_soil_loss || 0;
    
    return (
      <div className="analysis-grid">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><AlertTriangle className="w-5 h-5 inline mr-2" />Soil Erosion Analysis (USLE)</h4>
          {soilLoss.mean !== undefined ? (
            // New advanced format with USLE
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '12px' }}>Annual Soil Loss (Mean):</span>
                <span className="stat-value" style={{ fontSize: '14px' }}>{meanLoss.toFixed(2)} t/ha/year</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '12px' }}>Max Soil Loss:</span>
                <span className="stat-value" style={{ fontSize: '14px' }}>{soilLoss.max?.toFixed(2)} t/ha/year</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '12px' }}>Min Soil Loss:</span>
                <span className="stat-value" style={{ fontSize: '14px' }}>{soilLoss.min?.toFixed(2)} t/ha/year</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '12px' }}>Median Soil Loss:</span>
                <span className="stat-value" style={{ fontSize: '14px' }}>{soilLoss.median?.toFixed(2)} t/ha/year</span>
              </div>
              {erosionRisk.high_erosion_percent !== undefined && (
                <>
                  <div className="stat-item">
                    <span className="stat-label" style={{ fontSize: '12px' }}>High Erosion Area:</span>
                    <span className="stat-value" style={{ fontSize: '14px' }}>
                      <span className="risk-indicator risk-very-high"></span>
                      {erosionRisk.high_erosion_percent?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label" style={{ fontSize: '12px' }}>Medium Erosion Area:</span>
                    <span className="stat-value" style={{ fontSize: '14px' }}>
                      <span className="risk-indicator risk-medium"></span>
                      {erosionRisk.medium_erosion_percent?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label" style={{ fontSize: '12px' }}>Low Erosion Area:</span>
                    <span className="stat-value" style={{ fontSize: '14px' }}>
                      <span className="risk-indicator risk-low"></span>
                      {erosionRisk.low_erosion_percent?.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Old format - with smaller text
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>Mean Soil Loss:</span>
                <span className="stat-value" style={{ fontSize: '20px', fontWeight: 'bold' }}>{meanLoss.toFixed(2)} <span style={{ fontSize: '13px' }}>t/ha/yr</span></span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>High Erosion Area:</span>
                <span className="stat-value" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  <span className="risk-indicator risk-very-high"></span>
                  {erosionStats.high_erosion_area?.toLocaleString()} <span style={{ fontSize: '13px' }}>pixels</span>
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>Risk Level:</span>
                <span className="stat-value" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {meanLoss > 50 ? 'Very High' : meanLoss > 20 ? 'High' : meanLoss > 5 ? 'Medium' : 'Low'}
                </span>
              </div>
            </div>
          )}

          {usleFactors.R_factor !== undefined && (
            <div className="stat-grid" style={{marginTop: '20px'}}>
              <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>USLE Factors</h5>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>R Factor (Rainfall Erosivity):</span>
                <span className="stat-value" style={{ fontSize: '13px' }}>{usleFactors.R_factor}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>K Factor (Soil Erodibility):</span>
                <span className="stat-value" style={{ fontSize: '13px' }}>{usleFactors.K_factor}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>LS Factor (Mean):</span>
                <span className="stat-value" style={{ fontSize: '13px' }}>{usleFactors.LS_factor_mean?.toFixed(3)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>C Factor (Cover Management):</span>
                <span className="stat-value" style={{ fontSize: '13px' }}>{usleFactors.C_factor}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>P Factor (Support Practices):</span>
                <span className="stat-value" style={{ fontSize: '13px' }}>{usleFactors.P_factor}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Target className="w-5 h-5 inline mr-2" />Erosion Control Strategies</h4>
          <div className="rounded-xl p-4 my-4 border-l-4 border-green-500 shadow-md bg-muted text-foreground border-l-green-500">
            <strong style={{ fontSize: '14px' }}>Mitigation Recommendations:</strong>
            {recommendations.length > 0 ? (
              <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            ) : (
              <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
                <li>Implement terracing on slopes &gt;30°</li>
                <li>Use erosion control blankets on steep areas</li>
                <li>Plant vegetation to stabilize soil</li>
                <li>Maintain proper drainage to prevent water-induced erosion</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  const WaterTab = () => {
    if (!water_availability || Object.keys(water_availability).length === 0) {
      return (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Droplet className="w-5 h-5 inline mr-2" />Water Availability</h4>
          <p>Water availability data not available for this analysis.</p>
        </div>
      );
    }

    const twi = water_availability.topographic_wetness_index || {};
    const distance = water_availability.distance_to_water || {};
    const availability = water_availability.water_availability_score || {};
    const flowStats = water_availability.flow_accumulation_stats || {};

    return (
      <div className="analysis-grid">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Droplet className="w-5 h-5 inline mr-2" />Water Availability Assessment</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Water Availability Score:</span>
              <span className="stat-value" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {availability.mean !== undefined ? (
                  <>
                    {availability.mean.toFixed(3)} <span style={{ fontSize: '14px' }}>/ 1.0</span>
                    <span className={`risk-indicator ${availability.mean >= 0.7 ? 'risk-low' : availability.mean >= 0.5 ? 'risk-medium' : 'risk-high'}`}></span>
                  </>
                ) : 'N/A'}
              </span>
            </div>
            {availability.classification && (
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>Classification:</span>
                <span className="stat-value" style={{ fontSize: '16px', fontWeight: '600' }}>{availability.classification}</span>
              </div>
            )}
            {availability.min !== undefined && (
              <div className="stat-item">
                <span className="stat-label" style={{ fontSize: '11px' }}>Score Range:</span>
                <span className="stat-value" style={{ fontSize: '14px' }}>{availability.min.toFixed(3)} - {availability.max.toFixed(3)}</span>
              </div>
            )}
          </div>

          <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Topographic Wetness Index (TWI)</h5>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Mean TWI:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{twi.mean?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Max TWI:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{twi.max?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Min TWI:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{twi.min?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Std Dev:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{twi.std?.toFixed(2)}</span>
            </div>
          </div>

          <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Distance to Water Sources</h5>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Mean Distance:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{distance.mean_meters?.toFixed(2)} m</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Min Distance:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{distance.min_meters?.toFixed(2)} m</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Max Distance:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{distance.max_meters?.toFixed(2)} m</span>
            </div>
          </div>

          <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Flow Accumulation</h5>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Mean Flow:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{flowStats.mean?.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label" style={{ fontSize: '11px' }}>Max Flow:</span>
              <span className="stat-value" style={{ fontSize: '14px' }}>{flowStats.max?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Info className="w-5 h-5 inline mr-2" />Water Availability Insights</h4>
          <div className="rounded-xl p-4 my-4 border-l-4 border-primary shadow-md bg-muted text-foreground border-l-primary">
            <strong style={{ fontSize: '14px' }}>Key Information:</strong>
            <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
              <li>Higher TWI values indicate better water retention capacity</li>
              <li>Lower distance to water sources improves accessibility</li>
              <li>Flow accumulation shows water collection potential</li>
              <li>Water availability score combines all factors for overall assessment</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const ZoningTab = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 m-0">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
        <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Building2 className="w-5 h-5 inline mr-2" />Terrain-Based Zoning</h4>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {zoning_analysis?.zoning_stats && Object.entries(zoning_analysis.zoning_stats).map(([id, stat]) => (
            <div key={id} className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <span className="text-muted-foreground font-medium text-sm">{stat.name}:</span>
              <span className="font-bold text-foreground text-base" style={{ fontSize: '14px' }}>{stat.area_percentage}%</span>
            </div>
          ))}
        </div>

        <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>Zoning Legend</h5>
        <div className="zoning-legend">
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#4caf50'}}></div>
            <span style={{ fontSize: '12px' }}>Suitable for Development</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#ffeb3b'}}></div>
            <span style={{ fontSize: '12px' }}>Limited Development</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#ff9800'}}></div>
            <span style={{ fontSize: '12px' }}>Conservation Area</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#f44336'}}></div>
            <span style={{ fontSize: '12px' }}>High-Risk (Avoid)</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
        <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5"><Info className="w-5 h-5 inline mr-2" />Zoning Recommendations</h4>
        <div className="rounded-xl p-4 my-4 border-l-4 border-primary shadow-md bg-muted text-foreground border-l-primary">
          <strong className="text-sm" style={{ fontSize: '14px' }}>Planning Guidelines:</strong>
          <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
            {zoning_analysis?.zoning_stats && (
              <>
                <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Focus development in {zoning_analysis.zoning_stats[1]?.area_percentage}% suitable areas</li>
                <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Implement conservation measures in {zoning_analysis.zoning_stats[3]?.area_percentage}% conservation zones</li>
                <li className="mb-2 text-muted-foreground relative pl-5 before:content-['✓'] before:absolute before:left-0 before:text-green-500 before:font-bold">Restrict construction in {zoning_analysis.zoning_stats[4]?.area_percentage}% high-risk areas</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div>
      <div className="analysis-alert alert-info">
        <h4 style={{ fontSize: '16px' }}><Mountain className="w-5 h-5 inline mr-2" />Terrain Analysis Summary</h4>
        <p style={{ fontSize: '13px' }}>Comprehensive terrain assessment for the selected polygon, including validation, elevation stats, and visualization assets.</p>
      </div>

      {/* Quick Stats - card layout to match other analysis sections */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-md flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Mean Elevation
          </span>
          <span className="text-3xl font-bold text-card-foreground">
            {stats?.mean_elevation?.toFixed?.(2)}
            <span className="text-base opacity-70 ml-1">m</span>
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-md flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Elevation Range
          </span>
          <span className="text-xl font-bold text-card-foreground">
            {stats?.min_elevation?.toFixed?.(2)}–{stats?.max_elevation?.toFixed?.(2)}
            <span className="text-base opacity-70 ml-1">m</span>
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-md flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Mean Slope
          </span>
          <span className="text-3xl font-bold text-card-foreground">
            {slope_analysis?.mean_slope?.toFixed?.(2)}
            <span className="text-xl opacity-70 ml-1">°</span>
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-md flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Analysis Type
          </span>
          <span className="text-sm font-semibold text-card-foreground">
            {stats?.analysis_type === 'advanced' ? 'Advanced (Real DEM)' : 'Basic'}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            CRS: {stats?.target_crs || 'EPSG:4326'} • Types: {Array.isArray(stats?.data_types_processed) ? stats.data_types_processed.join(', ') : 'DEM'}
          </span>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4><Target className="w-5 h-5 inline mr-2" />Key Recommendations</h4>
          <ul className="m-3 pl-5 list-none" style={{ fontSize: '13px' }}>
            <li>Consider slope stability in construction planning</li>
            <li>Implement flood mitigation measures in risk zones</li>
            <li>Apply erosion control practices on steep slopes</li>
            <li>Follow terrain-based zoning guidelines</li>
          </ul>
        </div>
      </div>

      {preview_url && (
        <div className="analysis-card preview-card">
          <h4 style={{ fontSize: '16px' }}><MapPin className="w-5 h-5 inline mr-2" />Preview</h4>
          <div className="preview-wrapper">
            <img src={preview_url} alt="DEM Preview" className="preview-image" />
          </div>
          <div className="download-actions">
            {tif_url && <a className="btn" style={{ fontSize: '13px' }} href={tif_url} target="_blank" rel="noreferrer">Download Clipped DEM (.tif)</a>}
            {classified_url && <a className="btn" style={{ fontSize: '13px' }} href={classified_url} target="_blank" rel="noreferrer">Download Classified PNG</a>}
            {json_url && <a className="btn" style={{ fontSize: '13px' }} href={json_url} target="_blank" rel="noreferrer">Download Stats (.json)</a>}
          </div>
        </div>
      )}
    </div>
  );

  const ValidationTab = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 m-0">
      {/* Summary card */}
      {stats && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            Validation Summary
          </h4>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <span className="text-muted-foreground font-medium text-sm">Processed:</span>
              <span className="font-bold text-foreground text-base" style={{ fontSize: '13px' }}>
                {new Date(stats.processing_timestamp || Date.now()).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <span className="text-muted-foreground font-medium text-sm">Mean Elevation:</span>
              <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {stats.mean_elevation?.toFixed?.(2)}
                <span style={{ fontSize: '16px' }}> m</span>
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <span className="text-muted-foreground font-medium text-sm">Min Elevation:</span>
              <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {stats.min_elevation?.toFixed?.(2)}
                <span style={{ fontSize: '16px' }}> m</span>
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px">
              <span className="text-muted-foreground font-medium text-sm">Max Elevation:</span>
              <span className="font-bold text-foreground text-base" style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {stats.max_elevation?.toFixed?.(2)}
                <span style={{ fontSize: '16px' }}> m</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Polygon Validation (from geojson_validation.summary if present) */}
      {validation?.geojson_validation && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 className="m-0 mb-4 text-card-foreground text-lg font-bold flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 inline mr-2" />
            Polygon Validation
          </h4>
          <div className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px mb-4">
            <span className="text-muted-foreground font-medium text-sm">Status:</span>
            <span
              className={`font-bold text-base ${
                validation.geojson_validation.is_valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
              style={{ fontSize: '16px' }}
            >
              {validation.geojson_validation.is_valid ? 'Valid ✓' : 'Invalid ✗'}
            </span>
          </div>
          {validation.geojson_validation.details && validation.geojson_validation.details.length > 0 && (
            <>
              <h5 className="m-4 mb-3 text-muted-foreground text-base font-semibold" style={{ fontSize: '14px' }}>
                Validation Details
              </h5>
              {validation.geojson_validation.details.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center px-4 py-3 bg-muted rounded-xl border border-border transition-all duration-300 hover:bg-accent hover:-translate-y-px"
                >
                  <span className="text-muted-foreground font-medium text-sm">{d}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );

  const DetailsTab = () => {
    const jsonText = safeStringify(analysisData);
    const copy = async () => { try { await navigator.clipboard.writeText(jsonText); } catch {} };
    const rows = flattenJson(analysisData || {});
    const [query, setQuery] = useState('');
    const filtered = rows.filter(([k, v]) =>
      (k || '').toLowerCase().includes(query.toLowerCase()) || String(v).toLowerCase().includes(query.toLowerCase())
    );
    return (
      <div className="details-tab">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <div className="details-header">
            <h4 style={{ fontSize: '16px' }}>All Details</h4>
            <div className="details-actions">
              <button className="btn" style={{ fontSize: '13px' }} onClick={copy}>Copy JSON</button>
              {json_url && <a className="btn" style={{ fontSize: '13px' }} href={json_url} target="_blank" rel="noreferrer">Download JSON</a>}
            </div>
          </div>
          <div className="details-filter">
            <input className="filter-input" style={{ fontSize: '13px' }} placeholder="Filter by key or value" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="kv-table-wrapper">
            <table className="kv-table">
              <thead>
                <tr><th style={{ fontSize: '12px' }}>Key</th><th style={{ fontSize: '12px' }}>Value</th></tr>
              </thead>
              <tbody>
                {filtered.map(([k, v], i) => (
                  <tr key={i}>
                    <td className="cell-key" style={{ fontSize: '12px' }}>{k}</td>
                    <td className="cell-val" style={{ fontSize: '12px' }}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-md transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-primary before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-cyan-500">
          <h4 style={{ fontSize: '16px' }}>Raw JSON</h4>
          <pre className="raw-json" style={{ fontSize: '11px' }}><code>{jsonText}</code></pre>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 m-0 p-0 bg-transparent border-none rounded-none overflow-visible">
      <div className="flex flex-wrap gap-2 bg-muted border-2 border-border rounded-2xl p-3 shadow-md">
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 className="w-4 h-4" />
          Overview
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'validation' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('validation')}
        >
          <CheckCircle className="w-4 h-4" />
          Validation
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'details' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('details')}
        >
          <FileText className="w-4 h-4" />
          Details
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'slope' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('slope')}
        >
          <Mountain className="w-4 h-4" />
          Slope Analysis
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'flood' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('flood')}
        >
          <Waves className="w-4 h-4" />
          Flood Risk
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'erosion' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('erosion')}
        >
          <AlertTriangle className="w-4 h-4" />
          Soil Erosion
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'zoning' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('zoning')}
        >
          <Building2 className="w-4 h-4" />
          Zoning
        </button>
        <button 
          className={`px-5 py-3 cursor-pointer border-none text-sm font-semibold text-muted-foreground rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'water' 
              ? 'bg-primary text-primary-foreground shadow-lg -translate-y-px' 
              : 'bg-transparent hover:bg-accent hover:text-accent-foreground hover:-translate-y-px'
          }`}
          onClick={() => setActiveTab('water')}
        >
          <Droplet className="w-4 h-4" />
          Water Availability
        </button>
      </div>

      <div className="flex flex-col gap-6 p-0 bg-transparent">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'validation' && <ValidationTab />}
        {activeTab === 'slope' && <SlopeTab />}
        {activeTab === 'flood' && <FloodTab />}
        {activeTab === 'erosion' && <ErosionTab />}
        {activeTab === 'zoning' && <ZoningTab />}
        {activeTab === 'water' && <WaterTab />}
        {activeTab === 'details' && <DetailsTab />}

        {/* Map Layers Control */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 my-6 shadow-md">
          <h4 className="m-0 mb-5 text-card-foreground text-xl font-bold flex items-center gap-2.5">🗺️ Map Visualization Layers</h4>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer border border-transparent hover:bg-accent hover:border-primary hover:-translate-y-px">
              <input 
                type="checkbox" 
                checked={activeLayers.elevation}
                onChange={() => handleLayerToggle('elevation')}
                className="m-0 accent-primary scale-125"
              />
              <div className="w-6 h-6 border-2 border-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg" style={{backgroundColor: '#8B4513'}}></div>
              Elevation
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer border border-transparent hover:bg-accent hover:border-primary hover:-translate-y-px">
              <input 
                type="checkbox" 
                checked={activeLayers.slope}
                onChange={() => handleLayerToggle('slope')}
                className="m-0 accent-primary scale-125"
              />
              <div className="w-6 h-6 border-2 border-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg" style={{backgroundColor: '#FF6B6B'}}></div>
              Slope Categories
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer border border-transparent hover:bg-accent hover:border-primary hover:-translate-y-px">
              <input 
                type="checkbox" 
                checked={activeLayers.flood}
                onChange={() => handleLayerToggle('flood')}
                className="m-0 accent-primary scale-125"
              />
              <div className="w-6 h-6 border-2 border-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg" style={{backgroundColor: '#4ECDC4'}}></div>
              Flood Risk
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer border border-transparent hover:bg-accent hover:border-primary hover:-translate-y-px">
              <input 
                type="checkbox" 
                checked={activeLayers.zoning}
                onChange={() => handleLayerToggle('zoning')}
                className="m-0 accent-primary scale-125"
              />
              <div className="w-6 h-6 border-2 border-white rounded-lg shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg" style={{backgroundColor: '#45B7D1'}}></div>
              Zoning
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerrainAnalysisPanel;