/**
 * Accessibility utilities
 * Provides ARIA labels, keyboard navigation helpers, and screen reader support
 */

/**
 * Generate ARIA label for common UI elements
 */
export const getAriaLabel = (element, context = {}) => {
  const labels = {
    button: {
      edit: `Edit ${context.name || 'item'}`,
      delete: `Delete ${context.name || 'item'}`,
      save: `Save ${context.name || 'changes'}`,
      cancel: 'Cancel',
      close: 'Close',
      search: 'Search',
      filter: 'Filter',
      export: `Export ${context.type || 'data'}`,
      import: `Import ${context.type || 'data'}`,
      refresh: 'Refresh',
      add: `Add ${context.name || 'item'}`,
      remove: `Remove ${context.name || 'item'}`
    },
    input: {
      search: 'Search input',
      email: 'Email address',
      password: 'Password',
      name: 'Name',
      title: 'Title',
      description: 'Description'
    },
    navigation: {
      sidebar: 'Main navigation',
      header: 'Page header',
      footer: 'Page footer'
    }
  };

  return labels[element.type]?.[element.action] || `${element.action} ${element.name || ''}`.trim();
};

/**
 * Handle keyboard navigation
 */
export const handleKeyboardNavigation = (event, handlers) => {
  const { key, target } = event;

  switch (key) {
    case 'Enter':
    case ' ':
      if (handlers.onActivate && target.getAttribute('role') === 'button') {
        event.preventDefault();
        handlers.onActivate();
      }
      break;
    case 'Escape':
      if (handlers.onEscape) {
        handlers.onEscape();
      }
      break;
    case 'ArrowDown':
      if (handlers.onArrowDown) {
        event.preventDefault();
        handlers.onArrowDown();
      }
      break;
    case 'ArrowUp':
      if (handlers.onArrowUp) {
        event.preventDefault();
        handlers.onArrowUp();
      }
      break;
    case 'Tab':
      // Ensure focus is visible
      target.classList.add('keyboard-focus');
      break;
  }
};

/**
 * Announce to screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Check color contrast ratio
 */
export const checkColorContrast = (foreground, background) => {
  // Simplified contrast check
  // In production, use a proper contrast calculation library
  const getLuminance = (color) => {
    // Convert hex to RGB
    const rgb = color.match(/\w\w/g).map(x => parseInt(x, 16));
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7
  };
};

/**
 * Add focus indicators
 */
export const addFocusIndicators = () => {
  const style = document.createElement('style');
  style.textContent = `
    *:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    .keyboard-focus {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px !important;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initialize accessibility features
 */
export const initAccessibility = () => {
  addFocusIndicators();
  
  // Add keyboard event listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
};

export default {
  getAriaLabel,
  handleKeyboardNavigation,
  announceToScreenReader,
  checkColorContrast,
  addFocusIndicators,
  initAccessibility
};

