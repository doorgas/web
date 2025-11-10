'use client'

import { Search, Bell, Menu, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/components/providers/ThemeProvider';

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  notifications?: number;
  onMenuClick?: () => void;
  showBack?: boolean;
}

export function Header({ title, showSearch = false, notifications = 0, onMenuClick, showBack = false }: HeaderProps) {
  const router = useRouter();
  const { storeSettings, isLoading } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-card backdrop-blur border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {onMenuClick && !showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            {/* Store Logo and Name */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="h-6 w-32" />
                </>
              ) : (
                <>
                  {(storeSettings.appearance_logo_url || storeSettings.logo_url) && (
                    <div className="relative w-8 h-8">
                      <Image
                        src={storeSettings.appearance_logo_url || storeSettings.logo_url || ''}
                        alt="Store Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {storeSettings.store_name || title}
                  </h1>
                </>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-3">
            {showSearch && (
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10 w-64"
                />
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="relative hidden">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary">
                  {notifications}
                </Badge>
              )}
            </Button>
          </div>
        </div>
        
        {showSearch && (
          <div className="mt-3 sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-10 w-full"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}