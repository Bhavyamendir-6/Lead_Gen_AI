// Professional Lead Gen Platform - Enterprise Module
// Global Root Layout (Hydration-Safe Version)

"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import Sidebar from '@/components/shared/Sidebar';
import Navbar from '@/components/shared/Navbar';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { createClient } from '@/lib/supabase-client';

const supabaseClient = createClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const syncWithCloud = usePortfolioStore((state) => state.syncWithCloud);
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user && pathname !== '/login') {
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, [pathname]);

  // Cloud sync: run ONCE on mount after confirming auth
  useEffect(() => {
    setMounted(true);

    if (hasSynced) return;

    const hydrate = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        await syncWithCloud();
        setHasSynced(true);
      }
    };

    hydrate();
  }, [syncWithCloud, hasSynced]);

  if (!mounted) {
    return (
      <html lang="en" className="dark">
        <body className="bg-slate-950 text-slate-200 antialiased">
          <div className="h-screen w-screen bg-slate-950" />
        </body>
      </html>
    );
  }

  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">
        {isLoginPage ? (
          <main className="h-screen w-screen overflow-hidden">
            {children}
          </main>
        ) : (
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 h-full">
              <Navbar />
              <main className="flex-1 overflow-y-auto bg-slate-950">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}