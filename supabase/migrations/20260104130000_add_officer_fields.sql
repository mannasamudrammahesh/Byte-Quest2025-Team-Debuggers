-- Add officer-specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Create index for employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON profiles(employee_id);

-- Create index for department for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

-- Add constraint to ensure employee_id is unique when not null
ALTER TABLE profiles 
ADD CONSTRAINT unique_employee_id UNIQUE (employee_id);

-- Update RLS policies to handle officer verification
CREATE POLICY "Officers can view their own profile details" ON profiles
FOR SELECT USING (
  auth.uid() = id OR 
  (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'officer')
    )
  )
);

-- Create a function to handle officer verification
CREATE OR REPLACE FUNCTION verify_officer(officer_id UUID, verified BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can verify officers
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can verify officers';
  END IF;

  -- Update the officer's verification status
  UPDATE profiles 
  SET 
    is_verified = verified,
    verification_status = CASE 
      WHEN verified THEN 'verified' 
      ELSE 'rejected' 
    END
  WHERE id = officer_id;

  -- If verified, ensure they have officer role
  IF verified THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (officer_id, 'officer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN verified;
END;
$$;

-- Create a view for pending officer verifications (admin use)
CREATE OR REPLACE VIEW pending_officer_verifications AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.employee_id,
  p.department,
  p.designation,
  p.phone_number,
  p.created_at,
  p.verification_status
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'officer' 
  AND p.verification_status = 'pending'
ORDER BY p.created_at DESC;

-- Grant access to the verification view for admins
GRANT SELECT ON pending_officer_verifications TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Only admins can view pending verifications" ON pending_officer_verifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add comment for documentation
COMMENT ON COLUMN profiles.employee_id IS 'Government employee ID for officers';
COMMENT ON COLUMN profiles.department IS 'Government department for officers';
COMMENT ON COLUMN profiles.designation IS 'Job designation for officers';
COMMENT ON COLUMN profiles.phone_number IS 'Official phone number for officers';
COMMENT ON COLUMN profiles.is_verified IS 'Whether the officer account is verified by admin';
COMMENT ON COLUMN profiles.verification_status IS 'Status of officer verification: pending, verified, rejected';