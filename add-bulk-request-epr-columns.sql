-- Add EPR-related columns to bulk_service_requests table
-- This migration adds support for combined cost estimation in bulk requests

-- Add EPR status column
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS epr_status TEXT DEFAULT 'pending';

-- Add EPR cost estimation columns
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS epr_cost_estimation DECIMAL(10,2);

ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS epr_cost_estimation_currency TEXT CHECK (epr_cost_estimation_currency IN ('INR', 'USD'));

-- Add EPR timeline column (JSONB array)
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS epr_timeline JSONB DEFAULT '[]'::jsonb;

-- Add general timeline column (JSONB array)
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

-- Add quote reference column (without foreign key constraint for now)
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS quote_id TEXT;

-- Add quote column (JSONB object)
ALTER TABLE bulk_service_requests 
ADD COLUMN IF NOT EXISTS quote JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_service_requests_epr_status ON bulk_service_requests(epr_status);

-- Add comments for documentation
COMMENT ON COLUMN bulk_service_requests.epr_status IS 'EPR team status for the bulk request';
COMMENT ON COLUMN bulk_service_requests.epr_cost_estimation IS 'Combined cost estimation provided by EPR team';
COMMENT ON COLUMN bulk_service_requests.epr_cost_estimation_currency IS 'Currency for the cost estimation (INR or USD)';
COMMENT ON COLUMN bulk_service_requests.epr_timeline IS 'Timeline of EPR status updates and actions';
COMMENT ON COLUMN bulk_service_requests.timeline IS 'General timeline of all actions and updates for the bulk request';
COMMENT ON COLUMN bulk_service_requests.quote_id IS 'Reference to the quote generated for this bulk request (foreign key constraint can be added later when quotes table is confirmed)';
COMMENT ON COLUMN bulk_service_requests.quote IS 'Quote details stored as JSONB object';

-- Update existing records to have default values
UPDATE bulk_service_requests 
SET epr_status = 'pending', epr_timeline = '[]'::jsonb, timeline = '[]'::jsonb
WHERE epr_status IS NULL OR epr_timeline IS NULL OR timeline IS NULL;
