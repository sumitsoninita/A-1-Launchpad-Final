-- =====================================================
-- TEAM MEMBER ASSIGNMENT SYSTEM
-- =====================================================

-- Create table to track team member assignments for round-robin
CREATE TABLE IF NOT EXISTS team_assignments (
    id TEXT PRIMARY KEY DEFAULT 'assignment-tracker',
    service_team_last_assigned TEXT DEFAULT 'mukesh@test.com',
    epr_team_last_assigned TEXT DEFAULT 'mohit@test.com',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial assignment tracker
INSERT INTO team_assignments (id) VALUES ('assignment-tracker') ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- UPDATE EXISTING HARDCODED USERS
-- =====================================================

-- Update existing service user to Mukesh
UPDATE app_users 
SET email = 'mukesh@test.com', full_name = 'Mukesh', updated_at = NOW()
WHERE email = 'service@test.com';

-- Update existing EPR user to Mohit  
UPDATE app_users 
SET email = 'mohit@test.com', full_name = 'Mohit', updated_at = NOW()
WHERE email = 'epr@test.com';

-- =====================================================
-- CREATE NEW TEAM MEMBER ACCOUNTS
-- =====================================================

-- Create Suresh (Service Team Member 2)
INSERT INTO app_users (
    id, email, role, full_name, created_at, updated_at, supabase_user_id, is_supabase_user
) VALUES (
    gen_random_uuid(), 'suresh@test.com', 'service', 'Suresh', NOW(), NOW(), NULL, false
) ON CONFLICT (email) DO NOTHING;

-- Create Rohit (EPR Team Member 2)
INSERT INTO app_users (
    id, email, role, full_name, created_at, updated_at, supabase_user_id, is_supabase_user
) VALUES (
    gen_random_uuid(), 'rohit@test.com', 'epr', 'Rohit', NOW(), NOW(), NULL, false
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ROUND-ROBIN ASSIGNMENT FUNCTIONS
-- =====================================================

-- Function to get next service team member
CREATE OR REPLACE FUNCTION get_next_service_team_member()
RETURNS TEXT AS $$
DECLARE
    current_assigned TEXT;
    next_assigned TEXT;
BEGIN
    -- Get current assignment
    SELECT service_team_last_assigned INTO current_assigned 
    FROM team_assignments 
    WHERE id = 'assignment-tracker';
    
    -- Determine next member (round-robin between Mukesh and Suresh)
    IF current_assigned = 'mukesh@test.com' THEN
        next_assigned := 'suresh@test.com';
    ELSE
        next_assigned := 'mukesh@test.com';
    END IF;
    
    -- Update the assignment tracker
    UPDATE team_assignments 
    SET service_team_last_assigned = next_assigned, updated_at = NOW()
    WHERE id = 'assignment-tracker';
    
    RETURN next_assigned;
END;
$$ LANGUAGE plpgsql;

-- Function to get next EPR team member
CREATE OR REPLACE FUNCTION get_next_epr_team_member()
RETURNS TEXT AS $$
DECLARE
    current_assigned TEXT;
    next_assigned TEXT;
BEGIN
    -- Get current assignment
    SELECT epr_team_last_assigned INTO current_assigned 
    FROM team_assignments 
    WHERE id = 'assignment-tracker';
    
    -- Determine next member (round-robin between Mohit and Rohit)
    IF current_assigned = 'mohit@test.com' THEN
        next_assigned := 'rohit@test.com';
    ELSE
        next_assigned := 'mohit@test.com';
    END IF;
    
    -- Update the assignment tracker
    UPDATE team_assignments 
    SET epr_team_last_assigned = next_assigned, updated_at = NOW()
    WHERE id = 'assignment-tracker';
    
    RETURN next_assigned;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE team_assignments IS 'Tracks round-robin assignment of service requests to team members';
COMMENT ON FUNCTION get_next_service_team_member() IS 'Returns next service team member email for round-robin assignment';
COMMENT ON FUNCTION get_next_epr_team_member() IS 'Returns next EPR team member email for round-robin assignment';
