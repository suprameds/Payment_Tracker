'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊', color: 'from-blue-500 to-indigo-600' },
  { name: 'New Entry', href: '/entry', icon: '➕', color: 'from-green-500 to-emerald-600' },
  { name: "Today's Manifest", href: '/manifest', icon: '📄', color: 'from-purple-500 to-indigo-600' },
  { name: 'Reconciliation', href: '/reconciliation', icon: '💰', color: 'from-amber-500 to-orange-600' },
  { name: 'OCR Upload', href: '/ocr', icon: '🔍', color: 'from-pink-500 to-rose-600' },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          'transform transition-all duration-300 ease-in-out',
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

          {/* Footer Stats */}
          <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">System Status</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span className="font-mono font-semibold text-green-600">99.9%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center font-medium">
              v1.0.0 • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
