'use client'

import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge
} from '../../../ui';
import { Edit, Trash2, Tag, Calendar, MoreHorizontal, Eye } from 'lucide-react';
import type { Category } from '@rentalshop/types';

interface CategoryCardProps {
  category: Category;
  onView: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onView,
  onDelete
}) => {
  const handleView = () => {
    onView(category);
  };

  const handleDelete = () => {
    onDelete(category);
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {category.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant={category.isActive ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="h-8 px-3"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {category.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {category.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-3 italic">
            No description provided
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>
              Created {new Date(category.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          {category.updatedAt && category.updatedAt !== category.createdAt && (
            <span className="text-xs">
              Updated {new Date(category.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
