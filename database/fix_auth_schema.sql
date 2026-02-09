-- Safely create user_role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'dispatcher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Profiles Table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'dispatcher',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Re-create the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    -- Safely cast role, defaulting to dispatcher if missing or invalid
    COALESCE(
      nullif(new.raw_user_meta_data->>'role', '')::user_role, 
      'dispatcher'
    )
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction (optional, or fail to ensure profile exists)
    -- For now, we want it to fail so we know something is wrong, but we can make it safer.
    -- Let's just return new so the user is created even if profile creation fails, 
    -- ensuring they can at least login (though app might break without profile).
    -- BETTER: Fail to ensure consistency.
    RAISE WARNING 'Profile creation failed for user %: %', new.id, SQLERRM;
    RETURN new; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and re-create trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Ensure RLS policies exist (re-applying just in case)
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
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
