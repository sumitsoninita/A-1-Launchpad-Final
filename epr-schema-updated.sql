-- EPR Team Database Schema Updates - UPDATED VERSION
-- This version updates the EPR status enum to match the new separated values
-- Run this single script in your Supabase SQL Editor

-- 1. First, let's check if we need to update the EPR status enum
DO $$ 
BEGIN
    -- Check if the old enum values exist and need to be updated
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epr_status') THEN
        -- Drop the old enum and recreate with new values
        DROP TYPE IF EXISTS epr_status CASCADE;
    END IF;
    
    -- Create the new EPR status enum with separated values
    CREATE TYPE epr_status AS ENUM (
        'Cost Estimation Preparation',
        'Awaiting Approval',
        'Approved', 
        'Declined',
        'Repair in Progress',
        'Repair Completed',
        'Return to Customer'
    );
END $$;

-- 2. Ensure EPR-specific columns exist in service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS current_epr_status epr_status,
ADD COLUMN IF NOT EXISTS epr_timeline JSONB DEFAULT '[]'::jsonb;

-- 2.1. Add currency column to quotes table if it doesn't exist
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- 2.2. Update existing quotes to have INR currency if they don't have one
UPDATE quotes 
SET currency = 'INR' 
WHERE currency IS NULL;

-- 3. Add 'epr' to user_role enum if it doesn't exist
DO $$ 
BEGIN
    -- Check if 'epr' value exists in user_role enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'epr' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        -- Add 'epr' to the user_role enum
        ALTER TYPE user_role ADD VALUE 'epr';
    END IF;
END $$;

-- 4. Insert EPR demo user if it doesn't exist
INSERT INTO app_users (id, email, role, full_name, is_supabase_user) VALUES
    (gen_random_uuid(), 'epr@test.com', 'epr', 'EPR Team Lead', FALSE)
ON CONFLICT (email) DO NOTHING;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_epr_status ON service_requests(current_epr_status);
CREATE INDEX IF NOT EXISTS idx_service_requests_epr_timeline ON service_requests USING GIN(epr_timeline);

-- 6. Create a function to update EPR status
CREATE OR REPLACE FUNCTION update_epr_status(
    request_id UUID,
    new_status epr_status,
    user_email TEXT,
    details TEXT DEFAULT NULL,
    cost_estimation NUMERIC DEFAULT NULL,
    cost_estimation_currency TEXT DEFAULT 'INR',
    approval_decision TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    new_timeline_entry JSONB;
BEGIN
    -- Create new timeline entry
    new_timeline_entry := jsonb_build_object(
        'timestamp', NOW()::TEXT,
        'user', user_email,
        'action', 'EPR Status Updated to: ' || new_status,
        'epr_status', new_status,
        'details', COALESCE(details, ''),
        'cost_estimation', cost_estimation,
        'cost_estimation_currency', cost_estimation_currency,
        'approval_decision', approval_decision
    );
    
    -- Update the service request
    UPDATE service_requests 
    SET 
        current_epr_status = new_status,
        epr_timeline = COALESCE(epr_timeline, '[]'::jsonb) || new_timeline_entry,
        updated_at = NOW()
    WHERE id = request_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a view for EPR team to see service requests with quotes
CREATE OR REPLACE VIEW epr_service_requests AS
SELECT 
    sr.*,
    q.id as quote_id,
    q.items as quote_items,
    q.total_cost as quote_total_cost,
    COALESCE(q.currency, 'INR') as quote_currency,
    q.is_approved as quote_is_approved,
    q.created_at as quote_created_at
FROM service_requests sr
LEFT JOIN quotes q ON sr.id = q.service_request_id
WHERE sr.status IN ('Received', 'Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Dispatched', 'Completed', 'Cancelled');

-- 8. Update some sample data to have EPR status (optional - for testing)
UPDATE service_requests 
SET 
    current_epr_status = 'Cost Estimation Preparation',
    epr_timeline = jsonb_build_array(
        jsonb_build_object(
            'timestamp', NOW()::TEXT,
            'user', 'epr@test.com',
            'action', 'EPR Status Updated to: Cost Estimation Preparation',
            'epr_status', 'Cost Estimation Preparation',
            'details', 'Initial EPR assessment started',
            'cost_estimation', 1500,
            'cost_estimation_currency', 'INR'
        )
    )
WHERE id IN (
    SELECT id FROM service_requests 
    WHERE status = 'Awaiting Approval' 
    AND current_epr_status IS NULL 
    LIMIT 2
);

-- 9. Grant necessary permissions (if using RLS)
-- Note: These are commented out to avoid RLS issues for now
-- You can uncomment and adjust these based on your RLS setup

-- ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "EPR team can view all service requests" ON service_requests
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM app_users 
--             WHERE app_users.email = auth.jwt() ->> 'email' 
--             AND app_users.role = 'epr'
--         )
--     );

-- CREATE POLICY "EPR team can update EPR status" ON service_requests
--     FOR UPDATE USING (
--         EXISTS (
--             SELECT 1 FROM app_users 
--             WHERE app_users.email = auth.jwt() ->> 'email' 
--             AND app_users.role = 'epr'
--         )
--     );

-- CREATE POLICY "Service team can view all service requests" ON service_requests
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM app_users 
--             WHERE app_users.email = auth.jwt() ->> 'email' 
--             AND app_users.role IN ('admin', 'service')
--         )
--     );

COMMIT;
