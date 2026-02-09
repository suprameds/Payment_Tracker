-- Enable RLS on all tables
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Dispatches Policies
DROP POLICY IF EXISTS "Dispatches are viewable by everyone" ON public.dispatches;
-- Admins and Managers can view all
CREATE POLICY "Admins and Managers can view all dispatches"
ON public.dispatches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Dispatchers can view only their own created dispatches OR generic read if needed?
-- Requirement: "Dispatcher: Can create/edit dispatches, view their own history"
CREATE POLICY "Dispatchers can view own dispatches"
ON public.dispatches FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
);

-- Insert Policies
CREATE POLICY "Dispatchers, Managers, Admins can insert dispatches"
ON public.dispatches FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- Update Policies
-- Payment status can only be updated by Managers/Admins (handled in UI via component check, but enforcement here is better)
-- However, payment-toggle updates specific fields.
-- We'll allow updates based on role for now.
CREATE POLICY "Admins and Managers can update any dispatch"
ON public.dispatches FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Dispatchers can update own dispatches"
ON public.dispatches FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
);

-- Delete Policies
CREATE POLICY "Only Admins can delete dispatches"
ON public.dispatches FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
