-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations & Users
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    role TEXT CHECK (role IN ('admin', 'staff', 'subcontractor')) DEFAULT 'staff',
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CRM (Clients)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Jobs & Quoting
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    client_id UUID REFERENCES clients(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('draft', 'sent', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE quote_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Financials
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    merchant TEXT NOT NULL,
    date DATE NOT NULL,
    total NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('processing', 'approved', 'attention')) DEFAULT 'processing',
    image_url TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organizations: Users can view their own org
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT USING (id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- User Profiles: Users can view profiles in their org
CREATE POLICY "Users can view members of own org" ON user_profiles
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- User Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Clients
CREATE POLICY "Users can view clients in own org" ON clients
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Jobs
CREATE POLICY "Users can view jobs in own org" ON jobs
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Quote Line Items
CREATE POLICY "Users can view quote items for org jobs" ON quote_line_items
    FOR ALL USING (job_id IN (
        SELECT id FROM jobs WHERE organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    ));

-- Job Photos
CREATE POLICY "Users can view photos for org jobs" ON job_photos
    FOR ALL USING (job_id IN (
        SELECT id FROM jobs WHERE organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    ));

-- Receipts
CREATE POLICY "Users can view receipts in own org" ON receipts
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Functions & Triggers
-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
