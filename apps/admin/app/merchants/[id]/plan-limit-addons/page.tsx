import { redirect } from 'next/navigation';

// #782: add-ons are now managed in the "Gói & Module" block of the merchant page.
export default function PlanLimitAddonsRedirect({ params }: { params: { id: string } }) {
  redirect(`/merchants/${params.id}#merchant-modules`);
}
