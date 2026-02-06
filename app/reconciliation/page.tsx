'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Dispatch } from '@/lib/types/database';
import { formatCurrency, formatPhoneNumber, formatDate, daysSince, getDaysPendingColor } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaymentToggle } from '@/components/reconciliation/payment-toggle';

export default function ReconciliationPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingReconciliations();
  }, []);

  const fetchPendingReconciliations = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('dispatches')
        .select('*')
        .eq('delivery_status', 'Delivered')
        .eq('payment_received', false)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setDispatches(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = dispatches.reduce((sum, d) => sum + Number(d.amount), 0);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Reconciliation</h1>
          <p className="mt-2 text-gray-600">
            Delivered orders awaiting payment confirmation
          </p>
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
                <p className="text-sm text-gray-500">Pending Payments</p>
                <p className="text-3xl font-bold text-gray-900">{dispatches.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalPending)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Days Pending</p>
                <p className="text-3xl font-bold text-orange-600">
                  {dispatches.length > 0
                    ? Math.round(dispatches.reduce((sum, d) => sum + daysSince(d.date), 0) / dispatches.length)
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
        ) : (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Pending Reconciliations</CardTitle>
              <CardDescription>
                Click "Mark as Paid" when you receive cash payment for delivered orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Days</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mode</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((dispatch) => {
                      const days = daysSince(dispatch.date);
                      return (
                        <tr key={dispatch.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                            <PaymentToggle
                              dispatchId={dispatch.id}
                              currentStatus={dispatch.payment_received}
                              trackingId={dispatch.tracking_id}
                              onSuccess={fetchPendingReconciliations}
                            />
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
    </div>
  );
}
