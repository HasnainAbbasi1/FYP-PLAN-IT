import React from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useReadOnly } from './ReadOnlyWrapper';

/**
 * Input component that is read-only for viewers
 */
export const ViewerRestrictedInput = ({ className = "", ...props }) => {
  const { isReadOnly } = useReadOnly();
  
  return (
    <Input
      {...props}
      disabled={isReadOnly}
      readOnly={isReadOnly}
      className={`${className} ${isReadOnly ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : ''}`}
    />
  );
};

/**
 * Textarea component that is read-only for viewers
 */
export const ViewerRestrictedTextarea = ({ className = "", ...props }) => {
  const { isReadOnly } = useReadOnly();
  
  return (
    <Textarea
      {...props}
      disabled={isReadOnly}
      readOnly={isReadOnly}
      className={`${className} ${isReadOnly ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : ''}`}
    />
  );
};

