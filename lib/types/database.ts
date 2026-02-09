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
  deleted_at?: string | null;
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

export type UserRole = 'admin' | 'manager' | 'dispatcher';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
}

export type Database = {
  public: {
    Tables: {
      dispatches: {
        Row: Dispatch;
        Insert: Partial<Dispatch>;
        Update: Partial<Dispatch>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<AuditLog>;
        Update: Partial<AuditLog>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

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
