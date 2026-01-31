
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { user, userLoyaltyPoints, loyaltyPointsHistory, settings } from '@/lib/schema';
import { eq, and, gte, sql, or } from 'drizzle-orm';

import { Star, Gift, Users, Phone, MessageCircle, Settings, LogOut, Link } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DriverDashboard } from '@/components/driver/DriverDashboard';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { UserAvatar } from '@/components/dashboard/UserAvatar';
import { LoyaltySection, ReferralBadge } from '@/components/dashboard/LoyaltySection';
import { DateDisplay } from '@/components/ui/date-display';
import { Skeleton } from '@/components/ui/skeleton';
import { TestPointsButton } from '@/components/loyalty/TestPointsButton';
import { QuickActions } from '@/components/dashboard/QuickActions';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/register');
  }

  // Fetch user data including name and type
  let userType = 'customer';
  let userName = session.user?.name || null;
  
  try {
    const userData = await db
      .select({ 
        userType: user.userType,
        name: user.name 
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    
    if (userData.length > 0) {
      userType = userData[0].userType || 'customer';
      // If name is not in session but exists in database, use database name
      if (!userName && userData[0].name) {
        userName = userData[0].name;
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  // If user is a driver, show driver dashboard
  if (userType === 'driver') {
    return <DriverDashboard session={session} />;
  }

  // Fetch loyalty data directly from database
  let loyaltyData = {
    availablePoints: 0,
    rewardValue: 0,
    thisMonthPoints: 0,
    totalRedeemed: 0,
    pendingPoints: 0
  };

  try {
    // Check if database is configured
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS && process.env.DB_NAME) {
      // Initialize loyalty settings if they don't exist
      const existingSettings = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'loyalty_enabled'))
        .limit(1);

      if (existingSettings.length === 0) {
        // Initialize default settings
        const defaultSettings = [
          { id: crypto.randomUUID(), key: 'loyalty_enabled', value: 'true', description: 'Enable loyalty points system', category: 'loyalty', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
          { id: crypto.randomUUID(), key: 'points_earning_rate', value: '1', description: 'Points earned per dollar spent', category: 'loyalty', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
          { id: crypto.randomUUID(), key: 'points_redemption_value', value: '0.01', description: 'Dollar value per point when redeemed', category: 'loyalty', isPublic: false, createdAt: new Date(), updatedAt: new Date() }
        ];
        
        await db.insert(settings).values(defaultSettings);
        console.log('✅ Initialized default loyalty settings');
      }

      // Get user loyalty points
      const userPoints = await db
        .select()
        .from(userLoyaltyPoints)
        .where(eq(userLoyaltyPoints.userId, session.user.id))
        .limit(1);

      // Get loyalty settings for redemption value
      const loyaltySettings = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'points_redemption_value'))
        .limit(1);

      const redemptionValue = loyaltySettings.length > 0 
        ? parseFloat(loyaltySettings[0].value) 
        : 0.01;

      // Calculate this month's earned points
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthPoints = await db
        .select({
          totalPoints: sql<number>`COALESCE(SUM(${loyaltyPointsHistory.points}), 0)`
        })
        .from(loyaltyPointsHistory)
        .where(
          and(
            eq(loyaltyPointsHistory.userId, session.user.id),
            eq(loyaltyPointsHistory.transactionType, 'earned'),
            gte(loyaltyPointsHistory.createdAt, startOfMonth)
          )
        );

      // Calculate total redeemed amount
      const totalRedeemed = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(CAST(${loyaltyPointsHistory.discountAmount} AS DECIMAL(10,2))), 0)`
        })
        .from(loyaltyPointsHistory)
        .where(
          and(
            eq(loyaltyPointsHistory.userId, session.user.id),
            eq(loyaltyPointsHistory.transactionType, 'redeemed')
          )
        );

      const availablePoints = userPoints[0]?.availablePoints || 0;
      const pendingPoints = userPoints[0]?.pendingPoints || 0;
      const thisMonthPointsEarned = thisMonthPoints[0]?.totalPoints || 0;
      const totalRedeemedAmount = totalRedeemed[0]?.totalAmount || 0;
      const rewardValue = availablePoints * redemptionValue;

      loyaltyData = {
        availablePoints,
        rewardValue,
        thisMonthPoints: thisMonthPointsEarned,
        totalRedeemed: totalRedeemedAmount,
        pendingPoints
      };

      console.log('✅ Loyalty data loaded directly from database:', loyaltyData);
    } else {
      console.log('⚠️ Database not configured, using default loyalty data');
    }
  } catch (error) {
    console.error('Error fetching loyalty data:', error);
  }

  // Fetch active delivery data (simplified for now)
  let activeDelivery = null;
  
  // Note: For now, we'll set this to null. If you need active delivery data,
  // we can fetch it directly from the database like we did with loyalty data.
  // This avoids server-side API calls that can cause build issues.

  return (


<div className="min-h-screen bg-background pb-20">
      <Header title="Profile" />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="pt-6">
            <UserAvatar 
              initials="JD"
              name={userName || 'User'}
              email={session.user?.email || ''}
            />
          </CardContent>
        </Card>

        {/* Loyalty Points */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star h-5 w-5 text-yellow-400"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>Loyalty Rewards</h3></div>
          <div className="p-6 pt-0 space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">{loyaltyData.availablePoints}</div>
              <p className="text-muted-foreground">Points Available</p>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80 bg-success text-success-foreground">Worth $
                {loyaltyData.rewardValue.toFixed(2)} 
                &nbsp;in rewards</div>
            </div>

            <LoyaltySection pendingPoints={loyaltyData.pendingPoints} />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-accent rounded-lg backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-lg font-semibold">+{loyaltyData.thisMonthPoints} pts</p>
              </div>
              <div className="p-3 bg-accent rounded-lg backdrop-blur-sm">
                <p className="text-sm text-muted-foreground">Redeemed</p>
                <p className="text-lg font-semibold">${loyaltyData.totalRedeemed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            


          </div>
        </div>

        {/* Referral Program 
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Refer Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg">
                Earn <span className="font-bold text-primary">100 points</span> for each friend!
              </div>
              <p className="text-sm text-muted-foreground">
                Your friends get 20% off their first order
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral">Your Referral Code</Label>
              <div className="flex gap-2">
                <Input 
                  id="referral"
                  readOnly 
                  className="font-mono"
                />
                <Button variant="outline">
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
              <div>
                <p className="font-medium">Friends Referred</p>
                <p className="text-sm text-muted-foreground">0 successful referrals</p>
              </div>
              <ReferralBadge points={0} />
            </div>
          </CardContent>
        </Card>
        */}

        {/* Quick Actions */}
        <QuickActions />

        {/* Active delivery section temporarily disabled - can be re-enabled when needed */}
      </main>

      <MobileNav />
    </div>

  );
}