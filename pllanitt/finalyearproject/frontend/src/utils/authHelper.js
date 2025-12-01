// Authentication helper utilities
export const authHelper = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user data
  getCurrentUser: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },

  // Check if token is expired (basic check)
  isTokenExpired: () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  },

  // Clear authentication data
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken'); // Clear legacy token
    localStorage.removeItem('userData'); // Clear legacy user data
    sessionStorage.clear();
  },

  // Redirect to login if not authenticated
  redirectToLogin: () => {
    if (!authHelper.isAuthenticated() || authHelper.isTokenExpired()) {
      authHelper.clearAuth();
      window.location.href = '/login';
      return true;
    }
    return false;
  },

  // Get auth headers for API calls
  getAuthHeaders: () => {
    const token = authHelper.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
};

// API call wrapper with authentication
export const authenticatedFetch = async (url, options = {}) => {
  // Check if user is authenticated
  if (authHelper.redirectToLogin()) {
    throw new Error('User not authenticated');
  }

  // Add auth headers
  const authHeaders = authHelper.getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn('Authentication failed, redirecting to login');
      authHelper.clearAuth();
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }

    return response;
  } catch (error) {
    // Handle network errors more gracefully
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network error:', error);
      throw new Error(`Failed to connect to backend at ${url}. Make sure the server is running on port 8000.`);
    }
    console.error('Authenticated fetch error:', error);
    throw error;
  }
};

// Axios interceptor for authentication
export const setupAuthInterceptor = (axiosInstance) => {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = authHelper.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.warn('Authentication failed, redirecting to login');
        authHelper.clearAuth();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};
