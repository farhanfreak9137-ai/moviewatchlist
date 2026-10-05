'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

export function HardwareBackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isSubscribed = true;

    const backListenerPromise = CapApp.addListener('backButton', () => {
      if (!isSubscribed) return;
      const now = Date.now();

      // 1. If an open modal exists, close it first
      const modalCloseBtn = document.querySelector<HTMLButtonElement>('[data-modal-close="true"]');
      if (modalCloseBtn) {
        modalCloseBtn.click();
        return;
      }

      // 2. If viewing a show detail (/title), go back to where the user was (e.g. /search with results)
      if (pathname.startsWith('/title')) {
        router.back();
        return;
      }

      // 3. If on another page (/search, /library, /stats, /settings), send directly to home page
      if (pathname !== '/') {
        router.push('/');
        return;
      }

      // 4. If already on home page ('/'): require 2 taps within 2 seconds to exit app
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        setShowExitToast(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    });

    return () => {
      isSubscribed = false;
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [pathname, router]);

  if (!showExitToast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
      <div className="px-4 py-2.5 rounded-full bg-[#161824]/95 border border-white/20 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span>Press back again to exit WatchVault</span>
      </div>
    </div>
  );
}
