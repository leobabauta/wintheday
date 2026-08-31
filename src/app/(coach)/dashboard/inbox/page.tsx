import { redirect } from 'next/navigation';

// The inbox now lives at the top of the coach home screen. This route stays
// because notification deep links (push + email) already point at it.
export default function InboxPage() {
  redirect('/dashboard');
}
