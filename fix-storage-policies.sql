-- Fix Supabase Storage RLS Policies for customer-complaint-image bucket
-- Run these commands in your Supabase SQL Editor

-- Method 1: Create bucket if it doesn't exist (this should work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-complaint-image',
  'customer-complaint-image',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Method 2: Alternative approach - Create bucket through Supabase Dashboard
-- If the above doesn't work, manually create the bucket in Supabase Dashboard:
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: customer-complaint-image
-- 4. Make it public: Yes
-- 5. File size limit: 50MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- Method 3: Simple policy creation (try this if you have permission issues)
-- Note: You might need to run these one by one if you get permission errors

-- Allow public access to the bucket
UPDATE storage.buckets 
SET public = true 
WHERE id = 'customer-complaint-image';

-- If you can't run the above, try this simpler approach:
-- Just make sure your bucket is public in the Supabase Dashboard
