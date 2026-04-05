
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  ReceiptText,
  CalendarPlus,
  ShieldCheck,
  Settings,
  Wallet2,
  Lock,
} from 'lucide-react';
import { useUser } from '@/firebase';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/transactions',
    icon: ReceiptText,
    label: 'Transactions',
  },
  {
    href: '/events',
    icon: CalendarPlus,
    label: 'Events',
  },
  {
    href: '/withdrawals',
    icon: Wallet2,
    label: 'Withdrawals',
  },
  {
    href: '/fraud-detection',
    icon: ShieldCheck,
    label: 'Fraud Detection',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = user?.email === 'admin@chanlopay.com';

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
      
      {isAdmin && (
          <SidebarMenuItem className="mt-4 pt-4 border-t border-sidebar-border">
            <Link href="/admin">
                <SidebarMenuButton
                isActive={pathname === '/admin'}
                tooltip="Admin Portal"
                className="text-primary font-bold hover:bg-primary/10"
                >
                <Lock className="text-primary" />
                <span className="text-primary uppercase tracking-tighter font-black">Admin Portal</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
