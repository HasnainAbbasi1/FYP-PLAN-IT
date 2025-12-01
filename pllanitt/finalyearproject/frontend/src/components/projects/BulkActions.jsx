import React, { useState } from 'react';
import { Trash2, Edit, CheckSquare, Square, MoreVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BulkActions = ({
  selectedItems = [],
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkPriorityUpdate,
  totalItems = 0,
  isAllSelected = false
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const handleStatusUpdate = (status) => {
    if (onBulkStatusUpdate && selectedItems.length > 0) {
      onBulkStatusUpdate(selectedItems, status);
      setShowStatusMenu(false);
    }
  };

  const handlePriorityUpdate = (priority) => {
    if (onBulkPriorityUpdate && selectedItems.length > 0) {
      onBulkPriorityUpdate(selectedItems, priority);
      setShowPriorityMenu(false);
    }
  };

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedItems.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedItems.length} project(s)? This action cannot be undone.`)) {
        onBulkDelete(selectedItems);
      }
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg mb-4 gap-3 flex-wrap md:flex-col md:items-stretch">
      <div className="flex items-center gap-3 md:w-full md:justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 mr-2" />
          ) : (
            <Square className="w-4 h-4 mr-2" />
          )}
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </Button>
        <Badge variant="secondary" className="text-sm font-medium">
          {selectedItems.length} selected
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap md:w-full md:justify-between">
        <Select onValueChange={handleStatusUpdate}>
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder="Update Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={handlePriorityUpdate}>
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder="Update Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleBulkDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete ({selectedItems.length})
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;

