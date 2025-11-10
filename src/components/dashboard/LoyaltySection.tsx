'use client'

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/providers/ThemeProvider';

interface LoyaltySectionProps {
  pendingPoints: number;
}

export function LoyaltySection({ pendingPoints }: LoyaltySectionProps) {
  const { isLoading } = useTheme();

  return (
    <div className="grid grid-cols-1 gap-2">
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : (
        <div className="p-3 bg-gradient-primary/10 border border-primary/20 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Pending Points</p>
          <p className="text-lg font-semibold text-primary">+{pendingPoints} pts</p>
          <p className="text-xs text-muted-foreground mt-1">Available after order completion</p>
        </div>
      )}
    </div>
  );
}

interface ReferralBadgeProps {
  points: number;
}

export function ReferralBadge({ points }: ReferralBadgeProps) {
  const { isLoading } = useTheme();

  if (isLoading) {
    return <Skeleton className="h-6 w-16 rounded-full" />;
  }

  return (
    <Badge className="bg-primary text-primary-foreground">
      +{points} pts
    </Badge>
  );
}
