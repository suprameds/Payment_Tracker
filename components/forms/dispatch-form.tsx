'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dispatchFormSchema, type DispatchFormData } from '@/lib/validations/dispatch';
import { formatDateForInput } from '@/lib/utils/format';
import { supabase } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DispatchFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DispatchForm({ onSuccess, onCancel }: DispatchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchFormSchema),
    defaultValues: {
      date: formatDateForInput(),
      delivery_status: 'Dispatched',
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
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
    setIsSubmitting(true);
    setError(null);

    try {
      // Upload image if provided
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = (await uploadImage(imageFile)) || undefined;
      }

      // Get current user (if authenticated)
      const { data: { user } } = await supabase.auth.getUser();

      // Insert dispatch
      const { error: insertError } = await supabase.from('dispatches').insert({
        ...data,
        source_image_url: imageUrl,
        created_by: user?.id,
        last_modified_by: user?.id,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation
          setError('Order ID already exists. Please use a unique Order ID.');
        } else {
          setError(insertError.message);
        }
        setIsSubmitting(false);
        return;
      }

      // Success
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
      onSuccess?.();
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('An unexpected error occurred. Please try again.');
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

        <Input
          label="Order ID"
          {...register('order_id')}
          error={errors.order_id?.message}
          placeholder="e.g., ORD12345"
          required
        />

        <Input
          label="Customer Name"
          {...register('customer_name')}
          error={errors.customer_name?.message}
          placeholder="Enter customer name"
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          {...register('phone_number')}
          error={errors.phone_number?.message}
          placeholder="9876543210"
          required
        />

        <Input
          label="Amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="0.00"
          required
        />

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

        <Input
          label="Tracking ID"
          {...register('tracking_id')}
          error={errors.tracking_id?.message}
          placeholder="EZ12345 or JO12345"
          required
        />

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
          Source Image (optional)
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
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Adding Dispatch...' : 'Add Dispatch'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
