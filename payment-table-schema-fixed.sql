-- ===================================================================
-- COMPREHENSIVE PAYMENT TABLE SCHEMA FOR SUPABASE (FIXED VERSION)
-- A-1 Fence Services Payment Management System
-- ===================================================================

-- Create payment status enum (drop first if exists)
DROP TYPE IF EXISTS payment_status CASCADE;
CREATE TYPE payment_status AS ENUM (
    'pending',      -- Payment initiated but not completed
    'processing',   -- Payment is being processed
    'captured',     -- Payment successfully captured
    'failed',       -- Payment failed
    'cancelled',    -- Payment was cancelled by user
    'refunded',     -- Payment was refunded
    'partially_refunded' -- Partial refund processed
);

-- Create payment method enum (drop first if exists)
DROP TYPE IF EXISTS payment_method CASCADE;
CREATE TYPE payment_method AS ENUM (
    'card',         -- Credit/Debit card
    'upi',          -- UPI payment
    'netbanking',   -- Net banking
    'wallet',       -- Digital wallet
    'emi',          -- EMI payment
    'cod',          -- Cash on delivery (if applicable)
    'bank_transfer' -- Direct bank transfer
);

-- Create payment table (drop first if exists)
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    -- Primary identification
    id TEXT PRIMARY KEY,
    
    -- Service request and quote references
    service_request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Razorpay integration fields
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    
    -- Payment details
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method,
    
    -- Customer information
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Receipt and transaction details
    receipt_number TEXT UNIQUE,
    transaction_id TEXT,
    gateway_transaction_id TEXT,
    
    -- Razorpay response data (stored as JSON)
    razorpay_response JSONB,
    
    -- Refund information
    refund_amount DECIMAL(12,2) DEFAULT 0,
    refund_reason TEXT,
    refund_processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create payment history table for audit trail
CREATE TABLE payment_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'status_changed', 'refunded', etc.
    previous_status payment_status,
    new_status payment_status,
    changed_by TEXT, -- User who made the change
    change_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment fields to existing tables (with error handling)
DO $$ 
BEGIN
    -- Add columns to service_requests if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'payment_required') THEN
        ALTER TABLE service_requests ADD COLUMN payment_required BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'payment_completed') THEN
        ALTER TABLE service_requests ADD COLUMN payment_completed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'payment_id') THEN
        ALTER TABLE service_requests ADD COLUMN payment_id TEXT REFERENCES payments(id);
    END IF;
    
    -- Add columns to quotes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'currency') THEN
        ALTER TABLE quotes ADD COLUMN currency TEXT DEFAULT 'INR';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'payment_id') THEN
        ALTER TABLE quotes ADD COLUMN payment_id TEXT REFERENCES payments(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_payment_completed_at ON payments(payment_completed_at);

CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    receipt_num TEXT;
    counter INTEGER;
BEGIN
    -- Get current counter value
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 4) AS INTEGER)), 0) + 1
    INTO counter
    FROM payments
    WHERE receipt_number LIKE 'RCP%';
    
    -- Format receipt number: RCP + 6-digit counter
    receipt_num := 'RCP' || LPAD(counter::TEXT, 6, '0');
    
    RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to create payment record
CREATE OR REPLACE FUNCTION create_payment_record(
    p_service_request_id TEXT,
    p_quote_id TEXT,
    p_customer_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_amount DECIMAL,
    p_currency TEXT DEFAULT 'INR',
    p_razorpay_order_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    payment_id TEXT;
    receipt_num TEXT;
BEGIN
    -- Generate payment ID
    payment_id := 'pay_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
    
    -- Generate receipt number
    receipt_num := generate_receipt_number();
    
    -- Insert payment record
    INSERT INTO payments (
        id,
        service_request_id,
        quote_id,
        customer_id,
        customer_name,
        customer_email,
        amount,
        currency,
        razorpay_order_id,
        receipt_number,
        notes,
        status
    ) VALUES (
        payment_id,
        p_service_request_id,
        p_quote_id,
        p_customer_id,
        p_customer_name,
        p_customer_email,
        p_amount,
        p_currency,
        p_razorpay_order_id,
        receipt_num,
        p_notes,
        'pending'
    );
    
    -- Insert payment history record
    INSERT INTO payment_history (
        payment_id,
        action,
        new_status,
        change_reason
    ) VALUES (
        payment_id,
        'created',
        'pending',
        'Payment record created'
    );
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
    p_payment_id TEXT,
    p_status payment_status,
    p_razorpay_payment_id TEXT DEFAULT NULL,
    p_payment_method payment_method DEFAULT NULL,
    p_razorpay_response JSONB DEFAULT NULL,
    p_changed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status payment_status;
    service_req_id TEXT;
BEGIN
    -- Get current status and service request ID
    SELECT status, service_request_id INTO old_status, service_req_id
    FROM payments
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update payment record
    UPDATE payments SET
        status = p_status,
        razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
        payment_method = COALESCE(p_payment_method, payment_method),
        razorpay_response = COALESCE(p_razorpay_response, razorpay_response),
        payment_completed_at = CASE 
            WHEN p_status = 'captured' THEN NOW()
            ELSE payment_completed_at
        END,
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Insert payment history record
    INSERT INTO payment_history (
        payment_id,
        action,
        previous_status,
        new_status,
        changed_by,
        change_reason
    ) VALUES (
        p_payment_id,
        'status_changed',
        old_status,
        p_status,
        p_changed_by,
        'Payment status updated'
    );
    
    -- Update service request if payment is captured
    IF p_status = 'captured' THEN
        UPDATE service_requests SET
            payment_completed = TRUE,
            payment_id = p_payment_id,
            updated_at = NOW()
        WHERE id = service_req_id;
        
        -- Update quote with payment ID
        UPDATE quotes SET
            payment_id = p_payment_id,
            updated_at = NOW()
        WHERE id = (SELECT quote_id FROM payments WHERE id = p_payment_id);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to process refund
CREATE OR REPLACE FUNCTION process_payment_refund(
    p_payment_id TEXT,
    p_refund_amount DECIMAL,
    p_refund_reason TEXT DEFAULT 'Customer request',
    p_processed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_amount DECIMAL;
    current_refund_amount DECIMAL;
    new_status payment_status;
BEGIN
    -- Get current payment details
    SELECT amount, refund_amount INTO current_amount, current_refund_amount
    FROM payments
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new refund amount
    current_refund_amount := COALESCE(current_refund_amount, 0) + p_refund_amount;
    
    -- Determine new status
    IF current_refund_amount >= current_amount THEN
        new_status := 'refunded';
    ELSE
        new_status := 'partially_refunded';
    END IF;
    
    -- Update payment record
    UPDATE payments SET
        refund_amount = current_refund_amount,
        refund_reason = p_refund_reason,
        refund_processed_at = NOW(),
        status = new_status,
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Insert payment history record
    INSERT INTO payment_history (
        payment_id,
        action,
        new_status,
        changed_by,
        change_reason,
        metadata
    ) VALUES (
        p_payment_id,
        'refunded',
        new_status,
        p_processed_by,
        p_refund_reason,
        jsonb_build_object('refund_amount', p_refund_amount, 'total_refunded', current_refund_amount)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create view for payment summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.id,
    p.service_request_id,
    p.quote_id,
    p.customer_name,
    p.customer_email,
    p.amount,
    p.currency,
    p.status,
    p.payment_method,
    p.receipt_number,
    p.created_at,
    p.payment_completed_at,
    sr.serial_number,
    sr.product_type,
    q.total_cost as quote_amount,
    CASE 
        WHEN p.status = 'captured' THEN 'Success'
        WHEN p.status = 'failed' THEN 'Failed'
        WHEN p.status = 'cancelled' THEN 'Cancelled'
        WHEN p.status = 'refunded' THEN 'Refunded'
        WHEN p.status = 'partially_refunded' THEN 'Partially Refunded'
        ELSE 'Pending'
    END as status_display
FROM payments p
LEFT JOIN service_requests sr ON p.service_request_id = sr.id
LEFT JOIN quotes q ON p.quote_id = q.id;

-- Create view for payment statistics
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    COUNT(*) as total_payments,
    COUNT(CASE WHEN status = 'captured' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_payments,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
    SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END) as total_amount_captured,
    SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) as total_amount_refunded,
    AVG(CASE WHEN status = 'captured' THEN amount END) as average_payment_amount,
    ROUND(
        (COUNT(CASE WHEN status = 'captured' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate_percentage
FROM payments;

-- Enable Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first if exists)
DROP POLICY IF EXISTS "Allow all operations on payments" ON payments;
DROP POLICY IF EXISTS "Allow all operations on payment_history" ON payment_history;
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on payment_history" ON payment_history FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payment_history TO authenticated;
GRANT ALL ON payment_summary TO authenticated;
GRANT ALL ON payment_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_record TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_refund TO authenticated;
GRANT EXECUTE ON FUNCTION generate_receipt_number TO authenticated;

-- ===================================================================
-- END OF PAYMENT TABLE SCHEMA (FIXED VERSION)
-- ===================================================================
