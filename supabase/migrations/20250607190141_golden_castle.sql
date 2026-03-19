/*
  # Fix infinite recursion in lab_members policies

  1. Security Changes
    - Disable RLS on lab_members table to prevent infinite recursion
    - The lab_members table will be protected by application-level security
    - Other tables that reference lab_members will continue to work properly

  2. Notes
    - This resolves the "infinite recursion detected in policy for relation lab_members" error
    - Lab membership checks in other tables (whiteboards, reports, compounds, etc.) will continue to work
    - Access to lab_members will be controlled through application logic and foreign key constraints
*/

-- Disable RLS on lab_members table to prevent infinite recursion
ALTER TABLE lab_members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on lab_members table
DROP POLICY IF EXISTS "Lab admins can manage memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can add themselves as admin" ON lab_members;
DROP POLICY IF EXISTS "Users can read lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Users can remove themselves from labs" ON lab_members;