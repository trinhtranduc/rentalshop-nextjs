'use client';

import React from 'react';
import { PageWrapper, PageHeader, PageTitle, PageContent, Card, CardHeader, CardTitle, CardContent, Label } from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';

/** The sidebar's Settings → Admin Info item (#797): who is signed in. Read only. */
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
      </PageContent>
    </PageWrapper>
  );
}
