# Team Member Assignment System

## Overview
This system implements a round-robin assignment mechanism for distributing service requests between team members in both Service and EPR teams.

## Team Members

### Service Team
- **Mukesh** (mukesh@test.com) - Password: mukesh123
- **Suresh** (suresh@test.com) - Password: suresh123

### EPR Team  
- **Mohit** (mohit@test.com) - Password: mohit123
- **Rohit** (rohit@test.com) - Password: rohit123

## How It Works

### Service Request Assignment
1. When a customer creates a new service request, it gets automatically assigned to the next available Service team member
2. Assignment alternates between Mukesh and Suresh
3. The system tracks the last assigned member and assigns to the other member for the next request

### EPR Assignment
1. When a service request requires EPR involvement (first EPR status update), it gets assigned to the next available EPR team member
2. Assignment alternates between Mohit and Rohit
3. The EPR assignment happens when the first EPR action is taken (Cost Estimation Preparation)

## Database Schema

### New Table: team_assignments
```sql
CREATE TABLE team_assignments (
    id TEXT PRIMARY KEY DEFAULT 'assignment-tracker',
    service_team_last_assigned TEXT DEFAULT 'mukesh@test.com',
    epr_team_last_assigned TEXT DEFAULT 'mohit@test.com',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated app_users Table Structure
The schema works with the existing app_users table structure:
- id (UUID)
- email (TEXT)
- role (TEXT)
- full_name (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- supabase_user_id (TEXT, nullable)
- is_supabase_user (BOOLEAN)

### New Functions
- `get_next_service_team_member()` - Returns next service team member email
- `get_next_epr_team_member()` - Returns next EPR team member email

## Implementation Details

### API Changes
- Updated hardcoded user passwords for new team members
- Added `getNextServiceTeamMember()` and `getNextEPRTeamMember()` functions
- Modified `addServiceRequest()` to use round-robin assignment
- Modified `updateEPRStatus()` to assign EPR members when first EPR action occurs

### Assignment Logic
- **Service Team**: Alternates between mukesh@test.com and suresh@test.com
- **EPR Team**: Alternates between mohit@test.com and rohit@test.com
- **Fallback**: If functions fail, defaults to first team member (Mukesh/Mohit)

## Usage Instructions

### For Database Setup
1. Run the `team-member-assignment-schema.sql` file in your Supabase SQL editor
2. This will:
   - Create the team_assignments table
   - Update existing user accounts
   - Create new team member accounts
   - Add the round-robin functions

### For Team Members
- Each team member logs in with their individual credentials
- They see the same dashboard as before (no UI changes)
- Service requests are automatically assigned to them based on round-robin
- They can see which requests are assigned to them in the assigned_to field

### For Admins
- Can see all service requests regardless of assignment
- Can manually reassign requests if needed
- Can monitor the assignment system through the database

## Benefits
1. **Fair Distribution**: Work is evenly distributed between team members
2. **Automatic Assignment**: No manual intervention required
3. **Scalable**: Easy to add more team members in the future
4. **Transparent**: Clear assignment tracking in the database
5. **Fallback Safe**: System continues to work even if assignment functions fail

## Monitoring
- Check `team_assignments` table to see current assignment state
- Monitor `assigned_to` field in `service_requests` to see assignments
- Console logs show assignment decisions for debugging
