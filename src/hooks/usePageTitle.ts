'use client'

import { useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function usePageTitle(pageTitle: string) {
  const { storeSettings, isLoading } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      const storeName = storeSettings.store_name;
      const title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
      document.title = title;
    }
  }, [pageTitle, storeSettings.store_name, isLoading]);
}
