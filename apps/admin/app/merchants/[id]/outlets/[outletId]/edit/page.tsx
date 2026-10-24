import { redirect } from 'next/navigation';

/**
 * #1185: list Edit used /outlets/:id/edit but only /outlets/:id existed (in-page edit).
 */
export default function MerchantOutletEditPage({
  params,
}: {
  params: { id: string; outletId: string };
}) {
  redirect(`/merchants/${params.id}/outlets/${params.outletId}?edit=1`);
}
