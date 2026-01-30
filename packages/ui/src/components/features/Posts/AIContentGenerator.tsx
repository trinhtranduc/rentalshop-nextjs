'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '../../ui';
import { aiApi } from '@rentalshop/utils';
import { Sparkles, Loader2 } from 'lucide-react';
import type { AIGeneratePostInput } from '@rentalshop/types';

interface AIContentGeneratorProps {
  onContentGenerated: (content: {
    title: string;
    content: string;
    excerpt: string;
    metaDescription: string;
    suggestedSlug: string;
    keywords: string[];
    seoTitle?: string;
    seoKeywords?: string;
  }) => void;
  onCancel?: () => void;
}

export function AIContentGenerator({
  onContentGenerated,
  onCancel,
}: AIContentGeneratorProps) {
  const { toastError, toastSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AIGeneratePostInput>({
    keyword: '',
    tone: 'professional',
    wordCount: 1500,
    includeExamples: true,
    targetAudience: 'general readers',
  });

  const handleGenerate = async () => {
    if (!formData.keyword.trim()) {
      toastError('Please enter a keyword or topic');
      return;
    }

    setLoading(true);
    try {
      const response = await aiApi.generatePost(formData);
      
      if (response.success && response.data) {
        onContentGenerated(response.data);
        toastSuccess('Content generated successfully!');
      } else {
        toastError(response.error?.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toastError('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Content Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Keyword / Topic <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g., equipment rental tips"
            value={formData.keyword}
            onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tone</label>
            <Select
              value={formData.tone}
              onValueChange={(value: 'professional' | 'casual' | 'friendly' | 'technical') =>
                setFormData({ ...formData, tone: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Word Count</label>
            <Input
              type="number"
              min={300}
              max={5000}
              value={formData.wordCount}
              onChange={(e) =>
                setFormData({ ...formData, wordCount: parseInt(e.target.value) || 1500 })
              }
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Target Audience</label>
          <Input
            placeholder="e.g., small business owners, equipment renters"
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category (Optional)</label>
          <Input
            placeholder="e.g., Equipment Rental, Business Tips"
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeExamples"
            checked={formData.includeExamples}
            onChange={(e) => setFormData({ ...formData, includeExamples: e.target.checked })}
            disabled={loading}
            className="rounded"
          />
          <label htmlFor="includeExamples" className="text-sm">
            Include practical examples and use cases
          </label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleGenerate}
            disabled={loading || !formData.keyword.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          AI will generate SEO-optimized content including title, content, meta description, and keywords.
        </p>
      </CardContent>
    </Card>
  );
}
