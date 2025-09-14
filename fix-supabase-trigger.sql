-- Fix for Supabase Auth trigger causing "Database error saving new user"
-- Run this in your Supabase SQL Editor to fix the issue

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Create a safer version of the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create app_users record if the user doesn't already exist
    -- This prevents duplicate key errors
    INSERT INTO app_users (email, role, full_name, supabase_user_id, is_supabase_user)
    VALUES (
        NEW.email,
        'customer',
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.id,
        TRUE
    )
    ON CONFLICT (email) DO NOTHING; -- Ignore if email already exists
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth user creation
        RAISE WARNING 'Failed to create app_users record for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres;
GRANT INSERT ON app_users TO postgres;

-- Step 5: Verify the trigger was created
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
