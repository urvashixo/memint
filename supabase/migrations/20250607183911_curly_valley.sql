/*
  # Remove RLS Policies for Labs and Lab Members

  1. Changes
    - Remove all RLS policies from `labs` table
    - Remove all RLS policies from `lab_members` table
    - Keep RLS policies on `users` table for security
    - Keep RLS enabled on all tables but remove problematic policies

  2. Security
    - Users table policies remain intact to prevent abuse
    - Application-level permission checks will handle labs and lab_members access
    - Other tables keep their existing policies
*/

-- Drop ALL policies on labs table
DROP POLICY IF EXISTS "Lab owners can manage their labs" ON labs;
DROP POLICY IF EXISTS "Users can read labs where they are members" ON labs;
DROP POLICY IF EXISTS "Lab members can read labs they belong to" ON labs;

-- Drop ALL policies on lab_members table
DROP POLICY IF EXISTS "Lab admins can manage lab members" ON lab_members;
DROP POLICY IF EXISTS "Users can read lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can add members" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can read all lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can remove members" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can update member roles" ON lab_members;
DROP POLICY IF EXISTS "Users can leave labs" ON lab_members;
DROP POLICY IF EXISTS "Users can read own lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can manage members" ON lab_members;
DROP POLICY IF EXISTS "Lab admins can manage members" ON lab_members;

-- Drop the helper function since we're removing policies
DROP FUNCTION IF EXISTS is_lab_owner(uuid, uuid);

-- Note: RLS remains ENABLED on these tables, but with no policies
-- This means only service role can access these tables directly
-- All access must go through application logic with proper permission checks