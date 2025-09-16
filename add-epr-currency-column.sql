-- Add EPR cost estimation currency column to service_requests table
-- This fixes the 400 error when updating EPR status

ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS epr_cost_estimation_currency TEXT CHECK (epr_cost_estimation_currency IN ('INR', 'USD'));

-- Add comment for documentation
COMMENT ON COLUMN service_requests.epr_cost_estimation_currency IS 'Currency used by EPR team for cost estimation (INR or USD)';
