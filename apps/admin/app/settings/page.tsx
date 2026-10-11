import { redirect } from 'next/navigation';

/** The menu's Settings item points here; Billing is the only settings page (#797). */
export default function SettingsPage() {
  redirect('/settings/billing');
}
