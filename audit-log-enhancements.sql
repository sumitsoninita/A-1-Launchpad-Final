-- Audit Log Enhancements and Retention Policies
-- This script enhances the audit log functionality with better tracking and retention policies

-- 1. Create audit log retention policy function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Clean up audit logs older than 2 years
    UPDATE service_requests 
    SET audit_log = (
        SELECT jsonb_agg(entry)
        FROM jsonb_array_elements(audit_log) AS entry
        WHERE (entry->>'timestamp')::timestamp > NOW() - INTERVAL '2 years'
    )
    WHERE audit_log IS NOT NULL 
    AND jsonb_array_length(audit_log) > 0;
    
    -- Log the cleanup action
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('audit_cleanup', 'Cleaned up audit logs older than 2 years', NOW());
END;
$$ LANGUAGE plpgsql;

-- 2. Create system logs table for tracking cleanup operations
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create audit log statistics view
CREATE OR REPLACE VIEW audit_log_statistics AS
SELECT 
    sr.id as request_id,
    sr.customer_name,
    sr.serial_number,
    jsonb_array_length(COALESCE(sr.audit_log, '[]'::jsonb)) as total_audit_entries,
    jsonb_array_length(COALESCE(sr.epr_timeline, '[]'::jsonb)) as total_epr_entries,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
        WHERE entry->>'type' = 'epr_action'
    ) as epr_audit_entries,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
        WHERE entry->>'type' = 'status_change'
    ) as status_change_entries,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
        WHERE entry->>'type' = 'quote_generated'
    ) as quote_generated_entries,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
        WHERE entry->>'type' = 'quote_decision'
    ) as quote_decision_entries,
    sr.created_at,
    sr.updated_at
FROM service_requests sr
WHERE sr.audit_log IS NOT NULL 
AND jsonb_array_length(sr.audit_log) > 0;

-- 4. Create function to get audit log summary for a request
CREATE OR REPLACE FUNCTION get_audit_log_summary(request_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'request_id', sr.id,
        'customer_name', sr.customer_name,
        'serial_number', sr.serial_number,
        'total_audit_entries', jsonb_array_length(COALESCE(sr.audit_log, '[]'::jsonb)),
        'total_epr_entries', jsonb_array_length(COALESCE(sr.epr_timeline, '[]'::jsonb)),
        'audit_entries_by_type', (
            SELECT jsonb_object_agg(
                entry->>'type', 
                COUNT(*)
            )
            FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
            GROUP BY entry->>'type'
        ),
        'first_audit_entry', (
            SELECT entry
            FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
            ORDER BY (entry->>'timestamp')::timestamp ASC
            LIMIT 1
        ),
        'last_audit_entry', (
            SELECT entry
            FROM jsonb_array_elements(COALESCE(sr.audit_log, '[]'::jsonb)) AS entry
            ORDER BY (entry->>'timestamp')::timestamp DESC
            LIMIT 1
        ),
        'created_at', sr.created_at,
        'updated_at', sr.updated_at
    )
    INTO result
    FROM service_requests sr
    WHERE sr.id = request_id;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to export audit log data
CREATE OR REPLACE FUNCTION export_audit_log_data(
    request_id TEXT,
    start_date TIMESTAMP DEFAULT NULL,
    end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    filtered_audit_log JSONB;
BEGIN
    -- Get the service request data
    SELECT 
        jsonb_build_object(
            'request_info', jsonb_build_object(
                'id', sr.id,
                'customer_name', sr.customer_name,
                'serial_number', sr.serial_number,
                'product_type', sr.product_type,
                'status', sr.status,
                'current_epr_status', sr.current_epr_status,
                'created_at', sr.created_at,
                'updated_at', sr.updated_at
            ),
            'audit_log', COALESCE(sr.audit_log, '[]'::jsonb),
            'epr_timeline', COALESCE(sr.epr_timeline, '[]'::jsonb),
            'quote_info', (
                SELECT jsonb_build_object(
                    'id', q.id,
                    'total_cost', q.total_cost,
                    'currency', q.currency,
                    'is_approved', q.is_approved,
                    'created_at', q.created_at,
                    'items', q.items
                )
                FROM quotes q
                WHERE q.service_request_id = sr.id
                LIMIT 1
            ),
            'export_metadata', jsonb_build_object(
                'export_date', NOW(),
                'start_date', start_date,
                'end_date', end_date,
                'total_audit_entries', jsonb_array_length(COALESCE(sr.audit_log, '[]'::jsonb)),
                'total_epr_entries', jsonb_array_length(COALESCE(sr.epr_timeline, '[]'::jsonb))
            )
        )
    INTO result
    FROM service_requests sr
    WHERE sr.id = request_id;
    
    -- Filter by date range if provided
    IF start_date IS NOT NULL OR end_date IS NOT NULL THEN
        filtered_audit_log := (
            SELECT jsonb_agg(entry)
            FROM jsonb_array_elements(result->'audit_log') AS entry
            WHERE 
                (start_date IS NULL OR (entry->>'timestamp')::timestamp >= start_date)
                AND (end_date IS NULL OR (entry->>'timestamp')::timestamp <= end_date)
        );
        result := jsonb_set(result, '{audit_log}', COALESCE(filtered_audit_log, '[]'::jsonb));
    END IF;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create indexes for better audit log performance
CREATE INDEX IF NOT EXISTS idx_service_requests_audit_log_gin ON service_requests USING GIN(audit_log);
CREATE INDEX IF NOT EXISTS idx_service_requests_updated_at ON service_requests(updated_at);

-- 7. Create trigger to automatically log system changes
CREATE OR REPLACE FUNCTION log_system_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change in system_logs
    INSERT INTO system_logs (action, details, created_at)
    VALUES (
        'service_request_' || TG_OP,
        jsonb_build_object(
            'request_id', COALESCE(NEW.id, OLD.id),
            'operation', TG_OP,
            'changes', CASE 
                WHEN TG_OP = 'UPDATE' THEN (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE to_jsonb(NEW)->>key != to_jsonb(OLD)->>key
                )
                ELSE NULL
            END
        )::text,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service_requests table
DROP TRIGGER IF EXISTS service_requests_audit_trigger ON service_requests;
CREATE TRIGGER service_requests_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION log_system_changes();

-- 8. Create scheduled cleanup job (requires pg_cron extension)
-- Note: This requires the pg_cron extension to be enabled
-- Uncomment the following line if pg_cron is available:
-- SELECT cron.schedule('audit-log-cleanup', '0 2 * * 0', 'SELECT cleanup_old_audit_logs();');

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION export_audit_log_data(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated;
GRANT SELECT ON audit_log_statistics TO authenticated;
GRANT SELECT ON system_logs TO authenticated;

-- 10. Add comments for documentation
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Cleans up audit logs older than 2 years';
COMMENT ON FUNCTION get_audit_log_summary(TEXT) IS 'Returns a summary of audit log data for a specific request';
COMMENT ON FUNCTION export_audit_log_data(TEXT, TIMESTAMP, TIMESTAMP) IS 'Exports comprehensive audit log data for a request with optional date filtering';
COMMENT ON VIEW audit_log_statistics IS 'Provides statistics about audit log entries across all service requests';
COMMENT ON TABLE system_logs IS 'Logs system-level operations and cleanup activities';
