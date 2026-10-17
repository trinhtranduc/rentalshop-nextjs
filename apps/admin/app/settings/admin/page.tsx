'use client';

import React from 'react';
import { PageWrapper, PageHeader, PageTitle, PageContent, Card, CardHeader, CardTitle, CardContent, Label } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { EmbeddingBackfillCard } from './EmbeddingBackfillCard';

/** The sidebar's Settings → Admin Info item (#797): who is signed in; plus the image-search backfill card (#1017). */
export default function AdminInfoPage() {
  const { user } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || '-';
  const rows: [string, string][] = [
    ['Name', name],
    ['Email', user?.email || '-'],
    ['Role', String(user?.role || '-')],
  ];

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Admin Info</PageTitle>
      </PageHeader>
      <PageContent>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Signed in as</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map(([label, value]) => (
              <div key={label}>
                <Label className="text-sm font-medium text-gray-600">{label}</Label>
                <p className="text-base break-words">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        {/* #1017: ADMIN only (the API rejects OPS too) */}
        {user?.role === 'ADMIN' && (
          <div className="mt-6">
            <EmbeddingBackfillCard />
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
}
