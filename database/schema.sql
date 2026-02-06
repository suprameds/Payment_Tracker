-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core dispatches table
CREATE TABLE IF NOT EXISTS dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dispatch Information
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_mode TEXT CHECK (payment_mode IN ('COD', 'Prepaid')) NOT NULL,
  tracking_id TEXT NOT NULL,
  
  -- Status Tracking
  delivery_status TEXT CHECK (delivery_status IN ('Dispatched', 'Delivered', 'Returned', 'Lost')) DEFAULT 'Dispatched',
  payment_received BOOLEAN DEFAULT FALSE,
  payment_received_at TIMESTAMP WITH TIME ZONE,
  payment_received_by TEXT,
  
  -- Source Documentation
  source_image_url TEXT,
  
  -- OCR Processing
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_processed_at TIMESTAMP WITH TIME ZONE,
  ocr_confidence DECIMAL(5, 2),
  ocr_raw_data JSONB,
  
  -- Audit Trail
  created_by UUID REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dispatches_date ON dispatches(date DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_tracking_id ON dispatches(tracking_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_order_id ON dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_delivery_status ON dispatches(delivery_status);
CREATE INDEX IF NOT EXISTS idx_dispatches_payment_received ON dispatches(payment_received);
CREATE INDEX IF NOT EXISTS idx_dispatches_payment_mode ON dispatches(payment_mode);

-- Audit log for payment reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id UUID REFERENCES dispatches(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN ('manual', 'ocr_auto', 'ocr_manual')),
  previous_status BOOLEAN,
  new_status BOOLEAN,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_log_dispatch ON payment_reconciliation_log(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_log_changed_at ON payment_reconciliation_log(changed_at DESC);

-- OCR processing queue
CREATE TABLE IF NOT EXISTS ocr_processing_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  image_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  extracted_data JSONB,
  matched_dispatches JSONB
);

CREATE INDEX IF NOT EXISTS idx_ocr_queue_status ON ocr_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_created ON ocr_processing_queue(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_dispatches_updated_at
  BEFORE UPDATE ON dispatches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log payment reconciliation changes
CREATE OR REPLACE FUNCTION log_payment_reconciliation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_received IS DISTINCT FROM NEW.payment_received THEN
    INSERT INTO payment_reconciliation_log (
      dispatch_id,
      changed_by,
      change_type,
      previous_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      NEW.last_modified_by,
      CASE 
        WHEN NEW.ocr_processed THEN 'ocr_auto'
        ELSE 'manual'
      END,
      OLD.payment_received,
      NEW.payment_received,
      CASE 
        WHEN NEW.payment_received THEN 'Payment marked as received'
        ELSE 'Payment marked as not received'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log payment changes
CREATE TRIGGER log_payment_changes
  AFTER UPDATE ON dispatches
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_reconciliation();

-- Row Level Security (RLS) Policies
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_processing_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read dispatches
CREATE POLICY "Allow authenticated users to read dispatches"
  ON dispatches FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert dispatches
CREATE POLICY "Allow authenticated users to insert dispatches"
  ON dispatches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update dispatches
CREATE POLICY "Allow authenticated users to update dispatches"
  ON dispatches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read reconciliation log
CREATE POLICY "Allow authenticated users to read reconciliation log"
  ON payment_reconciliation_log FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to read OCR queue
CREATE POLICY "Allow authenticated users to read OCR queue"
  ON ocr_processing_queue FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert OCR queue
CREATE POLICY "Allow authenticated users to insert OCR queue"
  ON ocr_processing_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update OCR queue
CREATE POLICY "Allow authenticated users to update OCR queue"
  ON ocr_processing_queue FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for dispatch images
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispatch-images', 'dispatch-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dispatch images
CREATE POLICY "Allow authenticated users to upload dispatch images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dispatch-images');

CREATE POLICY "Allow authenticated users to read dispatch images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'dispatch-images');

-- Helper view: Pending reconciliations
CREATE OR REPLACE VIEW pending_reconciliations AS
SELECT 
  d.*,
  EXTRACT(DAY FROM NOW() - d.date) AS days_pending
FROM dispatches d
WHERE d.delivery_status = 'Delivered'
  AND d.payment_received = FALSE
ORDER BY d.date DESC;

-- Helper view: Today's manifest
CREATE OR REPLACE VIEW todays_manifest AS
SELECT 
  d.*,
  COUNT(*) OVER (PARTITION BY d.payment_mode) AS mode_count,
  SUM(d.amount) OVER (PARTITION BY d.payment_mode) AS mode_total
FROM dispatches d
WHERE d.date = CURRENT_DATE
ORDER BY d.payment_mode, d.created_at;

-- Helper view: Monthly summary
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  DATE_TRUNC('month', d.date) AS month,
  d.payment_mode,
  d.delivery_status,
  COUNT(*) AS total_count,
  SUM(d.amount) AS total_amount,
  COUNT(CASE WHEN d.payment_received THEN 1 END) AS paid_count,
  SUM(CASE WHEN d.payment_received THEN d.amount ELSE 0 END) AS paid_amount
FROM dispatches d
GROUP BY DATE_TRUNC('month', d.date), d.payment_mode, d.delivery_status
ORDER BY month DESC, payment_mode, delivery_status;
