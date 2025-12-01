import React, { useState } from 'react';
import { Search, X, Calendar, Filter, Save, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';

// Simple date formatter (replacing date-fns)
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const AdvancedSearch = ({ 
  onSearch, 
  onSavePreset,
  savedPresets = [],
  onLoadPreset 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState({
    query: '',
    status: [],
    type: [],
    priority: [],
    dateRange: {
      start: null,
      end: null
    },
    progressRange: {
      min: 0,
      max: 100
    },
    tags: []
  });

  const handleCriteriaChange = (field, value) => {
    setSearchCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateRangeChange = (field, date) => {
    setSearchCriteria(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date
      }
    }));
  };

  const handleApply = () => {
    onSearch(searchCriteria);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchCriteria({
      query: '',
      status: [],
      type: [],
      priority: [],
      dateRange: { start: null, end: null },
      progressRange: { min: 0, max: 100 },
      tags: []
    });
    onSearch({
      query: '',
      status: [],
      type: [],
      priority: [],
      dateRange: { start: null, end: null },
      progressRange: { min: 0, max: 100 },
      tags: []
    });
  };

  const handleSavePresetClick = () => {
    const presetName = prompt('Enter preset name:');
    if (presetName && onSavePreset) {
      onSavePreset(presetName, searchCriteria);
    }
  };

  return (
    <div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Advanced Search
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] max-w-[90vw]" align="start">
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="m-0 text-lg font-semibold">Advanced Search</h3>
              {savedPresets.length > 0 && (
                <div className="flex flex-col gap-1">
                  <Label>Saved Presets:</Label>
                  <select
                    onChange={(e) => {
                      const preset = savedPresets.find(p => p.name === e.target.value);
                      if (preset && onLoadPreset) {
                        setSearchCriteria(preset.criteria);
                        onLoadPreset(preset);
                      }
                    }}
                    defaultValue=""
                    className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-foreground"
                  >
                    <option value="">Select preset...</option>
                    {savedPresets.map(preset => (
                      <option key={preset.name} value={preset.name}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Search Query</Label>
              <Input
                placeholder="Search in title, description, location..."
                value={searchCriteria.query}
                onChange={(e) => handleCriteriaChange('query', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto">
                {['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(status => (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={searchCriteria.status.includes(status)}
                      onCheckedChange={(checked) => {
                        const newStatus = checked
                          ? [...searchCriteria.status, status]
                          : searchCriteria.status.filter(s => s !== status);
                        handleCriteriaChange('status', newStatus);
                      }}
                    />
                    <Label htmlFor={`status-${status}`} className="m-0 font-normal cursor-pointer">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Date Range</Label>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {searchCriteria.dateRange.start
                        ? formatDate(searchCriteria.dateRange.start)
                        : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <CalendarComponent
                      mode="single"
                      selected={searchCriteria.dateRange.start}
                      onSelect={(date) => handleDateRangeChange('start', date)}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-slate-500 dark:text-slate-400 text-sm">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {searchCriteria.dateRange.end
                        ? formatDate(searchCriteria.dateRange.end)
                        : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <CalendarComponent
                      mode="single"
                      selected={searchCriteria.dateRange.end}
                      onSelect={(date) => handleDateRangeChange('end', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Progress Range: {searchCriteria.progressRange.min}% - {searchCriteria.progressRange.max}%</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={searchCriteria.progressRange.min}
                  onChange={(e) => handleCriteriaChange('progressRange', {
                    ...searchCriteria.progressRange,
                    min: parseInt(e.target.value) || 0
                  })}
                  className="flex-1"
                />
                <span className="text-slate-500 dark:text-slate-400 text-sm">to</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={searchCriteria.progressRange.max}
                  onChange={(e) => handleCriteriaChange('progressRange', {
                    ...searchCriteria.progressRange,
                    max: parseInt(e.target.value) || 100
                  })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button onClick={handleApply} size="sm">
                <Search className="w-4 h-4 mr-2" />
                Apply
              </Button>
              <Button onClick={handleClear} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
              {onSavePreset && (
                <Button onClick={handleSavePresetClick} variant="ghost" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preset
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AdvancedSearch;

