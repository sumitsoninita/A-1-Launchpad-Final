-- Fix existing service requests that have 'Diagnosis' status but no EPR assignment
-- This script will assign EPR team members to requests that should have them

-- First, let's see what requests need EPR assignment
SELECT 
    id,
    status,
    assigned_to,
    created_at,
    updated_at
FROM service_requests 
WHERE status = 'Diagnosis' 
    AND (assigned_to IS NULL OR assigned_to NOT LIKE '%mohit%' AND assigned_to NOT LIKE '%rohit%')
ORDER BY created_at DESC;

-- Update requests with 'Diagnosis' status to assign EPR team members
-- We'll use a simple alternating pattern based on the request ID
UPDATE service_requests 
SET assigned_to = CASE 
    WHEN (EXTRACT(EPOCH FROM created_at)::int % 2) = 0 THEN 'mohit@test.com'
    ELSE 'rohit@test.com'
END,
updated_at = NOW()
WHERE status = 'Diagnosis' 
    AND (assigned_to IS NULL OR assigned_to NOT LIKE '%mohit%' AND assigned_to NOT LIKE '%rohit%');

-- Also update requests with status beyond 'Diagnosis' that don't have EPR assignment
UPDATE service_requests 
SET assigned_to = CASE 
    WHEN (EXTRACT(EPOCH FROM created_at)::int % 2) = 0 THEN 'mohit@test.com'
    ELSE 'rohit@test.com'
END,
updated_at = NOW()
WHERE status IN ('Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Completed', 'Cancelled')
    AND (assigned_to IS NULL OR assigned_to NOT LIKE '%mohit%' AND assigned_to NOT LIKE '%rohit%');

-- Verify the updates
SELECT 
    id,
    status,
    assigned_to,
    created_at,
    updated_at
FROM service_requests 
WHERE status IN ('Diagnosis', 'Awaiting Approval', 'Repair in Progress', 'Quality Check', 'Completed', 'Cancelled')
ORDER BY created_at DESC;
