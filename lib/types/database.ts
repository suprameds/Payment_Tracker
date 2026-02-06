// Re-export types from Supabase client for convenience
export type {
  Dispatch,
  PaymentReconciliationLog,
  OCRProcessingQueue,
} from '../supabase/client';

// Form input types
export interface DispatchFormInput {
  date: string;
  order_id: string;
  customer_name: string;
  phone_number: string;
  amount: number;
  payment_mode: 'COD' | 'Prepaid';
  tracking_id: string;
  delivery_status?: 'Dispatched' | 'Delivered' | 'Returned' | 'Lost';
  source_image?: File;
}

// Filter types
export interface DispatchFilters {
  date_from?: string;
  date_to?: string;
  payment_mode?: 'COD' | 'Prepaid';
  delivery_status?: 'Dispatched' | 'Delivered' | 'Returned' | 'Lost';
  payment_received?: boolean;
  search?: string;
}

// OCR extraction result
export interface OCRExtraction {
  tracking_id: string;
  amount: number;
  confidence: number;
  raw_text: string;
}

// OCR match result
export interface OCRMatch {
  extraction: OCRExtraction;
  dispatch: Dispatch | null;
  match_confidence: 'high' | 'medium' | 'low' | 'none';
  amount_matches: boolean;
  status: 'auto_applied' | 'needs_review' | 'no_match';
}

// Dashboard stats
export interface DashboardStats {
  today_count: number;
  today_amount: number;
  pending_reconciliation_count: number;
  pending_reconciliation_amount: number;
  month_count: number;
  month_amount: number;
  ocr_pending_count: number;
}
