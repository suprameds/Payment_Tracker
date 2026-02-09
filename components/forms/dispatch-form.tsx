'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dispatchFormSchema, type DispatchFormData } from '@/lib/validations/dispatch';
import { formatDateForInput, formatCurrency } from '@/lib/utils/format';
import { supabase } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/components/providers/toast-provider';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dispatch } from '@/lib/types/database';

interface DispatchFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Dispatch;
}

export function DispatchForm({ onSuccess, onCancel, initialData }: DispatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isEditMode = !!initialData;

  // Real-time validation states
  const [orderIdStatus, setOrderIdStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [trackingIdStatus, setTrackingIdStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchFormSchema),
    defaultValues: {
      date: initialData ? initialData.date : formatDateForInput(),
      delivery_status: initialData ? initialData.delivery_status as any : 'Dispatched',
      order_id: initialData?.order_id || '',
      customer_name: initialData?.customer_name || '',
      phone_number: initialData?.phone_number || '',
      amount: initialData ? Number(initialData.amount) : 0,
      payment_mode: initialData?.payment_mode as any || 'COD',
      tracking_id: initialData?.tracking_id || '',
    },
  });

  // Watch form values for real-time validation
  const watchedOrderId = watch('order_id');
  const watchedTrackingId = watch('tracking_id');
  const watchedPhoneNumber = watch('phone_number');
  const watchedAmount = watch('amount');

  // Debounce values for API calls
  const debouncedOrderId = useDebounce(watchedOrderId, 500);
  const debouncedTrackingId = useDebounce(watchedTrackingId, 500);

  // Check for duplicate order ID
  useEffect(() => {
    // Skip check if value matches initial data (no change) or is too short
    if (initialData && debouncedOrderId === initialData.order_id) {
       setOrderIdStatus('idle');
       return;
    }

    if (!debouncedOrderId || debouncedOrderId.length < 3) {
      setOrderIdStatus('idle');
      return;
    }

    const checkOrderIdDuplicate = async () => {
      setOrderIdStatus('checking');
      const { data } = await supabase
        .from('dispatches')
        .select('id')
        .eq('order_id', debouncedOrderId)
        .maybeSingle();
      
      // If found data ID is different from current editing ID, it's a duplicate
      // explicit cast to handle potential type inference issues
      const existing = data as { id: string } | null;
      if (existing && initialData && existing.id === initialData.id) {
          setOrderIdStatus('valid');
      } else {
          setOrderIdStatus(existing ? 'duplicate' : 'valid');
      }
    };

    checkOrderIdDuplicate();
  }, [debouncedOrderId, initialData]);

  // Check for duplicate tracking ID
  useEffect(() => {
    // Skip if unchanged
    if (initialData && debouncedTrackingId === initialData.tracking_id) {
        setTrackingIdStatus('idle');
        return;
    }

    if (!debouncedTrackingId || debouncedTrackingId.length < 3) {
      setTrackingIdStatus('idle');
      return;
    }

    const checkTrackingIdDuplicate = async () => {
      setTrackingIdStatus('checking');
      const { data } = await supabase
        .from('dispatches')
        .select('id')
        .eq('tracking_id', debouncedTrackingId.toUpperCase())
        .maybeSingle();

      const existing = data as { id: string } | null;
      if (existing && initialData && existing.id === initialData.id) {
        setTrackingIdStatus('valid');
      } else {
        setTrackingIdStatus(existing ? 'duplicate' : 'valid');
      }
    };

    checkTrackingIdDuplicate();
  }, [debouncedTrackingId, initialData]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phone_number', formatted);
  };

  // Auto-uppercase tracking ID
  const handleTrackingIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('tracking_id', e.target.value.toUpperCase());
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file size must be less than 5MB');
        setError('Image file size must be less than 5MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        setError('Please select a valid image file');
        return;
      }
      setImageFile(file);
      setError(null);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('dispatch-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dispatch-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const onSubmit = async (data: DispatchFormData) => {
    // Don't submit if duplicates detected
    if (orderIdStatus === 'duplicate') {
      toast.error('Order ID already exists. Please use a unique ID.');
      return;
    }
    if (trackingIdStatus === 'duplicate') {
      toast.warning('Tracking ID already exists. Are you sure this is correct?');
      // Allow submission but warn user
    }

    setIsSubmitting(true);
    setError(null);
    const loadingToast = toast.loading(isEditMode ? 'Updating dispatch...' : 'Adding dispatch...');

    try {
      // Upload image if provided
      let imageUrl: string | undefined = initialData?.source_image_url || undefined;
      if (imageFile) {
        imageUrl = (await uploadImage(imageFile)) || undefined;
        if (!imageUrl) {
          toast.error('Failed to upload image. Continuing without image.');
        }
      }

      // Get current user (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();

      if (isEditMode && initialData) {
          // UPDATE
          const { error: updateError } = await (supabase
            .from('dispatches') as any)
            .update({
                ...data,
                source_image_url: imageUrl,
                last_modified_by: user?.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', initialData.id);

          if (updateError) throw updateError;
          toast.success('Dispatch updated successfully!');
      } else {
          // INSERT
          const { error: insertError } = await supabase.from('dispatches').insert({
            ...data,
            source_image_url: imageUrl,
            created_by: user?.id,
            last_modified_by: user?.id,
          } as any);

          if (insertError) throw insertError;
          toast.success('Dispatch added successfully!');
          reset({
            date: formatDateForInput(),
            delivery_status: 'Dispatched',
            order_id: '',
            customer_name: '',
            phone_number: '',
            amount: 0,
            payment_mode: 'COD',
            tracking_id: '',
          });
          setImageFile(null);
          setOrderIdStatus('idle');
          setTrackingIdStatus('idle');
      }

      toast.dismiss(loadingToast);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error submitting form:', err);
      toast.dismiss(loadingToast);
      
      if (err.code === '23505') {
        const errorMsg = 'Order ID already exists. Please use a unique Order ID.';
        setError(errorMsg);
        toast.error(errorMsg);
      } else {
        setError(err.message || 'An unexpected error occurred.');
        toast.error('Failed to save dispatch: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Date"
          type="date"
          {...register('date')}
          error={errors.date?.message}
          required
        />

        <div className="relative">
          <Input
            label="Order ID"
            {...register('order_id')}
            error={errors.order_id?.message}
            placeholder="e.g., ORD12345"
            required
          />
          {orderIdStatus === 'checking' && (
            <div className="absolute right-3 top-9 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          {orderIdStatus === 'valid' && (
            <div className="absolute right-3 top-9 text-green-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {orderIdStatus === 'duplicate' && (
            <p className="mt-1 text-sm text-red-600">⚠️ Order ID already exists</p>
          )}
        </div>

        <Input
          label="Customer Name"
          {...register('customer_name')}
          error={errors.customer_name?.message}
          placeholder="Enter customer name"
          required
        />

        <div>
          <Input
            label="Phone Number"
            type="tel"
            {...register('phone_number')}
            onChange={handlePhoneChange}
            error={errors.phone_number?.message}
            placeholder="(987) 654-3210"
            required
          />
          {watchedPhoneNumber && !errors.phone_number && (
            <p className="mt-1 text-sm text-gray-600">✓ Valid format</p>
          )}
        </div>

        <div>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
            placeholder="0.00"
            required
          />
          {watchedAmount > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              {formatCurrency(watchedAmount)}
            </p>
          )}
        </div>

        <Select
          label="Payment Mode"
          {...register('payment_mode')}
          error={errors.payment_mode?.message}
          options={[
            { value: 'COD', label: 'Cash on Delivery (COD)' },
            { value: 'Prepaid', label: 'Prepaid' },
          ]}
          required
        />

        <div className="relative">
          <Input
            label="Tracking ID"
            {...register('tracking_id')}
            onChange={handleTrackingIdChange}
            error={errors.tracking_id?.message}
            placeholder="EZ12345 or JO12345"
            required
          />
          {trackingIdStatus === 'checking' && (
            <div className="absolute right-3 top-9 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          {trackingIdStatus === 'valid' && (
            <div className="absolute right-3 top-9 text-green-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {trackingIdStatus === 'duplicate' && (
            <p className="mt-1 text-sm text-yellow-600">⚠️ Tracking ID already exists (allowed)</p>
          )}
        </div>

        <Select
          label="Delivery Status"
          {...register('delivery_status')}
          error={errors.delivery_status?.message}
          options={[
            { value: 'Dispatched', label: 'Dispatched' },
            { value: 'Delivered', label: 'Delivered' },
            { value: 'Returned', label: 'Returned' },
            { value: 'Lost', label: 'Lost' },
          ]}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Source Image {isEditMode ? '(leave blank to keep current)' : '(optional)'}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            cursor-pointer"
        />
        {imageFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {imageFile.name}
          </p>
        )}
        {isEditMode && initialData?.source_image_url && !imageFile && (
          <p className="mt-2 text-sm text-blue-600">
            Current image: <a href={initialData.source_image_url} target="_blank" rel="noopener noreferrer" className="underline">View</a>
          </p>
        )}
      </div>

      <div className="flex gap-4 pt-4 justify-between">
        {isEditMode && initialData && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (confirm('Are you sure you want to delete this dispatch? This action cannot be undone.')) {
                setIsSubmitting(true);
                try {
                  const { softDeleteDispatch } = await import('@/lib/actions/dispatch');
                  const result = await softDeleteDispatch(initialData.id);
                  if (result.error) {
                    toast.error(result.error);
                  } else {
                    toast.success('Dispatch deleted successfully');
                    onSuccess?.();
                  }
                } catch (err) {
                  console.error('Error deleting dispatch:', err);
                  toast.error('Failed to delete dispatch');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }}
            disabled={isSubmitting}
          >
            Delete
          </Button>
        )}
        <div className="flex gap-4 flex-1 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Dispatch' : 'Add Dispatch')}
          </Button>
        </div>
      </div>
    </form>
  );
}
