# Schema Update Summary

## Updated team-member-assignment-schema.sql

### Changes Made:
1. **Updated INSERT statements** to include all required app_users columns:
   - Added `created_at`, `updated_at`, `supabase_user_id` columns
   - Set proper values: `NOW()` for timestamps, `NULL` for supabase_user_id

2. **Updated UPDATE statements** to include `updated_at` timestamp:
   - Added `updated_at = NOW()` to existing user updates

### Complete app_users Table Structure:
```sql
-- Columns in app_users table:
id              -- UUID (auto-generated)
email           -- TEXT (unique)
role            -- TEXT (service, epr, admin, etc.)
full_name       -- TEXT (display name)
created_at      -- TIMESTAMP (auto-set to NOW())
updated_at      -- TIMESTAMP (auto-set to NOW())
supabase_user_id -- TEXT (nullable, NULL for hardcoded users)
is_supabase_user -- BOOLEAN (false for hardcoded users)
```

### Updated INSERT Statements:
```sql
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
```

### Updated UPDATE Statements:
```sql
-- Update existing service user to Mukesh
UPDATE app_users 
SET email = 'mukesh@test.com', full_name = 'Mukesh', updated_at = NOW()
WHERE email = 'service@test.com';

-- Update existing EPR user to Mohit  
UPDATE app_users 
SET email = 'mohit@test.com', full_name = 'Mohit', updated_at = NOW()
WHERE email = 'epr@test.com';
```

## Ready to Deploy
The schema is now properly aligned with your app_users table structure and ready to be executed in Supabase.
