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
  BarChart3,
  Shield,
} from 'lucide-react';
import { useUser } from '@/firebase';
import { isAdmin } from '@/lib/admin';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/events', icon: CalendarPlus, label: 'Events' },
  { href: '/transactions', icon: ReceiptText, label: 'Transactions' },
  { href: '/fraud-detection', icon: ShieldCheck, label: 'Fraud Detection' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  // Admin link is only shown to platform administrators.
  const items = isAdmin(user?.email)
    ? [...navItems, { href: '/admin', icon: Shield, label: 'Admin' }]
    : navItems;

  return (
    <SidebarMenu>
      {items.map((item) => (
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
    </SidebarMenu>
  );
}
