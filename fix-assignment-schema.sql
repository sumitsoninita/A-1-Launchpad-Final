-- =====================================================
-- FIX ASSIGNMENT SCHEMA FOR TEAM MEMBERS
-- =====================================================
-- This script adds separate fields for service and EPR team assignments
-- to avoid issues with comma-separated values

-- Add new assignment fields
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS assigned_service_team TEXT,
ADD COLUMN IF NOT EXISTS assigned_epr_team TEXT;

-- Update existing data to populate the new fields
-- Extract service team assignment from assigned_to field
UPDATE service_requests 
SET assigned_service_team = CASE 
    WHEN assigned_to LIKE '%mukesh%' THEN 'mukesh@test.com'
    WHEN assigned_to LIKE '%suresh%' THEN 'suresh@test.com'
    ELSE NULL
END
WHERE assigned_to IS NOT NULL;

-- Extract EPR team assignment from assigned_to field
UPDATE service_requests 
SET assigned_epr_team = CASE 
    WHEN assigned_to LIKE '%mohit%' THEN 'mohit@test.com'
    WHEN assigned_to LIKE '%rohit%' THEN 'rohit@test.com'
    ELSE NULL
END
WHERE assigned_to IS NOT NULL;

-- For requests with 'Diagnosis' status and beyond, ensure EPR assignment
UPDATE service_requests 
SET assigned_epr_team = CASE 
    WHEN (EXTRACT(EPOCH FROM created_at)::int % 2) = 0 THEN 'mohit@test.com'
    ELSE 'rohit@test.com'
END
WHERE status IN ('Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Completed', 'Cancelled')
    AND assigned_epr_team IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_service_team ON service_requests(assigned_service_team);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_epr_team ON service_requests(assigned_epr_team);

-- Verify the updates
SELECT 
    id,
    status,
    assigned_to,
    assigned_service_team,
    assigned_epr_team,
    created_at
FROM service_requests 
WHERE status IN ('Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Completed', 'Cancelled')
ORDER BY created_at DESC;
