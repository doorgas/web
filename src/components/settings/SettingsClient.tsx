'use client'

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { User, Mail, Phone, MapPin, Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';


interface UserProfile {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  driverMessages: boolean;
}

interface SettingsClientProps {
  session: Session;
}

export function SettingsClient({ session }: SettingsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: ''
  });
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    orderUpdates: true,
    promotions: false,
    driverMessages: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState({
    orderUpdates: false,
    promotions: false,
    driverMessages: false
  });

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/settings/user');
      if (response.ok) {
        const userData = await response.json();
        setProfile({
          name: userData.name || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
                      city: userData.city || '',
            state: userData.state || '',
            country: userData.country || '',
            postalCode: userData.postalCode || ''
        });
        setNotifications({
          orderUpdates: userData.notifyOrderUpdates || false,
          promotions: userData.notifyPromotions || false,
          driverMessages: userData.notifyDriverMessages || false
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile
        }),
      });

      if (response.ok) {
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error", 
        description: "Failed to update profile.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = async (type: keyof NotificationSettings, checked: boolean) => {
    // Update local state immediately for responsive UI
    const newNotifications = { ...notifications, [type]: checked };
    setNotifications(newNotifications);
    
    // Set loading state for this specific notification
    setNotificationSaving(prev => ({ ...prev, [type]: true }));
    
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications: newNotifications
        }),
      });

      if (response.ok) {
        toast({
          title: "Notification preference updated",
          description: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')} ${checked ? 'enabled' : 'disabled'}.`,
        });
      } else {
        // Revert the change if the request failed
        setNotifications(notifications);
        throw new Error('Failed to update notification preference');
      }
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert the change
      setNotifications(notifications);
      toast({
        title: "Error", 
        description: "Failed to update notification preference.",
        variant: "destructive"
      });
    } finally {
      setNotificationSaving(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleLogout = async () => {
    router.push('/logout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Account Settings" showBack />
        <main className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Account Settings" showBack />
      
      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  className="pl-10"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  className="pl-10"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="NY"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  placeholder="United States"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={profile.postalCode}
                  onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSaveProfile} 
              className="w-full"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings 
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Order Updates</p>
                <p className="text-xs text-muted-foreground">Get notified about order status changes</p>
              </div>
              <Switch
                checked={notifications.orderUpdates}
                disabled={notificationSaving.orderUpdates}
                onCheckedChange={(checked) => 
                  handleNotificationChange('orderUpdates', checked)
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Promotions</p>
                <p className="text-xs text-muted-foreground">Receive promotional offers and discounts</p>
              </div>
              <Switch
                checked={notifications.promotions}
                disabled={notificationSaving.promotions}
                onCheckedChange={(checked) => 
                  handleNotificationChange('promotions', checked)
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Driver Messages</p>
                <p className="text-xs text-muted-foreground">Get notified of driver communications</p>
              </div>
              <Switch
                checked={notifications.driverMessages}
                disabled={notificationSaving.driverMessages}
                onCheckedChange={(checked) => 
                  handleNotificationChange('driverMessages', checked)
                }
              />
            </div>
          </CardContent>
        </Card>*/}

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}