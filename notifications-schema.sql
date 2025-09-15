-- Notifications table for real-time customer notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'status', 'quote', 'epr', 'complaint')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    service_request_id TEXT REFERENCES service_requests(id) ON DELETE CASCADE,
    payment_id VARCHAR(255),
    customer_id TEXT NOT NULL, -- Using TEXT to match service_requests.customer_id type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_unread ON notifications(customer_id, read) WHERE read = FALSE;

-- RLS Policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customers can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service team can create notifications" ON notifications;

-- Customers can only see their own notifications
CREATE POLICY "Customers can view own notifications" ON notifications
    FOR SELECT USING (
        customer_id = (
            SELECT id::text FROM app_users 
            WHERE auth.uid() = supabase_user_id
        )
    );

-- Customers can update their own notifications (mark as read)
CREATE POLICY "Customers can update own notifications" ON notifications
    FOR UPDATE USING (
        customer_id = (
            SELECT id::text FROM app_users 
            WHERE auth.uid() = supabase_user_id
        )
    );

-- Service team and admins can create notifications for customers
-- Allow service team members to create notifications
CREATE POLICY "Service team can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        -- Allow if user has service role or if called from trigger
        current_setting('role') = 'service_role' OR
        -- Allow for authenticated service team members
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE (supabase_user_id = auth.uid() OR id::text = auth.uid()::text)
            AND role IN ('admin', 'service', 'epr', 'cpr')
        )
    );

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_status_change ON service_requests;
DROP TRIGGER IF EXISTS trigger_notify_payment ON payments;
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
DROP FUNCTION IF EXISTS notify_customer_on_status_change();
DROP FUNCTION IF EXISTS notify_customer_on_payment();
DROP FUNCTION IF EXISTS update_notifications_updated_at();
DROP FUNCTION IF EXISTS create_notification_service_role(VARCHAR, VARCHAR, TEXT, TEXT, TEXT, VARCHAR);

-- Function to create notification with service role (bypasses RLS)
CREATE OR REPLACE FUNCTION create_notification_service_role(
    p_type VARCHAR(20),
    p_title VARCHAR(255),
    p_message TEXT,
    p_customer_id TEXT,
    p_service_request_id TEXT DEFAULT NULL,
    p_payment_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification using service role
    INSERT INTO notifications (
        type,
        title,
        message,
        customer_id,
        service_request_id,
        payment_id,
        timestamp,
        read
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_customer_id,
        p_service_request_id,
        p_payment_id,
        NOW(),
        FALSE
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Function to create notification when service request status changes
CREATE OR REPLACE FUNCTION notify_customer_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Only notify if status actually changed and customer exists
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.customer_id IS NOT NULL THEN
        SELECT create_notification_service_role(
            'status',
            'Service Request Status Updated',
            'Your service request #' || substring(NEW.id from length(NEW.id) - 7) || 
            ' status has been updated to "' || NEW.status || '"',
            NEW.customer_id,
            NEW.id
        ) INTO notification_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create status change notifications
CREATE TRIGGER trigger_notify_status_change
    AFTER UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_on_status_change();

-- Function to create notification when payment is created
CREATE OR REPLACE FUNCTION notify_customer_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    customer_id_text TEXT;
    notification_id UUID;
BEGIN
    -- Get customer ID from service request
    SELECT customer_id INTO customer_id_text
    FROM service_requests 
    WHERE id = NEW.service_request_id;
    
    IF customer_id_text IS NOT NULL THEN
        SELECT create_notification_service_role(
            'payment',
            'Payment Confirmed',
            'Your payment of ₹' || NEW.amount || ' has been confirmed for service request #' || 
            substring(NEW.service_request_id from length(NEW.service_request_id) - 7),
            customer_id_text,
            NEW.service_request_id,
            NEW.id
        ) INTO notification_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create payment notifications
CREATE TRIGGER trigger_notify_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_on_payment();
