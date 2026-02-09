'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateDispatchStatusBatch(ids: string[], status: 'Dispatched' | 'Delivered' | 'Returned' | 'Lost') {
  const supabase: any = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('dispatches')
      .update({ 
        delivery_status: status,
        last_modified_by: user.id,
        updated_at: new Date().toISOString()
      } as any)
      .in('id', ids);

    if (error) {
      console.error('Error updating dispatch status batch:', error);
      return { error: error.message };
    }

    revalidatePath('/manifest');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating dispatch status batch:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function updatePaymentStatusBatch(ids: string[], paymentReceived: boolean) {
  const supabase: any = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('dispatches')
      .update({ 
        payment_received: paymentReceived,
        payment_received_at: paymentReceived ? new Date().toISOString() : null,
        payment_received_by: paymentReceived ? user.id : null,
        last_modified_by: user.id,
        updated_at: new Date().toISOString()
      } as any)
      .in('id', ids);

    if (error) {
      console.error('Error updating payment status batch:', error);
      return { error: error.message };
    }

    revalidatePath('/reconciliation');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating payment status batch:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function softDeleteDispatch(id: string) {
  const supabase: any = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('dispatches')
      .update({ 
        deleted_at: new Date().toISOString(),
        last_modified_by: user.id
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error soft deleting dispatch:', error);
      return { error: error.message };
    }

    // Log to Audit Log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'dispatches',
        record_id: id,
        action: 'DELETE', // Soft delete
        old_data: null, // Could fetch before update if needed, but for now just logging the action
        new_data: { deleted_at: new Date().toISOString() },
        changed_by: user.id
      });

    if (auditError) {
       console.error('Error logging audit:', auditError);
       // Don't fail the operation if audit fails, but log it
    }

    revalidatePath('/manifest');
    revalidatePath('/reconciliation');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error soft deleting dispatch:', error);
    return { error: 'An unexpected error occurred' };
  }
}
