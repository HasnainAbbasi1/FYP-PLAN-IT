import React from 'react';
import { Button } from '../ui/button';
import { useReadOnly } from './ReadOnlyWrapper';
import { Lock, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

/**
 * Button component that is disabled for viewers with a tooltip explanation
 */
const ViewerRestrictedButton = ({ 
  children, 
  onClick, 
  disabled: externalDisabled = false,
  variant = "default",
  className = "",
  tooltipMessage = "This action is not available for viewers",
  ...props 
}) => {
  const { isReadOnly } = useReadOnly();
  const isDisabled = isReadOnly || externalDisabled;

  const button = (
    <Button
      variant={variant}
      onClick={isReadOnly ? undefined : onClick}
      disabled={isDisabled}
      className={`${className} ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
      {...props}
    >
      {isReadOnly && <Lock className="w-4 h-4 mr-2" />}
      {children}
    </Button>
  );

  if (isReadOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{tooltipMessage}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export default ViewerRestrictedButton;

