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
} from 'lucide-react';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    href: '/events',
    icon: CalendarPlus,
    label: 'Events',
  },
  {
    href: '/transactions',
    icon: ReceiptText,
    label: 'Transactions',
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
            </SidebarMe