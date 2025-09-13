'use client'

import { useEffect } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface DynamicTitleProps {
  pageTitle: string;
}

export function DynamicTitle({ pageTitle }: DynamicTitleProps) {
  const { storeSettings, isLoading } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      const storeName = storeSettings.store_name;
      const title = storeName ? `${pageTitle} - ${storeName}` : pageTitle;
      document.title = title;
    }
  }, [pageTitle, storeSettings.store_name, isLoading]);

  return null; // This component doesn't render anything
}
