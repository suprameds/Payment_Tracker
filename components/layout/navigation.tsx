'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊', color: 'from-blue-500 to-indigo-600', roles: ['admin', 'manager', 'dispatcher'] },
  { name: 'New Entry', href: '/entry', icon: '➕', color: 'from-green-500 to-emerald-600', roles: ['admin', 'manager', 'dispatcher'] },
  { name: "Today's Manifest", href: '/manifest', icon: '📄', color: 'from-purple-500 to-indigo-600', roles: ['admin', 'manager', 'dispatcher'] },
  { name: 'Reconciliation', href: '/reconciliation', icon: '💰', color: 'from-amber-500 to-orange-600', roles: ['admin', 'manager'] },
  { name: 'OCR Upload', href: '/ocr', icon: '🔍', color: 'from-pink-500 to-rose-600', roles: ['admin', 'manager', 'dispatcher'] },
  { name: 'Audit Logs', href: '/admin/audit', icon: '🛡️', color: 'from-gray-600 to-gray-800', roles: ['admin'] },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin, isManager } = useAuth();

  // Don't show navigation on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  const userRole = profile?.role || 'dispatcher';

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40 shadow-2xl',
          'transform transition-all duration-300 ease-in-out flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                💊
              </div>
              <div>
                <h2 className="text-xl font-bold">Pharma Dispatch</h2>
              </div>
            </div>
            <p className="text-sm text-blue-100">Payment Reconciliation</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const hasAccess = item.roles.includes(userRole) || (isAdmin && true); // Admin access all
              
              if (!hasAccess) return null;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold',
                    'transition-all duration-200 overflow-hidden',
                    isActive
                      ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
                      : 'text-gray-700 hover:bg-gray-50 hover:scale-105 active:scale-95'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse-glow rounded-xl" />
                  )}
                  
                  {/* Icon with background */}
                  <span className={cn(
                    'relative text-2xl transition-transform group-hover:scale-110',
                    !isActive && 'filter grayscale group-hover:grayscale-0'
                  )}>
                    {item.icon}
                  </span>
                  
                  {/* Label */}
                  <span className="relative">{item.name}</span>
                  
                  {/* Hover shine effect */}
                  {!isActive && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer User Info */}
          <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                   <span className="text-sm font-bold text-gray-800 truncate max-w-[140px]">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                   <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">{userRole}</span>
                </div>
                <button 
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">
              v1.1.0 • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
