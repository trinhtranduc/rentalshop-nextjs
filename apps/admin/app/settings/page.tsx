import { redirect } from 'next/navigation';

/** The sidebar's Settings group links here; Admin Info is its first item (#797). */
export default function SettingsPage() {
  redirect('/settings/admin');
}
