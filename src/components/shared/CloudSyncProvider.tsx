'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const syncWithCloud = usePortfolioStore(s => s.syncWithCloud);

  useEffect(() => {
    syncWithCloud();
  }, []);

  return <>{children}</>;
}
