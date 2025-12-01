import * as Yup from 'yup';

// Login validation schema
export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must not exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format'
    )
    .test('no-double-dots', 'Email cannot contain consecutive dots', value => 
      !value || !value.includes('..')
    )
    .test('no-double-domains', 'Invalid email domain format', value => {
      if (!value) return true;
      const parts = value.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1];
      const domainParts = domain.split('.');
      // Check for consecutive dots or invalid domain structure
      return domainParts.length >= 2 && 
             domainParts.every(part => part.length > 0) &&
             !domain.includes('..') &&
             domainParts[domainParts.length - 1].length >= 2;
    }),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
});

// Signup validation schema
export const signupSchema = Yup.object().shape({
  name: Yup.string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .matches(
      /^[a-zA-Z\s'-]+$/,
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    )
    .test('no-consecutive-spaces', 'Name cannot have consecutive spaces', value => 
      !/\s{2,}/.test(value)
    )
    .test('no-leading-trailing-spaces', 'Name cannot start or end with spaces', value => 
      value && value.trim() === value
    ),
  
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must not exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format'
    )
    .test('no-double-dots', 'Email cannot contain consecutive dots', value => 
      !value || !value.includes('..')
    )
    .test('no-double-domains', 'Invalid email domain format', value => {
      if (!value) return true;
      const parts = value.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1];
      const domainParts = domain.split('.');
      // Check for consecutive dots or invalid domain structure
      return domainParts.length >= 2 && 
             domainParts.every(part => part.length > 0) &&
             !domain.includes('..') &&
             domainParts[domainParts.length - 1].length >= 2;
    })
    .test('no-disposable-email', 'Disposable email addresses are not allowed', value => {
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
        'mailinator.com', 'temp-mail.org', 'throwaway.email'
      ];
      const domain = value?.split('@')[1]?.toLowerCase();
      return !disposableDomains.includes(domain);
    }),
  
  role: Yup.string()
    .required('Please select a role')
    .oneOf(['planner', 'viewer'], 'Please select a valid role'),
  
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    )
    .test('no-common-passwords', 'This password is too common, please choose a stronger one', value => {
      const commonPasswords = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
      ];
      return !commonPasswords.includes(value?.toLowerCase());
    })
    .test('no-personal-info', 'Password cannot contain your name or email', function(value) {
      const name = this.parent.name?.toLowerCase();
      const email = this.parent.email?.toLowerCase();
      const password = value?.toLowerCase();
      
      if (name && password?.includes(name)) {
        return this.createError({ message: 'Password cannot contain your name' });
      }
      if (email && password?.includes(email.split('@')[0])) {
        return this.createError({ message: 'Password cannot contain your email username' });
      }
      return true;
    }),
  
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match')
});

// Forgot password validation schema
export const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .test('no-double-dots', 'Email cannot contain consecutive dots', value => 
      !value || !value.includes('..')
    )
    .test('no-double-domains', 'Invalid email domain format', value => {
      if (!value) return true;
      const parts = value.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1];
      const domainParts = domain.split('.');
      return domainParts.length >= 2 && 
             domainParts.every(part => part.length > 0) &&
             !domain.includes('..') &&
             domainParts[domainParts.length - 1].length >= 2;
    })
});

// Reset password validation schema
export const resetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    ),
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match')
});

// Change password validation schema
export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required('Current password is required'),
  newPassword: Yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    )
    .test('different-from-current', 'New password must be different from current password', function(value) {
      return value !== this.parent.currentPassword;
    }),
  confirmNewPassword: Yup.string()
    .required('Please confirm your new password')
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
});

// Profile update validation schema
export const profileUpdateSchema = Yup.object().shape({
  name: Yup.string()
    .required('Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .matches(
      /^[a-zA-Z\s'-]+$/,
      'Name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .max(100, 'Email must not exceed 100 characters')
    .test('no-double-dots', 'Email cannot contain consecutive dots', value => 
      !value || !value.includes('..')
    )
    .test('no-double-domains', 'Invalid email domain format', value => {
      if (!value) return true;
      const parts = value.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1];
      const domainParts = domain.split('.');
      return domainParts.length >= 2 && 
             domainParts.every(part => part.length > 0) &&
             !domain.includes('..') &&
             domainParts[domainParts.length - 1].length >= 2;
    })
});

// Custom validation messages
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  min: (min) => `Must be at least ${min} characters`,
  max: (max) => `Must not exceed ${max} characters`,
  passwordStrength: 'Password must contain uppercase, lowercase, number, and special character',
  passwordMatch: 'Passwords must match',
  nameFormat: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  roleRequired: 'Please select a role'
};

// Password strength checker
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };
  
  score = Object.values(checks).filter(Boolean).length;
  
  const strengthLevels = [
    { score: 0, label: 'Very Weak', color: '#ef4444' },
    { score: 1, label: 'Weak', color: '#f97316' },
    { score: 2, label: 'Fair', color: '#eab308' },
    { score: 3, label: 'Good', color: '#22c55e' },
    { score: 4, label: 'Strong', color: '#16a34a' },
    { score: 5, label: 'Very Strong', color: '#15803d' }
  ];
  
  return strengthLevels[score] || strengthLevels[0];
};

// Email validation helper
export const isValidEmail = (email) => {
  if (!email) return false;
  
  // Check for consecutive dots
  if (email.includes('..')) return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  // Check domain structure
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  const domainParts = domain.split('.');
  
  // Must have at least 2 parts (domain.tld)
  if (domainParts.length < 2) return false;
  
  // All parts must be non-empty
  if (!domainParts.every(part => part.length > 0)) return false;
  
  // Top-level domain must be at least 2 characters
  if (domainParts[domainParts.length - 1].length < 2) return false;
  
  return true;
};

// Name validation helper
export const isValidName = (name) => {
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
};

// Project creation validation schema
export const projectSchema = Yup.object().shape({
  title: Yup.string()
    .required('Project title is required')
    .min(3, 'Project title must be at least 3 characters long')
    .max(255, 'Project title must not exceed 255 characters')
    .trim(),
  description: Yup.string()
    .required('Project description is required')
    .min(10, 'Project description must be at least 10 characters long')
    .max(2000, 'Project description must not exceed 2000 characters')
    .trim(),
  location: Yup.string()
    .required('Project location is required')
    .min(3, 'Location must be at least 3 characters')
    .max(255, 'Location must not exceed 255 characters')
    .trim(),
  type: Yup.string()
    .required('Project type is required')
    .oneOf([
      'Residential Development',
      'Commercial Development',
      'Mixed-Use Development',
      'Infrastructure',
      'Transportation',
      'Green Spaces',
      'Urban Renewal',
      'Industrial Zone',
      'Community Facilities',
      'Other'
    ], 'Please select a valid project type'),
  priority: Yup.string()
    .oneOf(['Low', 'Medium', 'High', 'Critical'], 'Please select a valid priority')
    .default('Medium'),
  startDate: Yup.date()
    .required('Start date is required')
    .nullable()
    .transform((value, originalValue) => {
      // Handle empty strings and convert to null
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      return value;
    }),
  endDate: Yup.date()
    .nullable()
    .transform((value, originalValue) => {
      // Handle empty strings and convert to null
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      return value;
    })
    .when('startDate', (startDate, schema) => {
      // Only validate if startDate is a valid date
      if (startDate && !isNaN(new Date(startDate).getTime())) {
        return schema.min(startDate, 'End date must be after start date');
      }
      return schema;
    }),
  budget: Yup.number()
    .nullable()
    .positive('Budget must be a positive number')
    .typeError('Budget must be a valid number'),
  estimatedDuration: Yup.number()
    .nullable()
    .positive('Duration must be a positive number')
    .integer('Duration must be a whole number')
    .typeError('Duration must be a valid number'),
  area: Yup.number()
    .nullable()
    .min(0, 'Area cannot be negative')
    .typeError('Area must be a valid number'),
  tags: Yup.array()
    .of(Yup.string().trim().min(1, 'Tag cannot be empty'))
    .max(10, 'Maximum 10 tags allowed'),
  objectives: Yup.array()
    .of(Yup.string().trim().min(1, 'Objective cannot be empty'))
    .min(1, 'At least one objective is required')
    .max(20, 'Maximum 20 objectives allowed'),
  coordinates: Yup.object()
    .nullable()
    .shape({
      lat: Yup.number().required(),
      lng: Yup.number().required()
    })
});

// Invite user validation schema
export const inviteUserSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must not exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format'
    ),
  role: Yup.string()
    .required('Role is required')
    .oneOf(['viewer', 'planner', 'admin'], 'Please select a valid role'),
  message: Yup.string()
    .nullable()
    .max(500, 'Message must not exceed 500 characters')
});