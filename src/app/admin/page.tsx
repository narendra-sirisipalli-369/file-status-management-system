import { redirect } from 'next/navigation';

export default function AdminHomePage() {
  // The Admin Flow PDF specifies the "Overview" (Dashboard) as the default module layout
  redirect('/admin/dashboard');
}
