'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Dispatch } from '@/lib/types/database';
import { formatCurrency, formatPhoneNumber, formatDateForInput } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pdf } from '@react-pdf/renderer';
import { ManifestPDF } from '@/components/manifest/manifest-pdf';

export default function ManifestPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const today = formatDateForInput();

  useEffect(() => {
    fetchTodayDispatches();
  }, []);

  const fetchTodayDispatches = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('dispatches')
        .select('*')
        .eq('date', today)
        .order('payment_mode')
        .order('created_at');

      if (fetchError) throw fetchError;

      setDispatches(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const doc = <ManifestPDF dispatches={dispatches} date={today} />;
      const blob = await pdf(doc).toBlob();
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manifest-${today}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Group by payment mode
  const codDispatches = dispatches.filter(d => d.payment_mode === 'COD');
  const prepaidDispatches = dispatches.filter(d => d.payment_mode === 'Prepaid');

  const codTotal = codDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const prepaidTotal = prepaidDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const grandTotal = codTotal + prepaidTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading today's manifest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Today's Manifest</h1>
            <p className="mt-2 text-gray-600">
              {formatDateForInput(new Date(today))} - {dispatches.length} dispatch{dispatches.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <Button
            onClick={handleGeneratePDF}
            disabled={dispatches.length === 0 || isGeneratingPDF}
            size="lg"
          >
            {isGeneratingPDF ? 'Generating PDF...' : '📄 Generate PDF'}
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {dispatches.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="text-center py-12">
              <p className="text-lg text-gray-600">No dispatches for today yet.</p>
              <p className="mt-2 text-sm text-gray-500">
                <a href="/entry" className="text-blue-600 hover:underline">Add a new dispatch</a> to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* COD Section */}
            {codDispatches.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cash on Delivery (COD)</CardTitle>
                      <CardDescription>{codDispatches.length} items</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(codTotal)}</p>
                      <p className="text-sm text-gray-500">Total Amount</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codDispatches.map((dispatch, index) => (
                          <tr key={dispatch.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{index + 1}</td>
                            <td className="py-3 px-4 text-sm font-medium">{dispatch.customer_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{formatPhoneNumber(dispatch.phone_number)}</td>
                            <td className="py-3 px-4 text-sm font-mono">{dispatch.tracking_id}</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(Number(dispatch.amount))}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{dispatch.order_id}</td>
                            <td className="py-3 px-4 text-sm">
                              <Badge variant={dispatch.delivery_status === 'Delivered' ? 'success' : 'default'}>
                                {dispatch.delivery_status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prepaid Section */}
            {prepaidDispatches.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Prepaid</CardTitle>
                      <CardDescription>{prepaidDispatches.length} items</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(prepaidTotal)}</p>
                      <p className="text-sm text-gray-500">Total Amount</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prepaidDispatches.map((dispatch, index) => (
                          <tr key={dispatch.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">{index + 1}</td>
                            <td className="py-3 px-4 text-sm font-medium">{dispatch.customer_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{formatPhoneNumber(dispatch.phone_number)}</td>
                            <td className="py-3 px-4 text-sm font-mono">{dispatch.tracking_id}</td>
                            <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(Number(dispatch.amount))}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{dispatch.order_id}</td>
                            <td className="py-3 px-4 text-sm">
                              <Badge variant={dispatch.delivery_status === 'Delivered' ? 'success' : 'default'}>
                                {dispatch.delivery_status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grand Total */}
            <Card variant="bordered">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Grand Total</p>
                    <p className="text-sm text-gray-500">{dispatches.length} total dispatches</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
