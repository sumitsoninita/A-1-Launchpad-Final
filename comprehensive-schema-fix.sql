-- =====================================================
-- COMPREHENSIVE SCHEMA FIX FOR A-1 FENCE SERVICES
-- =====================================================
-- This script will drop and recreate all malfunctioning tables
-- with proper relationships and NO RLS (Row Level Security)
-- =====================================================

-- Drop existing tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;

-- =====================================================
-- 1. SERVICE_REQUESTS TABLE
-- =====================================================
CREATE TABLE service_requests (
    id TEXT PRIMARY KEY,
    serial_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    customer_phone TEXT,
    product_type TEXT NOT NULL CHECK (product_type IN ('Energizer Product', 'Power Adapter', 'Gate Motor Controller')),
    product_details TEXT,
    purchase_date DATE NOT NULL,
    fault_description TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Dispatched', 'Completed', 'Cancelled')),
    is_warranty_claim BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to TEXT,
    notes TEXT[] DEFAULT '{}',
    geolocation TEXT,
    audit_log JSONB DEFAULT '[]'::jsonb,
    epr_timeline JSONB DEFAULT '[]'::jsonb,
    current_epr_status TEXT CHECK (current_epr_status IN ('Cost Estimation Preparation', 'Awaiting Approval', 'Approved', 'Declined', 'Repair in Progress', 'Repair Completed', 'Return to Customer')),
    payment_required BOOLEAN DEFAULT FALSE,
    payment_completed BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- 2. QUOTES TABLE
-- =====================================================
CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    service_request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_cost DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    is_approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_qr_code_url TEXT
);

-- =====================================================
-- 3. COMPLAINTS TABLE
-- =====================================================
CREATE TABLE complaints (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    complaint_details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- 4. FEEDBACK TABLE
-- =====================================================
CREATE TABLE feedback (
    id TEXT PRIMARY KEY,
    service_request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PAYMENTS TABLE
-- =====================================================
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    service_request_id TEXT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'cancelled', 'refunded')),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    payment_method TEXT,
    payment_gateway TEXT DEFAULT 'razorpay',
    receipt_url TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_reason TEXT,
    refund_processed_at TIMESTAMP WITH TIME ZONE,
    refund_processed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('payment', 'status', 'quote', 'epr', 'complaint')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    payment_id TEXT REFERENCES payments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Service Requests Indexes
CREATE INDEX idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX idx_service_requests_serial_number ON service_requests(serial_number);
CREATE INDEX idx_service_requests_product_type ON service_requests(product_type);

-- Quotes Indexes
CREATE INDEX idx_quotes_service_request_id ON quotes(service_request_id);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- Complaints Indexes
CREATE INDEX idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX idx_complaints_request_id ON complaints(request_id);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);
CREATE INDEX idx_complaints_is_resolved ON complaints(is_resolved);

-- Feedback Indexes
CREATE INDEX idx_feedback_service_request_id ON feedback(service_request_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Payments Indexes
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX idx_payments_quote_id ON payments(quote_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);

-- Notifications Indexes
CREATE INDEX idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);
CREATE INDEX idx_notifications_service_request_id ON notifications(service_request_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPFUL FUNCTIONS FOR API OPERATIONS
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_simple_payment(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_payment_status(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS process_payment_refund(TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_notification_service_role(TEXT, TEXT, TEXT, UUID, TEXT, TEXT);

-- Function to create a simple payment record
CREATE OR REPLACE FUNCTION create_simple_payment(
    p_service_request_id TEXT,
    p_quote_id TEXT,
    p_amount DECIMAL,
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_razorpay_order_id TEXT
)
RETURNS TEXT AS $$
DECLARE
    payment_id TEXT;
    customer_id UUID;
BEGIN
    -- Get customer ID from email
    SELECT id INTO customer_id FROM app_users WHERE email = p_customer_email;
    
    IF customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found for email: %', p_customer_email;
    END IF;
    
    -- Generate payment ID
    payment_id := 'pay-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    -- Insert payment record
    INSERT INTO payments (
        id,
        service_request_id,
        quote_id,
        customer_id,
        customer_name,
        amount,
        currency,
        status,
        razorpay_order_id
    ) VALUES (
        payment_id,
        p_service_request_id,
        p_quote_id,
        customer_id,
        p_customer_name,
        p_amount,
        'INR',
        'pending',
        p_razorpay_order_id
    );
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
    p_payment_id TEXT,
    p_status TEXT,
    p_razorpay_payment_id TEXT DEFAULT NULL,
    p_changed_by TEXT DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payments 
    SET 
        status = p_status,
        razorpay_payment_id = COALESCE(p_razorpay_payment_id, razorpay_payment_id),
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'last_changed_by', p_changed_by,
            'change_reason', p_change_reason,
            'status_changed_at', NOW()
        )
    WHERE id = p_payment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to process payment refund
CREATE OR REPLACE FUNCTION process_payment_refund(
    p_payment_id TEXT,
    p_refund_amount DECIMAL DEFAULT NULL,
    p_refund_reason TEXT DEFAULT 'Customer request',
    p_processed_by TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_amount DECIMAL;
BEGIN
    -- Get current payment amount
    SELECT amount INTO current_amount FROM payments WHERE id = p_payment_id;
    
    IF current_amount IS NULL THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;
    
    -- Update payment with refund information
    UPDATE payments 
    SET 
        status = 'refunded',
        refund_amount = COALESCE(p_refund_amount, current_amount),
        refund_reason = p_refund_reason,
        refund_processed_at = NOW(),
        refund_processed_by = p_processed_by,
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification (bypasses RLS)
CREATE OR REPLACE FUNCTION create_notification_service_role(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_customer_id UUID,
    p_service_request_id TEXT DEFAULT NULL,
    p_payment_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    notification_id TEXT;
BEGIN
    -- Generate notification ID
    notification_id := 'notif-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
    
    -- Insert notification
    INSERT INTO notifications (
        id,
        type,
        title,
        message,
        customer_id,
        service_request_id,
        payment_id
    ) VALUES (
        notification_id,
        p_type,
        p_title,
        p_message,
        p_customer_id,
        p_service_request_id,
        p_payment_id
    );
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Payment summary view
CREATE VIEW payment_summary AS
SELECT 
    p.id,
    p.service_request_id,
    p.customer_id,
    p.customer_name,
    p.amount,
    p.currency,
    p.status,
    p.created_at,
    sr.serial_number,
    sr.product_type,
    q.total_cost as quote_amount
FROM payments p
LEFT JOIN service_requests sr ON p.service_request_id = sr.id
LEFT JOIN quotes q ON p.quote_id = q.id;

-- Payment history view
CREATE VIEW payment_history AS
SELECT 
    p.id as payment_id,
    p.status,
    p.amount,
    p.currency,
    p.created_at,
    p.updated_at,
    p.metadata->>'last_changed_by' as changed_by,
    p.metadata->>'change_reason' as change_reason,
    p.metadata->>'status_changed_at' as status_changed_at
FROM payments p
ORDER BY p.created_at DESC;

-- =====================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================

-- Insert sample service request
INSERT INTO service_requests (
    id, serial_number, customer_name, customer_id, product_type, 
    purchase_date, fault_description, status, is_warranty_claim
) VALUES (
    'req-sample-001', 'SN123456789', 'John Doe', 
    (SELECT id FROM app_users WHERE email = 'customer@test.com' LIMIT 1),
    'Energizer Product', '2024-01-15', 'Product not working properly', 
    'Received', FALSE
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FINAL NOTES
-- =====================================================
-- 1. All tables are created WITHOUT Row Level Security (RLS)
-- 2. All foreign key relationships are properly established
-- 3. All required fields from your TypeScript interfaces are included
-- 4. JSONB fields support complex data structures (audit_log, epr_timeline, items)
-- 5. Proper indexes are created for performance
-- 6. Helper functions are provided for common operations
-- 7. Views are created for common query patterns
-- 8. All constraints and checks match your application logic

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the schema is working:

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('service_requests', 'quotes', 'complaints', 'feedback', 'payments', 'notifications');

-- Check foreign key relationships
-- SELECT 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('service_requests', 'quotes', 'complaints', 'feedback', 'payments', 'notifications');

-- Check that RLS is disabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('service_requests', 'quotes', 'complaints', 'feedback', 'payments', 'notifications');
