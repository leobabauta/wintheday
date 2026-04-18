'use client';

import ClientNav from './ClientNav';

interface Props {
  unreadCount?: number;
  children: React.ReactNode;
}

export default function ClientShell({ unreadCount = 0, children }: Props) {
  return (
    <div className="min-h-dvh bg-bg flex justify-center">
      <div
        className="w-full max-w-[520px] min-h-dvh bg-bg flex flex-col relative
                   sm:my-6 sm:min-h-0 sm:max-h-[calc(100dvh-3rem)] sm:overflow-y-auto
                   sm:rounded-[28px] sm:border sm:border-border"
      >
        <div className="flex-1 px-6 pt-10 pb-24">
          {children}
        </div>
        <ClientNav unreadCount={unreadCount} />
      </div>
    </div>
  );
}
