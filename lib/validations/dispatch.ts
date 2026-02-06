import { z } from 'zod';

// Tracking ID must start with EZ or JO
const trackingIdRegex = /^(EZ|JO)[A-Z0-9]+$/i;

// Phone number validation (Indian format)
const phoneRegex = /^[6-9]\d{9}$/;

export const dispatchFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  order_id: z.string().min(1, 'Order ID is required').trim(),
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters').trim(),
  phone_number: z.string().regex(phoneRegex, 'Invalid phone number. Must be 10 digits starting with 6-9'),
  amount: z.number().positive('Amount must be greater than 0'),
  payment_mode: z.enum(['COD', 'Prepaid']),
  tracking_id: z.string().regex(trackingIdRegex, 'Tracking ID must start with EZ or JO'),
  delivery_status: z.enum(['Dispatched', 'Delivered', 'Returned', 'Lost']),
  source_image_url: z.string().optional(),
});

export type DispatchFormData = z.infer<typeof dispatchFormSchema>;

// Validation for OCR extracted data
export const ocrExtractionSchema = z.object({
  tracking_id: z.string().regex(trackingIdRegex, 'Invalid tracking ID format'),
  amount: z.number().positive('Amount must be positive'),
  confidence: z.number().min(0).max(100),
  raw_text: z.string(),
});

export type OCRExtractionData = z.infer<typeof ocrExtractionSchema>;

// Filter schema
export const dispatchFilterSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  payment_mode: z.enum(['COD', 'Prepaid']).optional(),
  delivery_status: z.enum(['Dispatched', 'Delivered', 'Returned', 'Lost']).default('Dispatched'),
  payment_received: z.boolean().optional(),
  search: z.string().optional(),
});

export type DispatchFilterData = z.infer<typeof dispatchFilterSchema>;
