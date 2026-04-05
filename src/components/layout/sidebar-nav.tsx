
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
} from 'lucide-react';

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
