import React from 'react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export const dynamic = 'force-dynamic';

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser('/dashboard');

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <DashboardSidebar user={user} />
        <div className="flex-1 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
