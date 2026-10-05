'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { MobileNav } from './MobileNav';
import { HardwareBackButtonHandler } from './HardwareBackButtonHandler';
import { syncEngine } from '@/lib/sync/syncEngine';

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initial sync trigger on app load if online
    if (typeof window !== 'undefined' && navigator.onLine) {
      syncEngine.scheduleSync(3000);
    }

    // Register service worker for offline shell if supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Android Hardware Back Button Interceptor */}
      <HardwareBackButtonHandler />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-32 sm:pb-28 lg:pb-8">
        <TopHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
