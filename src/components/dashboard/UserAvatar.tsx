'use client'

import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/providers/ThemeProvider';

interface UserAvatarProps {
  initials: string;
  name: string;
  email: string;
}

export function UserAvatar({ initials, name, email }: UserAvatarProps) {
  const { isLoading } = useTheme();

  return (
    <div className="flex items-center gap-4">
      {isLoading ? (
        <Skeleton className="w-16 h-16 rounded-full" />
      ) : (
        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
          <span className="text-xl text-primary-foreground font-bold">{initials}</span>
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-muted-foreground">{email}</p>
        <p className="text-sm text-muted-foreground">Member since Jan 2024</p>
      </div>
    </div>
  );
}
