'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Dispatch } from '@/lib/types/database';
import { formatCurrency, formatPhoneNumber, formatDateForInput, formatDate } from '@/lib/utils/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { pdf } from '@react-pdf/renderer';
import { ManifestPDF } from '@/components/manifest/manifest-pdf';
import { SearchInput } from '@/components/ui/search-input';

import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { EditDispatchModal } from '@/components/dispatch/edit-dispatch-modal';
import { BatchActionBar } from '@/components/ui/batch-action-bar';
import { updateDispatchStatusBatch } from '@/lib/actions/dispatch';
import { Check, CheckSquare, Square } from 'lucide-react';

export default function ManifestPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Filter States
  const [selectedDate, setSelectedDate] = useState(formatDateForInput());

  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingDispatch, setEditingDispatch] = useState<Dispatch | null>(null);

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toast = useToast();
  const { isManager, isAdmin } = useAuth();

  useEffect(() => {
    fetchDispatches();
  }, [selectedDate]);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('dispatches')
        .select('*')
        .is('deleted_at', null)
        .eq('date', selectedDate)
        .order('payment_mode')
        .order('created_at');

      if (fetchError) throw fetchError;

      setDispatches(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch manifest');
    } finally {
      setLoading(false);
    }
  };

  const filteredDispatches = useMemo(() => {
    if (!searchTerm) return dispatches;
    const lowerTerm = searchTerm.toLowerCase();
    return dispatches.filter(d => 
      (d.customer_name?.toLowerCase() || '').includes(lowerTerm) ||
      (d.order_id?.toLowerCase() || '').includes(lowerTerm) ||
      (d.tracking_id?.toLowerCase() || '').includes(lowerTerm) ||
      (d.phone_number || '').includes(lowerTerm)
    );
  }, [dispatches, searchTerm]);

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const doc = <ManifestPDF dispatches={dispatches} date={selectedDate} />;
      const blob = await pdf(doc).toBlob();
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manifest-${selectedDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Manifest PDF generated');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
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

  const handleBatchMarkDelivered = async () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    const { error } = await updateDispatchStatusBatch(Array.from(selectedIds), 'Delivered');
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`${count} dispatches marked as Delivered`);
      setSelectedIds(new Set());
      fetchDispatches();
    }
  };

  const handleBatchPrint = () => {
    // For now, we can filter the existing print logic or implement a new one
    // Current PDF generation takes "dispatches" prop.
    // We can create a temporary "selectedDispatches" array
    if (selectedIds.size === 0) return;

    const selectedDispatches = dispatches.filter(d => selectedIds.has(d.id));
    const doc = <ManifestPDF dispatches={selectedDispatches} date={selectedDate} />;
    
    // We need to re-implement the PDF generation call here slightly differently or abstract it
    // For quick win, let's just trigger the same logic but for selected items
    // Reusing the logic from handleGeneratePDF but with specific data would be best
    // But since handleGeneratePDF uses state, let's just quickly inline it or make a helper
    generateBatchPDF(selectedDispatches);
  };

  const generateBatchPDF = async (items: Dispatch[]) => {
      try {
        setIsGeneratingPDF(true);
        const doc = <ManifestPDF dispatches={items} date={selectedDate} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `manifest-selection-${selectedDate}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Selection PDF generated');
      } catch (err) {
        console.error('Error generating PDF:', err);
        toast.error('Failed to generate PDF');
      } finally {
        setIsGeneratingPDF(false);
      }
  };

  // Group by payment mode
  const codDispatches = filteredDispatches.filter(d => d.payment_mode === 'COD');
  const prepaidDispatches = filteredDispatches.filter(d => d.payment_mode === 'Prepaid');

  const codTotal = codDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const prepaidTotal = prepaidDispatches.reduce((sum, d) => sum + Number(d.amount), 0);
  const grandTotal = codTotal + prepaidTotal;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading manifest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Manifest</h1>
            <p className="mt-2 text-gray-600">
              {formatDate(selectedDate, 'EEEE, d MMMM yyyy')} - {dispatches.length} dispatch{dispatches.length !== 1 ? 'es' : ''}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto"
            />
            <Button
              onClick={handleGeneratePDF}
              disabled={dispatches.length === 0 || isGeneratingPDF}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isGeneratingPDF ? 'Generating...' : '📄 Generate PDF'}
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <SearchInput 
             value={searchTerm} 
             onChange={setSearchTerm} 
             placeholder="Search within manifest..."
             className="w-full max-w-md" 
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {filteredDispatches.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="text-center py-12">
               {searchTerm ? (
                 <>
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-lg text-gray-900 font-semibold">No matches found</p>
                  <p className="mt-2 text-sm text-gray-500">
                    No dispatches match "{searchTerm}"
                  </p>
                 </>
               ) : (
                 <>
                  <p className="text-lg text-gray-600">No dispatches found for this date.</p>
                  <p className="mt-2 text-sm text-gray-500">
                    <a href="/entry" className="text-blue-600 hover:underline">Add a new dispatch</a> to populate the manifest.
                  </p>
                 </>
               )}
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
                          <th className="w-10 px-4 py-3">
                            <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                                {selectedIds.size > 0 && selectedIds.size === filteredDispatches.length ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          {(isManager || isAdmin) && (
                             <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {codDispatches.map((dispatch, index) => (
                          <tr key={dispatch.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(dispatch.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                                <button onClick={() => toggleSelection(dispatch.id)} className={`flex items-center justify-center ${selectedIds.has(dispatch.id) ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {selectedIds.has(dispatch.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                            </td>
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
                            {(isManager || isAdmin) && (
                              <td className="py-3 px-4 text-sm text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingDispatch(dispatch)}
                                >
                                  ✏️
                                </Button>
                              </td>
                            )}
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
                          <th className="w-10 px-4 py-3">
                            <button onClick={toggleSelectAll} className="flex items-center justify-center text-gray-500 hover:text-gray-700">
                                {selectedIds.size > 0 && selectedIds.size === filteredDispatches.length ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tracking ID</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          {(isManager || isAdmin) && (
                             <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {prepaidDispatches.map((dispatch, index) => (
                          <tr key={dispatch.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedIds.has(dispatch.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                                <button onClick={() => toggleSelection(dispatch.id)} className={`flex items-center justify-center ${selectedIds.has(dispatch.id) ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {selectedIds.has(dispatch.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                            </td>
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
                            {(isManager || isAdmin) && (
                              <td className="py-3 px-4 text-sm text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingDispatch(dispatch)}
                                >
                                  ✏️
                                </Button>
                              </td>
                            )}
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
                    <p className="text-sm text-gray-500">{filteredDispatches.length} total dispatches</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <EditDispatchModal
        dispatch={editingDispatch}
        isOpen={!!editingDispatch}
        onClose={() => setEditingDispatch(null)}
        onSuccess={() => {
            fetchDispatches();
            setEditingDispatch(null);
        }}
      />

      <BatchActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Mark Delivered',
            onClick: handleBatchMarkDelivered,
            variant: 'primary'
          },
          {
            label: 'Print Selected',
            onClick: handleBatchPrint,
            variant: 'outline'
          }
        ]}
      />
    </div>
  );
}
