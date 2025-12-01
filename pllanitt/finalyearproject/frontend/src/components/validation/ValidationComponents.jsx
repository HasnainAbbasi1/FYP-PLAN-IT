import React from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, User, Mail } from 'lucide-react';
import { getPasswordStrength } from '../../validation/authSchemas';

// Error message component
export const ErrorMessage = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <div className={`flex items-center gap-2 text-red-600 text-sm mt-1 ${className}`}>
      <AlertCircle size={16} />
      <span>{error}</span>
    </div>
  );
};

// Success message component
export const SuccessMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  return (
    <div className={`flex items-center gap-2 text-green-600 text-sm mt-1 ${className}`}>
      <CheckCircle size={16} />
      <span>{message}</span>
    </div>
  );
};

// Password strength indicator
export const PasswordStrengthIndicator = ({ password, className = '' }) => {
  if (!password) return null;
  
  const strength = getPasswordStrength(password);
  
  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-600">Password strength:</span>
        <span className="text-xs font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(strength.score / 5) * 100}%`,
            backgroundColor: strength.color
          }}
        />
      </div>
    </div>
  );
};

// Enhanced input field with validation
export const ValidatedInput = ({ 
  field, 
  form, 
  type = 'text', 
  placeholder, 
  icon: Icon,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword,
  className = '',
  ...props 
}) => {
  const hasError = form.touched[field.name] && form.errors[field.name];
  const hasValue = field.value && field.value.length > 0;
  
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
          <Icon size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
      )}
      
      <input
        {...field}
        {...props}
        type={type}
        placeholder={placeholder}
        className={`
          w-full py-3 rounded-lg border-2 transition-all duration-200
          ${Icon ? 'pl-11' : 'px-4'}
          ${showPasswordToggle ? 'pr-12' : Icon ? '' : ''}
          ${hasError 
            ? 'border-destructive bg-destructive/5 dark:bg-destructive/10 focus:border-destructive focus:ring-destructive/20' 
            : hasValue 
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-200 dark:focus:ring-green-900/30'
              : 'border-border bg-background focus:border-ring focus:ring-ring/20'
          }
          focus:outline-none focus:ring-2
          text-foreground placeholder:text-muted-foreground
          dark:bg-slate-900 dark:border-slate-700
          ${className}
        `}
      />
      
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded hover:bg-muted"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
      
      <ErrorMessage error={form.touched[field.name] && form.errors[field.name]} />
    </div>
  );
};

// Enhanced select field with validation
export const ValidatedSelect = ({ 
  field, 
  form, 
  options = [], 
  placeholder,
  icon: Icon,
  className = '',
  ...props 
}) => {
  const hasError = form.touched[field.name] && form.errors[field.name];
  const hasValue = field.value && field.value.length > 0;
  
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
          <Icon size={18} className="text-slate-400 dark:text-slate-500" />
        </div>
      )}
      
      <select
        {...field}
        {...props}
        className={`
          w-full py-3 rounded-lg border-2 transition-all duration-200 appearance-none
          ${Icon ? 'pl-11' : 'px-4'}
          pr-10
          ${hasError 
            ? 'border-destructive bg-destructive/5 dark:bg-destructive/10 focus:border-destructive focus:ring-destructive/20' 
            : hasValue 
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-200 dark:focus:ring-green-900/30'
              : 'border-border bg-background focus:border-ring focus:ring-ring/20'
          }
          focus:outline-none focus:ring-2
          text-foreground
          dark:bg-slate-900 dark:border-slate-700
          ${className}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      <ErrorMessage error={form.touched[field.name] && form.errors[field.name]} />
    </div>
  );
};

// Form field wrapper with label
export const FormField = ({ 
  label, 
  required = false, 
  children, 
  className = '',
  helpText = ''
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="text-xs text-gray-500 mt-1">{helpText}</p>
      )}
    </div>
  );
};

// Loading button component
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`
        w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
        ${loading || disabled
          ? 'bg-gray-400 cursor-not-allowed text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Form validation summary
export const ValidationSummary = ({ errors, className = '' }) => {
  const errorCount = Object.keys(errors).length;
  
  if (errorCount === 0) return null;
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="text-red-600" size={20} />
        <h3 className="text-red-800 font-medium">
          Please fix the following {errorCount} error{errorCount > 1 ? 's' : ''}:
        </h3>
      </div>
      <ul className="text-red-700 text-sm space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field} className="flex items-start gap-2">
            <span className="text-red-500">•</span>
            <span>{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Password requirements checklist
export const PasswordRequirements = ({ password, className = '' }) => {
  const requirements = [
    {
      text: 'At least 8 characters',
      met: password && password.length >= 8
    },
    {
      text: 'One uppercase letter',
      met: password && /[A-Z]/.test(password)
    },
    {
      text: 'One lowercase letter',
      met: password && /[a-z]/.test(password)
    },
    {
      text: 'One number',
      met: password && /\d/.test(password)
    },
    {
      text: 'One special character (@$!%*?&)',
      met: password && /[@$!%*?&]/.test(password)
    }
  ];
  
  return (
    <div className={`mt-3 ${className}`}>
      <p className="text-xs text-gray-600 mb-2">Password requirements:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              req.met ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {req.met ? <CheckCircle size={12} /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
            </div>
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
