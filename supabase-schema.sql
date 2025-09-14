-- A-1 Fence Services Database Schema
-- Run these commands in your Supabase SQL Editor

-- Create enum types
CREATE TYPE user_role AS ENUM ('customer', 'cpr', 'service', 'admin', 'channel_partner');
CREATE TYPE product_type AS ENUM ('Energizer Product', 'Power Adapter', 'Gate Motor Controller');
CREATE TYPE request_status AS ENUM ('Received', 'Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Dispatched', 'Completed', 'Cancelled');

-- Create users table (for app users, not auth users)
-- This table will store both Supabase Auth users (customers) and hardcoded users (admin/service/partner)
CREATE TABLE app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    full_name TEXT,
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth for customers
    is_supabase_user BOOLEAN DEFAULT FALSE, -- Flag to distinguish between Supabase Auth users and hardcoded users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_requests table
CREATE TABLE service_requests (
    id TEXT PRIMARY KEY,
    serial_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    product_type product_type NOT NULL,
    product_details TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    fault_description TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    status request_status DEFAULT 'Received',
    is_warranty_claim BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to TEXT,
    notes TEXT[] DEFAULT '{}',
    geolocation TEXT,
    audit_log JSONB DEFAULT '[]'::jsonb
);

-- Create quotes table
CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cost DECIMAL(10,2) NOT NULL,
    is_approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_qr_code_url TEXT
);

-- Create complaints table
CREATE TABLE complaints (
    id TEXT PRIMARY KEY,
    request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    complaint_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Create feedback table
CREATE TABLE feedback (
    id TEXT PRIMARY KEY,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX idx_quotes_service_request_id ON quotes(service_request_id);
CREATE INDEX idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX idx_feedback_service_request_id ON feedback(service_request_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO app_users (email, role, full_name, supabase_user_id, is_supabase_user)
    VALUES (
        NEW.email,
        'customer', -- Default role for Supabase Auth users
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.id,
        TRUE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create app_users entry when Supabase Auth user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert initial test data (hardcoded users for admin, service, and partner)
INSERT INTO app_users (id, email, role, full_name, is_supabase_user) VALUES 
    ('user-2', 'admin@test.com', 'admin', 'Admin User', FALSE),
    ('user-3', 'service@test.com', 'service', 'Service Tech', FALSE),
    ('user-4', 'partner@test.com', 'channel_partner', 'Partner Inc.', FALSE);

INSERT INTO service_requests (
    id, serial_number, customer_name, customer_id, product_type, 
    product_details, purchase_date, fault_description, status, 
    is_warranty_claim, audit_log
) VALUES (
    'req-abc-123', 'SN-ABC12345', 'John Doe', 'customer-demo', 'Energizer Product',
    'Energizer Power Bank 10000mAh', '2023-05-15', 
    'The power bank is not charging. The indicator lights do not turn on when plugged in.',
    'Completed', TRUE,
    '[{"timestamp": "2024-01-15T10:00:00Z", "user": "admin@test.com", "action": "Request created"}]'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on app_users" ON app_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on service_requests" ON service_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on quotes" ON quotes FOR ALL USING (true);
CREATE POLICY "Allow all operations on complaints" ON complaints FOR ALL USING (true);
CREATE POLICY "Allow all operations on feedback" ON feedback FOR ALL USING (true);
