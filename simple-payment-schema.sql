-- Simple Payment Schema
-- Minimal payment functionality with essential fields only

-- Create simple payment table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id TEXT NOT NULL,
    quote_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    customer_email TEXT,
    customer_name TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    receipt TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add simple payment fields to existing tables
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_id UUID;

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS payment_id UUID;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Simple function to create payment record
CREATE OR REPLACE FUNCTION create_simple_payment(
    p_service_request_id TEXT,
    p_quote_id TEXT,
    p_amount DECIMAL,
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_razorpay_order_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    payment_uuid UUID;
    receipt_number TEXT;
BEGIN
    -- Generate receipt number
    receipt_number := 'RCP-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 10000)::TEXT, 4, '0');
    
    INSERT INTO payments (
        service_request_id,
        quote_id,
        amount,
        customer_email,
        customer_name,
        razorpay_order_id,
        receipt
    ) VALUES (
        p_service_request_id,
        p_quote_id,
        p_amount,
        p_customer_email,
        p_customer_name,
        p_razorpay_order_id,
        receipt_number
    ) RETURNING id INTO payment_uuid;
    
    RETURN payment_uuid;
END;
$$ LANGUAGE plpgsql;

-- Simple function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
    p_payment_id UUID,
    p_status TEXT,
    p_razorpay_payment_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payments 
    SET 
        status = p_status::payment_status,
        razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Update service request payment status
    UPDATE service_requests 
    SET 
        payment_completed = (p_status = 'captured'),
        payment_id = p_payment_id
    WHERE id = (SELECT service_request_id FROM payments WHERE id = p_payment_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert payments" ON payments;
CREATE POLICY "Users can insert payments" ON payments
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update payments" ON payments;
CREATE POLICY "Users can update payments" ON payments
    FOR UPDATE USING (true);
