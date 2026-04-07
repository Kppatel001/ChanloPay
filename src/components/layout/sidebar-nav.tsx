
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
  ShieldAlert,
} from 'lucide-react';
import { useUser } from '@/firebase';

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  const isAdmin = user?.email === 'admin@chanlopay.com';

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

  if (isAdmin) {
    navItems.push({
      href: '/admin',
      icon: ShieldAlert,
      label: 'Admin Portal',
    });
  }

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
    </SidebarMenu>
  );
}
