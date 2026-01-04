-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('citizen', 'officer', 'admin');

-- Create enum for grievance priority
CREATE TYPE public.grievance_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for grievance status
CREATE TYPE public.grievance_status AS ENUM ('received', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated');

-- Create enum for grievance category
CREATE TYPE public.grievance_category AS ENUM (
  'civic_infrastructure',
  'sanitation',
  'utilities',
  'public_safety',
  'healthcare',
  'education',
  'administration'
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  language_preference TEXT DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  description TEXT,
  sla_hours INTEGER DEFAULT 72,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create officers table (linking users to departments)
CREATE TABLE public.officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  designation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Create grievances table
CREATE TABLE public.grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category grievance_category NOT NULL,
  priority grievance_priority DEFAULT 'medium',
  status grievance_status DEFAULT 'received',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  media_urls TEXT[],
  ai_analysis JSONB,
  input_mode TEXT DEFAULT 'text',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  sla_deadline TIMESTAMP WITH TIME ZONE
);

-- Create grievance_timeline table for status history
CREATE TABLE public.grievance_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID REFERENCES public.grievances(id) ON DELETE CASCADE NOT NULL,
  status grievance_status NOT NULL,
  notes TEXT,
  notes_hi TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_timeline ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'officer' THEN 2 
      WHEN 'citizen' THEN 3 
    END
  LIMIT 1
$$;

-- Create function to generate tracking ID
CREATE OR REPLACE FUNCTION public.generate_tracking_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  prefix TEXT := 'GRV';
  date_part TEXT;
  random_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  new_id := prefix || '-' || date_part || '-' || random_part;
  RETURN new_id;
END;
$$;

-- Create trigger for auto-generating tracking ID
CREATE OR REPLACE FUNCTION public.set_tracking_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := public.generate_tracking_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_tracking_id
BEFORE INSERT ON public.grievances
FOR EACH ROW
EXECUTE FUNCTION public.set_tracking_id();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_update_grievances_updated_at
BEFORE UPDATE ON public.grievances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create trigger to add timeline entry on grievance status change
CREATE OR REPLACE FUNCTION public.log_grievance_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.grievance_timeline (grievance_id, status, updated_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_grievance_status
AFTER UPDATE ON public.grievances
FOR EACH ROW
EXECUTE FUNCTION public.log_grievance_status_change();

-- Create trigger to add initial timeline entry on grievance creation
CREATE OR REPLACE FUNCTION public.log_grievance_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.grievance_timeline (grievance_id, status, notes, updated_by)
  VALUES (NEW.id, NEW.status, 'Grievance submitted', NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_grievance_creation
AFTER INSERT ON public.grievances
FOR EACH ROW
EXECUTE FUNCTION public.log_grievance_creation();

-- Create trigger to auto-create profile and citizen role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Assign citizen role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for departments (public read)
CREATE POLICY "Anyone can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for officers
CREATE POLICY "Officers can view their own record"
ON public.officers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage officers"
ON public.officers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view officers for assignment"
ON public.officers FOR SELECT
TO authenticated
USING (true);

-- RLS Policies for grievances
CREATE POLICY "Citizens can view their own grievances"
ON public.grievances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Citizens can create grievances"
ON public.grievances FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Officers can view assigned grievances"
ON public.grievances FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.officers o 
    WHERE o.user_id = auth.uid() 
    AND (o.id = assigned_officer_id OR o.department_id = department_id)
  )
);

CREATE POLICY "Officers can update assigned grievances"
ON public.grievances FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.officers o 
    WHERE o.user_id = auth.uid() 
    AND (o.id = assigned_officer_id OR o.department_id = department_id)
  )
);

CREATE POLICY "Admins can manage all grievances"
ON public.grievances FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for grievance_timeline
CREATE POLICY "Users can view timeline of their grievances"
ON public.grievance_timeline FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.grievances g 
    WHERE g.id = grievance_id AND g.user_id = auth.uid()
  )
);

CREATE POLICY "Officers can view and add timeline entries"
ON public.grievance_timeline FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.grievances g 
    JOIN public.officers o ON o.user_id = auth.uid()
    WHERE g.id = grievance_id 
    AND (o.id = g.assigned_officer_id OR o.department_id = g.department_id)
  )
);

CREATE POLICY "Admins can manage all timeline entries"
ON public.grievance_timeline FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default departments
INSERT INTO public.departments (name_en, name_hi, description, sla_hours, icon) VALUES
('Civic Infrastructure', 'नागरिक अवसंरचना', 'Roads, bridges, public buildings, street lights', 72, 'building'),
('Sanitation', 'स्वच्छता', 'Garbage collection, sewage, drainage, cleanliness', 48, 'trash'),
('Utilities', 'उपयोगिताएं', 'Water supply, electricity, gas connections', 24, 'zap'),
('Public Safety', 'सार्वजनिक सुरक्षा', 'Law enforcement, fire safety, emergency services', 12, 'shield'),
('Healthcare', 'स्वास्थ्य सेवा', 'Public hospitals, health centers, medical services', 48, 'heart-pulse'),
('Education', 'शिक्षा', 'Schools, colleges, educational institutions', 72, 'graduation-cap'),
('Administration', 'प्रशासन', 'Government offices, documentation, certificates', 96, 'file-text');