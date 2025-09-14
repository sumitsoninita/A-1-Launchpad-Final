# Forgot Password Functionality

The application now includes a complete forgot password flow for customer accounts using Supabase Auth.

## 🔐 **How It Works**

### **For Customers (Supabase Auth Users)**
1. **Request Password Reset**: Click "Forgot your password?" on the login page
2. **Enter Email**: Enter the email address associated with your account
3. **Receive Email**: Check your inbox for a password reset link
4. **Reset Password**: Click the link and enter your new password
5. **Sign In**: Use your new password to sign in

### **For Admin/Service/Partner (Hardcoded Users)**
- Password reset is not available for hardcoded accounts
- Contact your administrator for password assistance

## 🚀 **User Flow**

### **Step 1: Request Password Reset**
```
Login Page → Click "Forgot your password?" → Forgot Password Page
```

### **Step 2: Enter Email**
- Enter the email address you used to register
- Click "Send Reset Link"
- You'll see a confirmation message

### **Step 3: Check Email**
- Look for an email from Supabase Auth
- The email will contain a secure reset link
- Click the link to proceed

### **Step 4: Reset Password**
- You'll be redirected to the reset password page
- Enter your new password (minimum 6 characters)
- Confirm your new password
- Click "Update Password"

### **Step 5: Sign In**
- You'll be redirected back to the login page
- Sign in with your new password

## 🛠️ **Technical Implementation**

### **Components Created**
1. **`ForgotPassword.tsx`**: Handles email input and reset request
2. **`ResetPassword.tsx`**: Handles password update from email link
3. **Updated `Login.tsx`**: Added "Forgot your password?" link
4. **Updated `App.tsx`**: Added routing for password reset flow

### **API Methods**
- **`resetPassword(email)`**: Sends password reset email via Supabase Auth
- **`changeCustomerPassword(currentPassword, newPassword)`**: Updates password for authenticated users

### **Supabase Integration**
- Uses Supabase Auth's built-in password reset functionality
- Automatically handles email sending and secure token generation
- Validates reset links and manages session state

## 🔧 **Configuration Requirements**

### **Supabase Auth Settings**
Make sure these are configured in your Supabase Dashboard:

1. **Authentication → Settings → Email Templates**
   - Customize the password reset email template if needed
   - Ensure the redirect URL is set to your application URL

2. **Authentication → Settings → URL Configuration**
   - Set the Site URL to your application URL
   - Add your domain to allowed redirect URLs

3. **Authentication → Settings → Email**
   - Ensure email confirmation is configured properly
   - Set up SMTP if you want to use custom email sending

### **Environment Variables**
Ensure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 **Testing the Flow**

### **Test Steps**
1. **Create a customer account** (if you don't have one)
2. **Go to login page** and click "Forgot your password?"
3. **Enter the customer email** and click "Send Reset Link"
4. **Check your email** for the reset link
5. **Click the reset link** and set a new password
6. **Sign in** with the new password

### **Expected Behavior**
- ✅ Email is sent successfully
- ✅ Reset link works and redirects to reset page
- ✅ Password can be updated successfully
- ✅ User can sign in with new password
- ✅ Invalid/expired links show appropriate error messages

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Invalid or expired reset link"**
   - The reset link has expired (usually 1 hour)
   - Request a new reset link

2. **Email not received**
   - Check spam/junk folder
   - Verify email address is correct
   - Check Supabase Auth email settings

3. **"User with this email already exists"**
   - The email is already registered
   - Use the existing account or try a different email

4. **"Registration failed"**
   - Check Supabase configuration
   - Verify environment variables are set correctly

### **Debug Steps**
1. Check browser console for error messages
2. Verify Supabase Auth settings in dashboard
3. Test with a simple email address first
4. Check network tab for failed API calls

## 🔒 **Security Features**

- **Secure Tokens**: Supabase generates cryptographically secure reset tokens
- **Time-Limited**: Reset links expire after a set time (default: 1 hour)
- **Single Use**: Reset links can only be used once
- **Email Verification**: Only registered email addresses can request resets
- **Session Management**: Proper session handling during reset flow

## 📱 **UI/UX Features**

- **Responsive Design**: Works on desktop and mobile
- **Dark Mode Support**: Consistent with app theme
- **Loading States**: Shows loading indicators during operations
- **Error Handling**: Clear error messages for users
- **Success Feedback**: Confirmation messages for successful actions
- **Navigation**: Easy navigation between login, forgot password, and reset pages

The forgot password functionality is now fully integrated and ready to use! 🎉
