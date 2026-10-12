'use client';

import '../../../details.css';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * #850: add-ons are bought from the price list on the shop's Add-on tab (the price is never typed), so the old
 * free add-on page now sends the admin there. Old add-ons are listed on that tab.
 */
export default function PlanLimitAddonsRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/merchants/${params.id}/addons`);
  }, [params.id, router]);
  return <div className="ar-detail p-4 text-sm">Đang chuyển sang tab Add-on…</div>;
}
