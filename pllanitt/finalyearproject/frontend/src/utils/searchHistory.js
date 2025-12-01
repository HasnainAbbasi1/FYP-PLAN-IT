/**
 * Search History Utility
 * Manages search history in localStorage
 */

const SEARCH_HISTORY_KEY = 'planit_search_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Get search history
 */
export const getSearchHistory = () => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
};

/**
 * Add search term to history
 */
export const addToSearchHistory = (searchTerm, metadata = {}) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return;
  }

  try {
    const history = getSearchHistory();
    const trimmedTerm = searchTerm.trim();
    
    // Remove duplicate (if exists)
    const filteredHistory = history.filter(
      item => item.term.toLowerCase() !== trimmedTerm.toLowerCase()
    );
    
    // Add to beginning
    const newItem = {
      term: trimmedTerm,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    filteredHistory.unshift(newItem);
    
    // Limit to MAX_HISTORY_ITEMS
    const limitedHistory = filteredHistory.slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limitedHistory));
    return limitedHistory;
  } catch (error) {
    console.error('Error saving search history:', error);
    return getSearchHistory();
  }
};

/**
 * Remove item from search history
 */
export const removeFromSearchHistory = (index) => {
  try {
    const history = getSearchHistory();
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      return history;
    }
    return history;
  } catch (error) {
    console.error('Error removing from search history:', error);
    return getSearchHistory();
  }
};

/**
 * Clear all search history
 */
export const clearSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    return [];
  } catch (error) {
    console.error('Error clearing search history:', error);
    return getSearchHistory();
  }
};

/**
 * Get recent searches (last N items)
 */
export const getRecentSearches = (limit = 10) => {
  const history = getSearchHistory();
  return history.slice(0, limit);
};

/**
 * Format search history item for display
 */
export const formatSearchHistoryItem = (item) => {
  const date = new Date(item.timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let timeAgo = '';
  if (diffMins < 1) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = date.toLocaleDateString();
  }

  return {
    ...item,
    timeAgo,
    formattedDate: date.toLocaleString()
  };
};

export default {
  getSearchHistory,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
  getRecentSearches,
  formatSearchHistoryItem
};

