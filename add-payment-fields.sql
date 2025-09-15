-- Add payment-related fields to existing tables
-- Run this in your Supabase SQL Editor

-- Add payment_completed field to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;

-- Add payment_required field to service_requests table  
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT FALSE;

-- Add currency field to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    receipt TEXT,
    payment_method TEXT,
    razorpay_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for payments table
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);

-- Create trigger for payments updated_at
CREATE TRIGGER IF NOT EXISTS update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payments table
CREATE POLICY IF NOT EXISTS "Allow all operations on payments" ON payments FOR ALL USING (true);

