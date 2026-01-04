-- Function to handle new user signup and role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, language_preference)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'en'
  );

  -- Insert role (default to citizen if not specified)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'citizen')::app_role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically generate tracking ID
CREATE OR REPLACE FUNCTION public.set_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := public.generate_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking ID generation
DROP TRIGGER IF EXISTS set_grievance_tracking_id ON public.grievances;
CREATE TRIGGER set_grievance_tracking_id
  BEFORE INSERT ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.set_tracking_id();

-- Function to automatically set SLA deadline
CREATE OR REPLACE FUNCTION public.set_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set SLA deadline based on priority (in hours)
  NEW.sla_deadline := NEW.created_at + INTERVAL '1 hour' * 
    CASE NEW.priority
      WHEN 'critical' THEN 4   -- 4 hours for critical
      WHEN 'high' THEN 24      -- 24 hours for high
      WHEN 'medium' THEN 72    -- 72 hours for medium
      WHEN 'low' THEN 168      -- 168 hours (1 week) for low
      ELSE 72                  -- default to 72 hours
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SLA deadline
DROP TRIGGER IF EXISTS set_grievance_sla ON public.grievances;
CREATE TRIGGER set_grievance_sla
  BEFORE INSERT ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.set_sla_deadline();

-- Insert some default departments
INSERT INTO public.departments (name_en, name_hi, description, sla_hours, icon) VALUES
  ('Public Works Department', 'लोक निर्माण विभाग', 'Roads, bridges, and infrastructure', 72, 'construction'),
  ('Sanitation Department', 'स्वच्छता विभाग', 'Waste management and cleanliness', 48, 'trash'),
  ('Utilities Department', 'उपयोगिता विभाग', 'Water, electricity, and gas services', 24, 'zap'),
  ('Police Department', 'पुलिस विभाग', 'Law and order, safety', 4, 'shield'),
  ('Health Department', 'स्वास्थ्य विभाग', 'Healthcare and medical services', 12, 'heart'),
  ('Education Department', 'शिक्षा विभाग', 'Schools and educational institutions', 168, 'book'),
  ('General Administration', 'सामान्य प्रशासन', 'Administrative and other services', 72, 'building')
ON CONFLICT DO NOTHING;