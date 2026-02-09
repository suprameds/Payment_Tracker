'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Dispatch } from '@/lib/types/database';
import { formatCurrency, formatPhoneNumber, formatDate, daysSince, getDaysPendingColor } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentToggle } from '@/components/reconciliation/payment-toggle';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { useKeyboard } from '@/hooks/use-keyboard';
import { useToast } from '@/components/providers/toast-provider';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { EditDispatchModal } from '@/components/dispatch/edit-dispatch-modal';
import { BatchActionBar } from '@/components/ui/batch-action-bar';
import { updatePaymentStatusBatch } from '@/lib/actions/dispatch';
import { CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReconciliationPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Edit State
  // Edit State
  const [editingDispatch, setEditingDispatch] = useState<Dispatch | null>(null);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilters, setPaymentFilters] = useState<string[]>([]);
  const [daysFilter, setDaysFilter] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Dispatch | 'days'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { isManager, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isManager && !isAdmin) {
      toast.error('You do not have permission to access this page');
      router.push('/');
    }
  }, [isManager, isAdmin, authLoading, router, toast]);

  useEffect(() => {
    if (isManager || isAdmin) {
      fetchPendingReconciliations();
    }
  }, [isManager, isAdmin]);

  // Keyboard Shortcuts
  useKeyboard('f', () => {
    const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
    searchInput?.focus();
  }, { ctrl: true });

  useKeyboard('Escape', () => {
    setSearchTerm('');
    setPaymentFilters([]);
    setDaysFilter([]);
    (document.activeElement as HTMLElement)?.blur();
  });

  const fetchPendingReconciliations = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('dispatches')
        .select('*')
        .is('deleted_at', null)
        .eq('delivery_status', 'Delivered')
        .eq('payment_received', false)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setDispatches(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch reconciliations');
    } finally {
      setLoading(false);
    }
  };

  // Batch Selection Handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDispatches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDispatches.map(d => d.id)));
    }
  };

  const handleBatchMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    const { error } = await updatePaymentStatusBatch(Array.from(selectedIds), true);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`${count} payments marked as received`);
      setSelectedIds(new Set());
      fetchPendingReconciliations();
    }
  };

  // Filter & Sort Logic
  const filteredDispatches = useMemo(() => {
    let result = [...dispatches];

    // Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(d => 
        (d.customer_name?.toLowerCase() || '').includes(lowerTerm) ||
        (d.order_id?.toLowerCase() || '').includes(lowerTerm) ||
        (d.tracking_id?.toLowerCase() || '').includes(lowerTerm) ||
        (d.phone_number || '').includes(lowerTerm)
      );
    }

    // Payment Mode Filter
    if (paymentFilters.length > 0) {
      result = result.filter(d => paymentFilters.includes(d.payment_mode));
    }

    // Days Pending Filter
    if (daysFilter.length > 0) {
      result = result.filter(d => {
        const days = daysSince(d.date);
        if (daysFilter.includes('0-3') && days <= 3) return true;
        if (daysFilter.includes('4-7') && days >= 4 && days <= 7) return true;
        if (daysFilter.includes('8-14') && days >= 8 && days <= 14) return true;
        if (daysFilter.includes('15+') && days >= 15) return true;
        return false;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Dispatch];
      let bValue: any = b[sortConfig.key as keyof Dispatch];

      if (sortConfig.key === 'days') {
        aValue = daysSince(a.date);
        bValue = daysSince(b.date);
      } else if (sortConfig.key === 'amount') {
        aValue = Number(a.amount);
        bValue = Number(b.amount);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dispatches, searchTerm, paymentFilters, daysFilter, sortConfig]);

  const handleSort = (key: keyof Dispatch | 'days') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: keyof Dispatch | 'days' }) => {
    if (sortConfig.key !== column) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const totalPending = filteredDispatches.reduce((sum, d) => sum + Number(d.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending reconciliations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Reconciliation</h1>
            <p className="mt-2 text-gray-600">
              Delivered orders awaiting payment confirmation
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
             <SearchInput 
               value={searchTerm} 
               onChange={setSearchTerm} 
               placeholder="Search..."
               className="w-full sm:w-64" 
              />
              <div className="flex gap-2">
                <FilterDropdown
                  title="Payment"
                  options={[
                    { value: 'COD', label: 'COD' },
                    { value: 'Prepaid', label: 'Prepaid' }
                  ]}
                  selectedValues={paymentFilters}
                  onChange={setPaymentFilters}
                />
                <FilterDropdown
                  title="Age"
                  options={[
                    { value: '0-3', label: '0-3 days' },
                    { value: '4-7', label: '4-7 days' },
                    { value: '8-14', label: '8-14 days' },
                    { value: '15+', label: '15+ days' }
                  ]}
                  selectedValues={daysFilter}
                  onChange={setDaysFilter}
                />
              </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Card */}
        <Card variant="elevated" className="mb-6">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Filtered Pending Payments</p>
                <p className="text-3xl font-bold text-gray-900">{filteredDispatches.length} <span className="text-base font-normal text-gray-400">/ {dispatches.length}</span></p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Filtered Amount</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalPending)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Days Pending</p>
                <p className="text-3xl font-bold text-orange-600">
                  {filteredDispatches.length > 0
                    ? Math.round(filteredDispatches.reduce((sum, d) => sum + daysSince(d.date), 0) / filteredDispatches.length)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Dispatches Table */}
        {dispatches.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">✓</div>
              <p className="text-lg text-gray-900 font-semibold">All caught up!</p>
              <p className="mt-2 text-sm text-gray-500">
                No pending payment reconciliations at this time.
              </p>
            </CardContent>
          </Card>
        ) : filteredDispatches.length === 0 ? (
           <Card variant="elevated">
            <CardContent className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-lg text-gray-900 font-semibold">No matches found</p>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your search filters.
              </p>
              <button 
                onClick={() => { setSearchTerm(''); setPaymentFilters([]); setDaysFilter([]); }}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Reconciliations</CardTitle>
                <CardDescription>
                  Click "Mark as Paid" when you receive cash payment for delivered orders
                </CardDescription>
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-gray-600 font-sans">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-gray-600 font-sans">F</kbd> to search
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="w-10 px-4 py-3">
                         <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                            {selectedIds.size > 0 && selectedIds.size === filteredDispatches.length ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('date')}>
                        Date <SortIcon column="date" />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('customer_name')}>
                        Customer <SortIcon column="customer_name" />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('amount')}>
                        Amount <SortIcon column="amount" />
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('days')}>
                        Days <SortIcon column="days" />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mode</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDispatches.map((dispatch) => {
                      const days = daysSince(dispatch.date);
                      return (
                        <tr key={dispatch.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(dispatch.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3">
                              <button onClick={() => toggleSelection(dispatch.id)} className={`flex items-center justify-center ${selectedIds.has(dispatch.id) ? 'text-blue-600' : 'text-gray-400'}`}>
                                  {selectedIds.has(dispatch.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                          </td>
                          <td className="py-3 px-4 text-sm">{formatDate(dispatch.date, 'dd MMM')}</td>
                          <td className="py-3 px-4 text-sm font-medium">{dispatch.customer_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatPhoneNumber(dispatch.phone_number)}</td>
                          <td className="py-3 px-4 text-sm font-mono">{dispatch.tracking_id}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{dispatch.order_id}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(Number(dispatch.amount))}</td>
                          <td className="py-3 px-4 text-sm text-center">
                            <span className={`font-semibold ${getDaysPendingColor(days)}`}>
                              {days}d
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Badge variant={dispatch.payment_mode === 'COD' ? 'warning' : 'info'}>
                              {dispatch.payment_mode}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <PaymentToggle
                                dispatchId={dispatch.id}
                                currentStatus={dispatch.payment_received}
                                trackingId={dispatch.tracking_id}
                                onSuccess={fetchPendingReconciliations}
                              />
                              {(isManager || isAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingDispatch(dispatch)}
                                  title="Edit Dispatch"
                                >
                                  ✏️
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {dispatches.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">Days Pending Legend:</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-600"></span>
                <span>0-3 days</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-600"></span>
                <span>4-7 days</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-600"></span>
                <span>8-14 days</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                <span>15+ days</span>
              </span>
            </div>
          </div>
        )}

      </div>

      <EditDispatchModal
        dispatch={editingDispatch}
        isOpen={!!editingDispatch}
        onClose={() => setEditingDispatch(null)}
        onSuccess={() => {
            fetchPendingReconciliations();
            setEditingDispatch(null);
        }}
      />

      <BatchActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Mark Paid',
            onClick: handleBatchMarkPaid,
            variant: 'primary'
          }
        ]}
      />
    </div>
  );
}
