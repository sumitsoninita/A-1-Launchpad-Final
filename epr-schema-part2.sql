-- EPR Team Database Schema Updates - PART 2
-- Run this AFTER completing PART 1 and committing those changes
-- This part includes the EPR user creation and remaining setup

-- 1. Add EPR team user to app_users table
-- This can now be run since the 'epr' enum value has been committed
INSERT INTO app_users (id, email, role, full_name, is_supabase_user) VALUES 
    ('user-5', 'epr@test.com', 'epr', 'EPR Team Lead', FALSE);

-- 2. Add some sample EPR timeline data to existing service request (optional)
-- This will add a sample EPR timeline entry to the existing test request
UPDATE service_requests 
SET 
    current_epr_status = 'Cost Estimation Preparation',
    epr_timeline = '[
        {
            "timestamp": "2024-01-15T14:30:00Z",
            "user": "epr@test.com", 
            "action": "EPR Status Updated to: Cost Estimation Preparation",
            "epr_status": "Cost Estimation Preparation",
            "details": "Initial assessment completed. Preparing cost estimation for repair.",
            "cost_estimation": 1500.00
        }
    ]'::jsonb
WHERE id = 'req-abc-123';

-- 3. Create a function to validate EPR status transitions
CREATE OR REPLACE FUNCTION validate_epr_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow first EPR status to be set
    IF OLD.current_epr_status IS NULL AND NEW.current_epr_status IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Define valid transitions
    IF OLD.current_epr_status = 'Cost Estimation Preparation' AND 
       NEW.current_epr_status IN ('Approval / Decline') THEN
        RETURN NEW;
    END IF;
    
    IF OLD.current_epr_status = 'Approval / Decline' AND 
       NEW.current_epr_status IN ('Repair in Progress', 'Return to Customer') THEN
        RETURN NEW;
    END IF;
    
    IF OLD.current_epr_status = 'Repair in Progress' AND 
       NEW.current_epr_status = 'Repair Completed' THEN
        RETURN NEW;
    END IF;
    
    -- If no valid transition, raise an error
    RAISE EXCEPTION 'Invalid EPR status transition from % to %', 
        OLD.current_epr_status, NEW.current_epr_status;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to enforce EPR status transitions
CREATE TRIGGER validate_epr_status_transition_trigger
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    WHEN (OLD.current_epr_status IS DISTINCT FROM NEW.current_epr_status)
    EXECUTE FUNCTION validate_epr_status_transition();

-- 5. Create a view for EPR team to easily see requests that need their attention
CREATE VIEW epr_pending_requests AS
SELECT 
    sr.id,
    sr.serial_number,
    sr.customer_name,
    sr.product_type,
    sr.status,
    sr.current_epr_status,
    sr.created_at,
    sr.updated_at,
    CASE 
        WHEN sr.current_epr_status IS NULL THEN 'Needs Initial Assessment'
        WHEN sr.current_epr_status = 'Cost Estimation Preparation' THEN 'Needs Cost Estimation'
        WHEN sr.current_epr_status = 'Approval / Decline' THEN 'Awaiting Approval Decision'
        WHEN sr.current_epr_status = 'Repair in Progress' THEN 'Repair in Progress'
        WHEN sr.current_epr_status = 'Repair Completed' THEN 'Repair Completed'
        WHEN sr.current_epr_status = 'Return to Customer' THEN 'Return to Customer'
        ELSE 'Unknown Status'
    END as epr_action_needed
FROM service_requests sr
WHERE sr.status IN ('Received', 'Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check')
ORDER BY 
    CASE 
        WHEN sr.current_epr_status IS NULL THEN 1
        WHEN sr.current_epr_status = 'Cost Estimation Preparation' THEN 2
        WHEN sr.current_epr_status = 'Approval / Decline' THEN 3
        WHEN sr.current_epr_status = 'Repair in Progress' THEN 4
        ELSE 5
    END,
    sr.created_at DESC;

-- 6. Grant permissions for EPR team (if using RLS)
-- Note: These policies assume you have RLS enabled
-- You may need to adjust these based on your specific RLS setup

-- Allow EPR team to read all service requests
CREATE POLICY "EPR team can read all service requests" ON service_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid()::text 
            AND app_users.role = 'epr'
        )
    );

-- Allow EPR team to update EPR-related fields
CREATE POLICY "EPR team can update EPR fields" ON service_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid()::text 
            AND app_users.role = 'epr'
        )
    );

-- 7. Create a function to get EPR timeline for a specific request
CREATE OR REPLACE FUNCTION get_epr_timeline(request_id TEXT)
RETURNS JSONB AS $$
DECLARE
    timeline JSONB;
BEGIN
    SELECT epr_timeline INTO timeline
    FROM service_requests
    WHERE id = request_id;
    
    RETURN COALESCE(timeline, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create a function to add EPR timeline entry
CREATE OR REPLACE FUNCTION add_epr_timeline_entry(
    request_id TEXT,
    user_email TEXT,
    epr_status_val epr_status,
    action_text TEXT,
    details_text TEXT DEFAULT NULL,
    cost_estimation_val DECIMAL DEFAULT NULL,
    approval_decision_val TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    new_entry JSONB;
    current_timeline JSONB;
    updated_timeline JSONB;
BEGIN
    -- Create new timeline entry
    new_entry := jsonb_build_object(
        'timestamp', NOW()::text,
        'user', user_email,
        'action', action_text,
        'epr_status', epr_status_val::text,
        'details', COALESCE(details_text, ''),
        'cost_estimation', cost_estimation_val,
        'approval_decision', approval_decision_val
    );
    
    -- Get current timeline
    SELECT COALESCE(epr_timeline, '[]'::jsonb) INTO current_timeline
    FROM service_requests
    WHERE id = request_id;
    
    -- Add new entry to timeline
    updated_timeline := current_timeline || jsonb_build_array(new_entry);
    
    -- Update the service request
    UPDATE service_requests
    SET 
        epr_timeline = updated_timeline,
        current_epr_status = epr_status_val,
        updated_at = NOW()
    WHERE id = request_id;
    
    RETURN updated_timeline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add comments for documentation
COMMENT ON COLUMN service_requests.current_epr_status IS 'Current EPR team status for this service request';
COMMENT ON COLUMN service_requests.epr_timeline IS 'Timeline of EPR team actions and status updates';
COMMENT ON VIEW epr_pending_requests IS 'View showing service requests that need EPR team attention';
COMMENT ON FUNCTION get_epr_timeline(TEXT) IS 'Get EPR timeline for a specific service request';
COMMENT ON FUNCTION add_epr_timeline_entry(TEXT, TEXT, epr_status, TEXT, TEXT, DECIMAL, TEXT) IS 'Add new entry to EPR timeline';
