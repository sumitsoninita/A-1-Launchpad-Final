-- Payment Integration Schema Updates
-- This script adds payment tracking to the existing EPR system

-- 1. Create payment status enum
CREATE TYPE payment_status AS ENUM (
    'pending',
    'captured', 
    'failed',
    'cancelled',
    'refunded'
);

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    receipt TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    payment_method TEXT,
    payment_captured_at TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_status TEXT,
    refund_id TEXT,
    notes JSONB DEFAULT '{}'::jsonb,
    razorpay_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add payment_id column to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- 4. Add payment_required column to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_id ON quotes(payment_id);

-- 6. Create function to create payment record
CREATE OR REPLACE FUNCTION create_payment_record(
    p_service_request_id TEXT,
    p_quote_id TEXT,
    p_razorpay_order_id TEXT,
    p_amount DECIMAL,
    p_customer_name TEXT,
    p_receipt TEXT,
    p_currency TEXT DEFAULT 'INR',
    p_customer_email TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    payment_id UUID;
BEGIN
    INSERT INTO payments (
        service_request_id,
        quote_id,
        razorpay_order_id,
        amount,
        currency,
        customer_name,
        customer_email,
        customer_phone,
        receipt
    ) VALUES (
        p_service_request_id,
        p_quote_id,
        p_razorpay_order_id,
        p_amount,
        p_currency,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_receipt
    ) RETURNING id INTO payment_id;
    
    -- Update quote with payment_id
    UPDATE quotes SET payment_id = payment_id WHERE id = p_quote_id;
    
    -- Update service request to mark payment as required
    UPDATE service_requests 
    SET payment_required = TRUE 
    WHERE id = p_service_request_id;
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
    p_razorpay_payment_id TEXT,
    p_status payment_status,
    p_payment_method TEXT DEFAULT NULL,
    p_razorpay_response JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    payment_record payments%ROWTYPE;
BEGIN
    -- Get the payment record
    SELECT * INTO payment_record 
    FROM payments 
    WHERE razorpay_payment_id = p_razorpay_payment_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update payment status
    UPDATE payments 
    SET 
        status = p_status,
        payment_method = p_payment_method,
        razorpay_response = p_razorpay_response,
        payment_captured_at = CASE 
            WHEN p_status = 'captured' THEN NOW() 
            ELSE payment_captured_at 
        END,
        updated_at = NOW()
    WHERE razorpay_payment_id = p_razorpay_payment_id;
    
    -- Update service request payment status
    IF p_status = 'captured' THEN
        UPDATE service_requests 
        SET 
            payment_completed = TRUE,
            updated_at = NOW()
        WHERE id = payment_record.service_request_id;
        
        -- Add audit log entry
        UPDATE service_requests 
        SET audit_log = COALESCE(audit_log, '[]'::jsonb) || jsonb_build_object(
            'timestamp', NOW()::TEXT,
            'user', 'system',
            'action', 'Payment Completed',
            'type', 'payment_completed',
            'details', 'Customer payment has been successfully processed',
            'metadata', jsonb_build_object(
                'payment_id', payment_record.id,
                'razorpay_payment_id', p_razorpay_payment_id,
                'amount', payment_record.amount,
                'currency', payment_record.currency,
                'payment_method', p_payment_method
            )
        )
        WHERE id = payment_record.service_request_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to process refund
CREATE OR REPLACE FUNCTION process_payment_refund(
    p_razorpay_payment_id TEXT,
    p_refund_amount DECIMAL DEFAULT NULL,
    p_refund_reason TEXT DEFAULT 'Customer request'
) RETURNS BOOLEAN AS $$
DECLARE
    payment_record payments%ROWTYPE;
    refund_amount DECIMAL;
BEGIN
    -- Get the payment record
    SELECT * INTO payment_record 
    FROM payments 
    WHERE razorpay_payment_id = p_razorpay_payment_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Determine refund amount
    refund_amount := COALESCE(p_refund_amount, payment_record.amount);
    
    -- Update payment record
    UPDATE payments 
    SET 
        status = 'refunded',
        refund_amount = refund_amount,
        refund_status = 'processed',
        updated_at = NOW()
    WHERE razorpay_payment_id = p_razorpay_payment_id;
    
    -- Add audit log entry
    UPDATE service_requests 
    SET audit_log = COALESCE(audit_log, '[]'::jsonb) || jsonb_build_object(
        'timestamp', NOW()::TEXT,
        'user', 'system',
        'action', 'Payment Refunded',
        'type', 'payment_refunded',
        'details', 'Payment has been refunded to customer',
        'metadata', jsonb_build_object(
            'payment_id', payment_record.id,
            'razorpay_payment_id', p_razorpay_payment_id,
            'refund_amount', refund_amount,
            'refund_reason', p_refund_reason
        )
    )
    WHERE id = payment_record.service_request_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create view for payment summary
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
    p.id as payment_id,
    p.service_request_id,
    p.quote_id,
    p.razorpay_order_id,
    p.razorpay_payment_id,
    p.amount,
    p.currency,
    p.status as payment_status,
    p.customer_name,
    p.customer_email,
    p.payment_method,
    p.payment_captured_at,
    p.refund_amount,
    p.refund_status,
    p.created_at as payment_created_at,
    sr.serial_number,
    sr.product_type,
    sr.status as service_status,
    q.total_cost as quote_amount,
    q.is_approved as quote_approved
FROM payments p
JOIN service_requests sr ON p.service_request_id = sr.id
JOIN quotes q ON p.quote_id = q.id;

-- 10. Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_payment_record(TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_payment_status(TEXT, payment_status, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_refund(TEXT, DECIMAL, TEXT) TO authenticated;
GRANT SELECT ON payment_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;

-- 12. Add comments for documentation
COMMENT ON TABLE payments IS 'Stores payment information for service requests';
COMMENT ON FUNCTION create_payment_record IS 'Creates a new payment record and links it to quote and service request';
COMMENT ON FUNCTION update_payment_status IS 'Updates payment status and triggers service request updates';
COMMENT ON FUNCTION process_payment_refund IS 'Processes payment refunds and updates audit logs';
COMMENT ON VIEW payment_summary IS 'Provides comprehensive payment information with service request and quote details';
