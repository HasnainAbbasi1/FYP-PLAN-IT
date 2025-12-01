import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Lock } from 'lucide-react';
import { Badge } from '../ui/badge';

/**
 * Wrapper component that disables interactive elements for viewers
 * and shows a "View Only" indicator
 */
const ReadOnlyWrapper = ({ children, showBadge = true, className = '' }) => {
  const { isViewer } = useAuth();

  if (!isViewer) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {showBadge && (
        <div className="absolute top-2 right-2 z-10">
          <Badge 
            variant="outline" 
            className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 flex items-center gap-1.5 px-2.5 py-1"
          >
            <Eye className="w-3 h-3" />
            <span className="text-xs font-semibold">View Only</span>
          </Badge>
        </div>
      )}
      <div className={isViewer ? 'pointer-events-none opacity-75' : ''}>
        {children}
      </div>
    </div>
  );
};

/**
 * Hook to check if current user is viewer (read-only)
 */
export const useReadOnly = () => {
  const { isViewer, hasPermission } = useAuth();
  
  return {
    isReadOnly: isViewer,
    canEdit: !isViewer && hasPermission('edit'),
    canCreate: !isViewer && hasPermission('create_projects'),
    canDelete: !isViewer && hasPermission('delete'),
  };
};

/**
 * Component to show a lock icon and message for viewers
 */
export const ReadOnlyMessage = ({ message = "This feature is read-only for viewers" }) => {
  const { isViewer } = useAuth();
  
  if (!isViewer) return null;
  
  return (
    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
      <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <p className="text-sm text-yellow-700 dark:text-yellow-300 m-0">
        {message}
      </p>
    </div>
  );
};

export default ReadOnlyWrapper;

