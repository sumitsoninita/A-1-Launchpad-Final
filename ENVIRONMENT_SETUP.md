# Environment Setup for Supabase Storage

## Required Environment Variables

Add these to your `.env` file:

```env
# Your existing variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Add this new variable for storage operations
VITE_SUPABASE_SERVICE_KEY=your_service_role_key
```

## How to Get Your Service Role Key

1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the anon key)
4. Add it to your `.env` file as `VITE_SUPABASE_SERVICE_KEY`

## Fix Storage Policies

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL commands from `fix-storage-policies.sql`
4. This will create the proper RLS policies for your storage bucket

## Alternative: Use Your Provided Keys

If you want to use the keys you provided, you can also:

1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Replace the service_role key with: `7fabdc7b72b26fdc37e55fe7841e958552c439b1fd719baa601cd6da4bff8113`
4. Make sure the access key ID matches: `3a259f6671b963fab4ca1f7ea041e141`

## Security Note

The service role key has full access to your Supabase project. Keep it secure and never expose it in client-side code in production. For production, consider using server-side upload endpoints.
