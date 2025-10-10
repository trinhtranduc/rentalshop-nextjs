'use client'

import React from 'react';
import { 
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@rentalshop/ui';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Settings, 
  MoreHorizontal,
  Copy,
  Archive,
  Star
} from 'lucide-react';
import type { Plan } from '@rentalshop/types';

interface PlanActionsProps {
  plan: Plan;
  onView: (plan: Plan) => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
  onTogglePopular: (plan: Plan) => void;
  onDuplicate?: (plan: Plan) => void;
  onArchive?: (plan: Plan) => void;
}

export const PlanActions: React.FC<PlanActionsProps> = ({
  plan,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onTogglePopular,
  onDuplicate,
  onArchive
}) => {
  return (
    <div className="flex items-center justify-end gap-2">
      {/* Quick Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(plan)}
        className="h-8 w-8 p-0"
        title="View plan details"
      >
        <Eye className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(plan)}
        className="h-8 w-8 p-0"
        title="Edit plan"
      >
        <Edit className="w-4 h-4" />
      </Button>

      {/* Dropdown Menu for Additional Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onToggleStatus(plan)}>
            <Settings className="w-4 h-4 mr-2" />
            {plan.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onTogglePopular(plan)}>
            <Star className="w-4 h-4 mr-2" />
            {plan.isPopular ? 'Remove Popular' : 'Mark Popular'}
          </DropdownMenuItem>
          
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(plan)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate Plan
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(plan)}>
              <Archive className="w-4 h-4 mr-2" />
              Archive Plan
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => onDelete(plan)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
