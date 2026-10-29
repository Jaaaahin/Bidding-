import React from 'react';
import { requireAdminUser } from '@/lib/auth/session';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminUser();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <AdminSidebar admin={admin} />
        <div className="flex-1 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
