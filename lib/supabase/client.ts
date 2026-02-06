import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (for admin operations)
// Only create on server-side where SUPABASE_SERVICE_ROLE_KEY is available
export const supabaseAdmin = typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null;

// Types for our database schema
export interface Dispatch {
  id: string;
  created_at: string;
  updated_at: string;
  date: string;
  order_id: string;
  customer_name: string;
  phone_number: string;
  amount: number;
  payment_mode: 'COD' | 'Prepaid';
  tracking_id: string;
  delivery_status: 'Dispatched' | 'Delivered' | 'Returned' | 'Lost';
  payment_received: boolean;
  payment_received_at?: string;
  payment_received_by?: string;
  source_image_url?: string;
  ocr_processed: boolean;
  ocr_processed_at?: string;
  ocr_confidence?: number;
  ocr_raw_data?: unknown;
  created_by?: string;
  last_modified_by?: string;
}

export interface PaymentReconciliationLog {
  id: string;
  dispatch_id: string;
  changed_at: string;
  changed_by?: string;
  change_type: 'manual' | 'ocr_auto' | 'ocr_manual';
  previous_status: boolean;
  new_status: boolean;
  notes?: string;
}

export interface OCRProcessingQueue {
  id: string;
  created_at: string;
  processed_at?: string;
  image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  extracted_data?: unknown;
  matched_dispatches?: unknown;
}
