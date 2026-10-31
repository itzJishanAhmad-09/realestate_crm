'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function Header({ userName, companyName, userRole }: { userName: string; companyName: string; userRole: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 bg-[#F9F6F0] px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button></SheetTrigger>
        <SheetContent side="left" className="p-0 border-none"><Sidebar onNavigate={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>
      
      <div className="hidden md:block text-sm font-medium text-muted-foreground">
        {companyName}
      </div>
      
      <div className="ml-auto flex items-center gap-4">
        <Button asChild className="bg-[#A30000] hover:bg-[#C62828] text-white font-medium shadow-none rounded-md px-6">
          <Link href="/calling">Start calling</Link>
        </Button>
        
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-full bg-white border text-gray-700 shadow-sm" onClick={() => setMenuOpen(!menuOpen)}>
            <User className="h-4 w-4" />
          </Button>
          
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-md border bg-white p-1 shadow-lg">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole.replace('_', ' ')}</p>
                </div>
                <a href="/api/auth/logout" className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}