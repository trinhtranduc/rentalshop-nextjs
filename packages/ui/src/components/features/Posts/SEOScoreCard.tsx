'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '../../ui';
import { TrendingUp, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { SEOAnalysis } from '@rentalshop/ai-service';

interface SEOScoreCardProps {
  analysis: SEOAnalysis;
}

export function SEOScoreCard({ analysis }: SEOScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          SEO Score: {analysis.score}/100
          <Badge
            variant={analysis.score >= 80 ? 'success' : analysis.score >= 60 ? 'warning' : 'destructive'}
            className="ml-2"
          >
            {getScoreLabel(analysis.score)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Score</span>
            <span className="font-medium">{analysis.score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${getScoreColor(analysis.score)}`}
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Keyword Density</div>
            <div className="text-lg font-semibold">{analysis.keywordDensity}%</div>
            <div className="text-xs text-gray-500">Target: 1-2%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Word Count</div>
            <div className="text-lg font-semibold">{analysis.wordCount}</div>
            <div className="text-xs text-gray-500">Recommended: 300+</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Readability</div>
            <div className="text-lg font-semibold">{analysis.readabilityScore}</div>
            <div className="text-xs text-gray-500">Target: 60+</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">H2 Headings</div>
            <div className="text-lg font-semibold">{analysis.headingStructure.h2Count}</div>
            <div className="text-xs text-gray-500">Recommended: 2+</div>
          </div>
        </div>

        {/* Heading Structure */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Heading Structure</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {analysis.headingStructure.hasH1 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span>H1: {analysis.headingStructure.h1Count} (should be 1)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.headingStructure.h2Count >= 2 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>H2: {analysis.headingStructure.h2Count} (recommended: 2+)</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span>H3: {analysis.headingStructure.h3Count}</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.headingStructure.keywordInH1 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Keyword in H1: {analysis.headingStructure.keywordInH1 ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.headingStructure.keywordInH2 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Keyword in H2: {analysis.headingStructure.keywordInH2 ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Meta Tags */}
        <div className="border-t pt-4">
          <div className="text-sm font-medium mb-2">Meta Tags</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {analysis.metaTags.titleOptimal ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Title: {analysis.metaTags.titleLength} chars (optimal: 50-60)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.metaTags.descriptionOptimal ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Description: {analysis.metaTags.descriptionLength} chars (optimal: 150-160)</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.metaTags.hasKeywords ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Keywords in meta: {analysis.metaTags.hasKeywords ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Issues */}
        {analysis.issues.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Issues to Fix</div>
            <div className="space-y-2">
              {analysis.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm ${
                    issue.type === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : issue.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.type === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    ) : issue.type === 'warning' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{issue.message}</div>
                      {issue.fix && (
                        <div className="text-xs mt-1 text-gray-600">{issue.fix}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Recommendations</div>
            <ul className="space-y-1 text-sm list-disc list-inside text-gray-600">
              {analysis.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
