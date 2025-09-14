# Dual Authentication System

This application implements a dual authentication system that supports both Supabase Auth for customers and hardcoded authentication for admin, service, and partner teams.

## Authentication Flow

### For Customers
- **Sign Up**: Uses Supabase Auth to create new customer accounts
- **Sign In**: Authenticates through Supabase Auth
- **Profile Management**: Full profile and password management capabilities
- **Password Reset**: Email-based password reset functionality

### For Admin/Service/Partner Teams
- **Sign In**: Uses hardcoded credentials stored in the application
- **No Sign Up**: These accounts are managed separately by administrators
- **Limited Profile Management**: Basic profile viewing only

## Hardcoded Demo Accounts

For testing purposes, the following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | admin123 |
| Service | service@test.com | service123 |
| Partner | partner@test.com | partner123 |

## Database Schema Changes

The `app_users` table has been updated to support both authentication methods:

```sql
CREATE TABLE app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    full_name TEXT,
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_supabase_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Fields:
- `supabase_user_id`: Links to Supabase Auth users (customers only)
- `is_supabase_user`: Flag to distinguish between Supabase Auth users and hardcoded users

## Automatic User Creation

When a customer signs up through Supabase Auth, a database trigger automatically creates a corresponding record in the `app_users` table:

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## API Methods

### Authentication
- `login(email, password)`: Handles both Supabase Auth and hardcoded authentication
- `register(email, password, role, fullName)`: Only allows customer registration via Supabase Auth
- `logout()`: Signs out from both systems

### Customer Profile Management
- `updateCustomerProfile(userId, updates)`: Updates customer profile information
- `changeCustomerPassword(currentPassword, newPassword)`: Changes customer password
- `resetPassword(email)`: Sends password reset email

## Security Considerations

1. **Password Storage**: Supabase Auth handles secure password hashing for customers
2. **Hardcoded Passwords**: Demo passwords are stored in plain text (not recommended for production)
3. **Row Level Security**: All tables have RLS enabled with permissive policies
4. **Session Management**: Uses localStorage for session persistence

## Usage Instructions

### For Customers:
1. Click "Sign Up" on the login page
2. Fill in the registration form (only Customer role is available)
3. Verify email if required by Supabase configuration
4. Sign in with your credentials
5. Access profile management from your dashboard

### For Admin/Service/Partner:
1. Use the hardcoded credentials provided above
2. Sign in directly without registration
3. Access role-specific dashboards

## Environment Variables Required

Make sure these environment variables are set in your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the System

1. **Test Customer Registration**: Try creating a new customer account
2. **Test Customer Login**: Sign in with the newly created account
3. **Test Hardcoded Login**: Use the demo admin/service/partner accounts
4. **Test Profile Management**: Update customer profile information
5. **Test Password Management**: Change customer password or request reset

## Future Enhancements

- Implement proper password hashing for hardcoded accounts
- Add email verification for customer accounts
- Implement role-based access control (RBAC)
- Add two-factor authentication for admin accounts
- Implement session timeout and refresh tokens
