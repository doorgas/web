'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, User, Package, MessageCircle, Truck, Settings, HeadphonesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  role?: string[];
}

const getNavItems = (userRole: string): NavItem[] => [
  { icon: Home, label: 'Shop', href: '/' },
  { icon: ShoppingCart, label: 'Cart', href: '/cart' },
  { 
    icon: userRole === 'driver' ? Truck : Package, 
    label: userRole === 'driver' ? 'Delivery' : 'Orders', 
    href: userRole === 'driver' ? '/deliveries' : '/orders' 
  },
  { icon: MessageCircle, label: 'Chat', href: '/chat' },
  { icon: HeadphonesIcon, label: 'Support', href: '/support', role: ['customer'] },
  { icon: User, label: 'Profile', href: '/dashboard' },
  { icon: Settings, label: 'Admin', href: '/admin', role: ['admin'] },
];

interface MobileNavProps {
  userRole?: string;
}

export function MobileNav({ userRole = 'customer' }: MobileNavProps) {
  const pathname = usePathname();
  const { state } = useCart();
  const { isLoading } = useTheme();

  const navItems = getNavItems(userRole);
  const filteredItems = navItems.filter(item => 
    !item.role || item.role.includes(userRole)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="flex justify-around items-center py-2 px-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200",
                isActive
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.label === 'Cart' && state.itemCount > 0 && (
                  isLoading ? (
                    <Skeleton className="absolute -top-2 -right-2 h-5 w-5 rounded-full" />
                  ) : (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {state.itemCount}
                    </span>
                  )
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}