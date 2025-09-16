-- =====================================================
-- FIX CURRENCY CONSISTENCY ISSUE
-- =====================================================
-- This script ensures the EPR cost estimation currency field exists
-- and is properly populated to maintain currency consistency

-- 1. Add the EPR cost estimation currency field if it doesn't exist
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS epr_cost_estimation_currency TEXT CHECK (epr_cost_estimation_currency IN ('INR', 'USD'));

-- 2. Update existing requests that have EPR timeline entries with cost estimation
-- Extract currency from EPR timeline entries
UPDATE service_requests 
SET epr_cost_estimation_currency = (
    SELECT 
        CASE 
            WHEN jsonb_path_exists(epr_timeline, '$[*].cost_estimation_currency ? (@ == "USD")') THEN 'USD'
            WHEN jsonb_path_exists(epr_timeline, '$[*].cost_estimation_currency ? (@ == "INR")') THEN 'INR'
            ELSE 'INR' -- Default to INR if no currency found
        END
    FROM service_requests sr2 
    WHERE sr2.id = service_requests.id
)
WHERE epr_timeline IS NOT NULL 
    AND jsonb_array_length(epr_timeline) > 0
    AND epr_cost_estimation_currency IS NULL;

-- 3. For requests with EPR status but no timeline currency, set default to INR
UPDATE service_requests 
SET epr_cost_estimation_currency = 'INR'
WHERE current_epr_status IS NOT NULL 
    AND epr_cost_estimation_currency IS NULL;

-- 4. For requests with quotes but no EPR currency, set EPR currency to match quote currency
UPDATE service_requests 
SET epr_cost_estimation_currency = (
    SELECT quotes.currency 
    FROM quotes 
    WHERE quotes.service_request_id = service_requests.id 
    LIMIT 1
)
WHERE epr_cost_estimation_currency IS NULL 
    AND EXISTS (
        SELECT 1 FROM quotes 
        WHERE quotes.service_request_id = service_requests.id
    );

-- 5. Set default currency for any remaining requests
UPDATE service_requests 
SET epr_cost_estimation_currency = 'INR'
WHERE epr_cost_estimation_currency IS NULL;

-- 6. Verify the updates
SELECT 
    id,
    status,
    current_epr_status,
    epr_cost_estimation_currency,
    created_at
FROM service_requests 
WHERE current_epr_status IS NOT NULL 
    OR epr_cost_estimation_currency IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check for any currency mismatches between EPR currency and quote currency
SELECT 
    sr.id,
    sr.epr_cost_estimation_currency as epr_currency,
    q.currency as quote_currency,
    CASE 
        WHEN sr.epr_cost_estimation_currency = q.currency THEN 'MATCH'
        ELSE 'MISMATCH'
    END as currency_status
FROM service_requests sr
LEFT JOIN quotes q ON q.service_request_id = sr.id
WHERE sr.epr_cost_estimation_currency IS NOT NULL 
    AND q.currency IS NOT NULL
ORDER BY sr.created_at DESC;
