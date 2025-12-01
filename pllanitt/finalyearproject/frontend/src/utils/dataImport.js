/**
 * Data Import Utilities
 * Handles CSV/JSON import for bulk operations
 */

/**
 * Parse CSV string to array of objects
 */
export const parseCSV = (csvString) => {
  if (!csvString || csvString.trim().length === 0) {
    throw new Error('CSV string is empty');
  }

  const lines = csvString.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}. Skipping.`);
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    data.push(row);
  }

  return data;
};

/**
 * Parse a single CSV line handling quoted values
 */
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last value
  values.push(current);
  
  return values;
};

/**
 * Validate project data from CSV
 */
export const validateProjectData = (projectData) => {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!projectData.title && !projectData.Title) {
    errors.push('Title is required');
  }

  // Optional field validations
  if (projectData.progress || projectData.Progress) {
    const progress = parseInt(projectData.progress || projectData.Progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      warnings.push('Progress must be between 0 and 100');
    }
  }

  if (projectData.budget || projectData.Budget) {
    const budget = parseFloat(projectData.budget || projectData.Budget);
    if (isNaN(budget) || budget < 0) {
      warnings.push('Budget must be a positive number');
    }
  }

  // Status validation
  if (projectData.status || projectData.Status) {
    const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
    const status = (projectData.status || projectData.Status).trim();
    if (!validStatuses.includes(status)) {
      warnings.push(`Status "${status}" is not a valid status. Using default.`);
    }
  }

  // Priority validation
  if (projectData.priority || projectData.Priority) {
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const priority = (projectData.priority || projectData.Priority).trim();
    if (!validPriorities.includes(priority)) {
      warnings.push(`Priority "${priority}" is not valid. Using default.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Normalize project data from CSV to API format
 */
export const normalizeProjectData = (csvData) => {
  // Map CSV column names to API field names (case-insensitive)
  const fieldMap = {
    'id': 'id',
    'title': 'title',
    'Title': 'title',
    'description': 'description',
    'Description': 'description',
    'location': 'location',
    'Location': 'location',
    'type': 'type',
    'Type': 'type',
    'status': 'status',
    'Status': 'status',
    'priority': 'priority',
    'Priority': 'priority',
    'progress': 'progress',
    'Progress': 'progress',
    'budget': 'budget',
    'Budget': 'budget',
    'area': 'area',
    'Area': 'area',
    'start_date': 'start_date',
    'Start Date': 'start_date',
    'end_date': 'end_date',
    'End Date': 'end_date',
    'tags': 'tags',
    'Tags': 'tags'
  };

  const normalized = {};
  
  Object.keys(csvData).forEach(key => {
    const mappedKey = fieldMap[key] || key.toLowerCase();
    let value = csvData[key];

    // Type conversions
    if (mappedKey === 'progress') {
      value = value ? parseInt(value) || 0 : 0;
    } else if (mappedKey === 'budget') {
      value = value ? parseFloat(value) || 0 : null;
    } else if (mappedKey === 'area') {
      value = value ? parseFloat(value) || null : null;
    } else if (mappedKey === 'tags' && typeof value === 'string') {
      // Parse tags from comma-separated string
      value = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } else if (mappedKey === 'status') {
      // Normalize status
      const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(value)) {
        value = 'Planning'; // Default
      }
    } else if (mappedKey === 'priority') {
      // Normalize priority
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(value)) {
        value = 'Medium'; // Default
      }
    }

    normalized[mappedKey] = value;
  });

  // Set defaults for required fields
  if (!normalized.status) {
    normalized.status = 'Planning';
  }
  if (!normalized.priority) {
    normalized.priority = 'Medium';
  }
  if (normalized.progress === undefined || normalized.progress === null) {
    normalized.progress = 0;
  }

  return normalized;
};

/**
 * Process imported projects with validation
 */
export const processImportedProjects = (csvData) => {
  const results = {
    valid: [],
    invalid: [],
    total: csvData.length
  };

  csvData.forEach((row, index) => {
    const validation = validateProjectData(row);
    
    if (validation.isValid) {
      const normalized = normalizeProjectData(row);
      results.valid.push({
        data: normalized,
        rowNumber: index + 2, // +2 because index is 0-based and we skip header
        warnings: validation.warnings
      });
    } else {
      results.invalid.push({
        data: row,
        rowNumber: index + 2,
        errors: validation.errors,
        warnings: validation.warnings
      });
    }
  });

  return results;
};

/**
 * Read file as text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Import projects from CSV file
 */
export const importProjectsFromCSV = async (file) => {
  try {
    const csvText = await readFileAsText(file);
    const csvData = parseCSV(csvText);
    const processed = processImportedProjects(csvData);
    
    return {
      success: true,
      ...processed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      valid: [],
      invalid: [],
      total: 0
    };
  }
};

/**
 * Import projects from JSON file
 */
export const importProjectsFromJSON = async (file) => {
  try {
    const jsonText = await readFileAsText(file);
    const jsonData = JSON.parse(jsonText);
    
    // Handle both array and single object
    const projectsArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    const processed = processImportedProjects(projectsArray);
    
    return {
      success: true,
      ...processed
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      valid: [],
      invalid: [],
      total: 0
    };
  }
};

export default {
  parseCSV,
  validateProjectData,
  normalizeProjectData,
  processImportedProjects,
  importProjectsFromCSV,
  importProjectsFromJSON,
  readFileAsText
};

