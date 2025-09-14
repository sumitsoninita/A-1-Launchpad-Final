# Manual Storage Setup Guide

Since you're getting permission errors with the SQL approach, here's a manual setup that should work:

## Step 1: Create the Storage Bucket Manually

1. **Go to your Supabase Dashboard**
2. **Navigate to Storage** (in the left sidebar)
3. **Click "New bucket"**
4. **Fill in the details:**
   - **Name:** `customer-complaint-image`
   - **Public bucket:** ✅ **Yes** (this is important!)
   - **File size limit:** `50 MB`
   - **Allowed MIME types:** `image/jpeg, image/png, image/gif, image/webp`

5. **Click "Create bucket"**

## Step 2: Set Up Environment Variables

Add this to your `.env` file:

```env
# Your existing variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Add this for storage operations
VITE_SUPABASE_SERVICE_KEY=7fabdc7b72b26fdc37e55fe7841e958552c439b1fd719baa601cd6da4bff8113
```

## Step 3: Test the Upload

The code now includes multiple upload strategies that will automatically try different approaches:

1. **Strategy 1:** Admin client with organized path
2. **Strategy 2:** Admin client with simple path  
3. **Strategy 3:** Regular client with simple path
4. **Strategy 4:** Regular client with root path

## Step 4: Alternative - Use a Different Bucket Name

If you still have issues, you can:

1. **Create a new bucket** with a different name (e.g., `images` or `uploads`)
2. **Update the code** to use the new bucket name:

```typescript
// In services/api.ts, change this line:
.from('customer-complaint-image')
// To:
.from('your-new-bucket-name')
```

## Step 5: Check Bucket Settings

Make sure your bucket has these settings:
- ✅ **Public bucket:** Yes
- ✅ **File size limit:** 50 MB or higher
- ✅ **Allowed MIME types:** Include image types

## Troubleshooting

If you still get errors:

1. **Check browser console** for detailed error messages
2. **Try uploading a small test image** first
3. **Verify your service key** is correct
4. **Make sure the bucket is public**

The new code will automatically try different upload methods until one works, so it should be much more resilient to permission issues.
