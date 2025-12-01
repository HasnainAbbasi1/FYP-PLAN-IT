/**
 * Centralized error handling utilities
 */

/**
 * Get user-friendly error message from error object
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  // Network errors
  if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // API errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Use server-provided message if available
    if (data?.message) {
      return data.message;
    }

    // Status-specific messages
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This resource already exists.';
      case 422:
        return 'Validation error. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Error ${status}: ${data?.error || 'An error occurred'}`;
    }
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.name === 'SequelizeValidationError') {
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map(e => e.message).join(', ');
    }
    return error.message || 'Validation error. Please check your input.';
  }

  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Log error to console and/or error tracking service
 */
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error?.message,
    stack: error?.stack,
    name: error?.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Console log in development
  if (import.meta.env.DEV) {
    console.error('Error logged:', errorInfo);
  }

  // TODO: Send to error tracking service (e.g., Sentry)
  // errorTrackingService.captureException(error, { extra: context });

  return errorInfo;
};

/**
 * Handle error and show user-friendly notification
 */
export const handleError = (error, toast, context = {}) => {
  const message = getErrorMessage(error);
  logError(error, context);

  if (toast) {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
      duration: 5000
    });
  }

  return message;
};

/**
 * Create error handler hook
 */
export const createErrorHandler = (toast) => {
  return (error, context = {}) => {
    return handleError(error, toast, context);
  };
};

/**
 * Async error wrapper
 */
export const withErrorHandling = async (fn, errorHandler) => {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Unhandled error:', error);
    }
    throw error;
  }
};

export default {
  getErrorMessage,
  logError,
  handleError,
  createErrorHandler,
  withErrorHandling
};

