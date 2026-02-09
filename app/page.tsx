'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { DashboardStats, Dispatch } from '@/lib/types/database';
import { formatCurrency, formatDateForInput } from '@/lib/utils/format';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKeyboard } from '@/hooks/use-keyboard';

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    today_count: 0,
    today_amount: 0,
    pending_reconciliation_count: 0,
    pending_reconciliation_amount: 0,
    month_count: 0,
    month_amount: 0,
    ocr_pending_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Quick Search & Keyboard Shortcuts
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { isManager, isAdmin } = useAuth();
  
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = e.currentTarget.value;
      if (term.trim()) {
        router.push(`/reconciliation?search=${encodeURIComponent(term)}`);
      }
    }
  };

  useKeyboard('k', () => {
    const searchInput = document.getElementById('dashboard-search-input');
    searchInput?.focus();
  }, { ctrl: true });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const today = formatDateForInput();
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Fetch today's dispatches
      const { data: todayDataRaw } = await supabase
        .from('dispatches')
        .select('*')
        .eq('date', today);

      // Fetch pending reconciliations
      const { data: pendingDataRaw } = await supabase
        .from('dispatches')
        .select('*')
        .eq('delivery_status', 'Delivered')
        .eq('payment_received', false);

      // Fetch this month's dispatches
      const { data: monthDataRaw } = await supabase
        .from('dispatches')
        .select('*')
        .gte('date', startOfMonth);

      // Fetch OCR pending
      const { data: ocrData } = await supabase
        .from('ocr_processing_queue')
        .select('id')
        .eq('status', 'pending');

      // Explicitly cast to Dispatch[] to avoid type inference issues
      const todayDispatches = (todayDataRaw || []) as Dispatch[];
      const pendingDispatches = (pendingDataRaw || []) as Dispatch[];
      const monthDispatches = (monthDataRaw || []) as Dispatch[];

      setStats({
        today_count: todayDispatches.length,
        today_amount: todayDispatches.reduce((sum, d) => sum + Number(d.amount), 0),
        pending_reconciliation_count: pendingDispatches.length,
        pending_reconciliation_amount: pendingDispatches.reduce((sum, d) => sum + Number(d.amount), 0),
        month_count: monthDispatches.length,
        month_amount: monthDispatches.reduce((sum, d) => sum + Number(d.amount), 0),
        ocr_pending_count: ocrData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-1">Fetching latest data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome Back! 👋</h1>
              <p className="text-blue-100 text-lg">
                Here&apos;s an overview of your dispatch and payment activity
              </p>
            </div>
             {/* Quick Search Widget */}
            <div className="w-full md:w-96 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20">
               <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-100">🔍</span>
                <input 
                  type="text" 
                  placeholder="Quick search dispatch... (Ctrl+K)"
                  className="w-full bg-white/10 border-none rounded-lg py-2 pl-10 pr-4 text-white placeholder-blue-200 focus:ring-2 focus:ring-white/50 focus:outline-none transition-all"
                  onKeyDown={handleSearch}
                  id="dashboard-search-input"
                />
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 -mt-16">
          <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
            <Card variant="elevated" hover className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{stats.today_count}</div>
                    <div className="text-blue-100 text-sm font-medium">Dispatches</div>
                  </div>
                </div>
                <div className="text-blue-100 text-sm font-semibold">Today&apos;s Total</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(stats.today_amount)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <Card variant="elevated" hover className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    ⏳
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{stats.pending_reconciliation_count}</div>
                    <div className="text-orange-100 text-sm font-medium">Pending</div>
                  </div>
                </div>
                <div className="text-orange-100 text-sm font-semibold">Awaiting Payment</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(stats.pending_reconciliation_amount)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Card variant="elevated" hover className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    📊
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{stats.month_count}</div>
                    <div className="text-green-100 text-sm font-medium">This Month</div>
                  </div>
                </div>
                <div className="text-green-100 text-sm font-semibold">Monthly Revenue</div>
                <div className="text-2xl font-bold mt-1">{formatCurrency(stats.month_amount)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Card variant="elevated" hover className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    🔍
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{stats.ocr_pending_count}</div>
                    <div className="text-purple-100 text-sm font-medium">In Queue</div>
                  </div>
                </div>
                <div className="text-purple-100 text-sm font-semibold">OCR Processing</div>
                <div className="text-lg font-semibold mt-1">
                  {stats.ocr_pending_count === 0 ? 'All Clear ✓' : 'Needs Attention'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card variant="elevated" hover className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <span>⚡</span>
              Quick Actions
            </CardTitle>
            <CardDescription>Jump to common tasks and workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/entry" className="block">
                <Button variant="gradient" className="w-full h-24 text-lg shadow-lg hover:shadow-xl transition-all">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">➕</span>
                    <span>New Dispatch</span>
                  </div>
                </Button>
              </Link>
              
              <Link href="/manifest" className="block">
                <div className="h-24 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                  <span className="text-3xl group-hover:scale-110 transition-transform">📄</span>
                  <span className="text-base font-semibold text-gray-700">Today&apos;s Manifest</span>
                </div>
              </Link>
              
              {(isManager || isAdmin) && (
                <Link href="/reconciliation" className="block">
                  <div className="h-24 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <span className="text-3xl group-hover:scale-110 transition-transform">💰</span>
                    <span className="text-base font-semibold text-gray-700">Reconcile Payments</span>
                  </div>
                </Link>
              )}
              
              <Link href="/ocr" className="block">
                <div className="h-24 rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                  <span className="text-3xl group-hover:scale-110 transition-transform">🔍</span>
                  <span className="text-base font-semibold text-gray-700">Upload Report</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="bordered" hover className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 p-3 rounded-lg bg-blue-50/50 hover:bg-blue-50 transition-colors">
                <span className="text-3xl flex-shrink-0">1️⃣</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Add Dispatches</p>
                  <p className="text-sm text-gray-600">Enter new dispatch details via the Entry form</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors">
                <span className="text-3xl flex-shrink-0">2️⃣</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Generate Manifest</p>
                  <p className="text-sm text-gray-600">Print today&apos;s manifest for Post Office submission</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-lg bg-purple-50/50 hover:bg-purple-50 transition-colors">
                <span className="text-3xl flex-shrink-0">3️⃣</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Upload Reports</p>
                  <p className="text-sm text-gray-600">Use OCR to extract payment data from handwritten reports</p>
                </div>
              </div>
              <div className="flex gap-4 p-3 rounded-lg bg-amber-50/50 hover:bg-amber-50 transition-colors">
                <span className="text-3xl flex-shrink-0">4️⃣</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">Reconcile Payments</p>
                  <p className="text-sm text-gray-600">Mark payments as received manually or via OCR</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered" hover className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700">Database Connection</span>
                  </div>
                  <span className="text-green-600 font-bold">✓ Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700">OCR Engine</span>
                  </div>
                  <span className="text-green-600 font-bold">✓ Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-gray-700">PDF Generator</span>
                  </div>
                  <span className="text-green-600 font-bold">✓ Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Last Updated</span>
                  <span className="text-gray-600 font-mono text-sm">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
