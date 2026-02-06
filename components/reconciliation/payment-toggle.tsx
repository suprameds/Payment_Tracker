'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface PaymentToggleProps {
  dispatchId: string;
  currentStatus: boolean;
  trackingId: string;
  onSuccess?: () => void;
}

export function PaymentToggle({ dispatchId, currentStatus, trackingId, onSuccess }: PaymentToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = async () => {
    if (!currentStatus && !showConfirm) {
      // Show confirmation before marking as paid
      setShowConfirm(true);
      return;
    }

    setIsUpdating(true);

    try {
      const newStatus = !currentStatus;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update dispatch
      const { error } = await supabase
        .from('dispatches')
        .update({
          payment_received: newStatus,
          payment_received_at: newStatus ? new Date().toISOString() : null,
          payment_received_by: newStatus ? (user?.email || 'manual') : null,
          last_modified_by: user?.id || null,
        })
        .eq('id', dispatchId);

      if (error) throw error;

      setShowConfirm(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error updating payment status:', err);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="inline-flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={handleToggle}
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : '✓ Confirm'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isUpdating}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant={currentStatus ? 'secondary' : 'primary'}
      onClick={handleToggle}
      disabled={isUpdating}
    >
      {isUpdating ? '...' : currentStatus ? '✓ Paid' : 'Mark as Paid'}
    </Button>
  );
}
