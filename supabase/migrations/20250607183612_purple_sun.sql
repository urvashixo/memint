/*
  # Fix RLS Policy Circular Dependency

  1. Problem
    - Circular dependency between labs and lab_members policies
    - lab_members policies reference labs table
    - labs policies reference lab_members table
    - This creates infinite recursion when joining tables

  2. Solution
    - Drop all existing lab_members policies
    - Create simplified policies that don't reference other tables
    - Keep labs policies as they are (they work fine independently)
*/

-- Drop ALL existing policies on lab_members to start fresh
DROP POLICY IF EXISTS "Lab admins can manage lab members" ON lab_members;
DROP POLICY IF EXISTS "Users can read lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can add members" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can read all lab memberships" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can remove members" ON lab_members;
DROP POLICY IF EXISTS "Lab owners can update member roles" ON lab_members;
DROP POLICY IF EXISTS "Users can leave labs" ON lab_members;
DROP POLICY IF EXISTS "Users can read own lab memberships" ON lab_members;

-- Create new simplified policies for lab_members that don't cause recursion
CREATE POLICY "Users can read own lab memberships"
  ON lab_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave labs"
  ON lab_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow lab owners to manage members (simplified check without recursion)
-- We'll use a function to check ownership without causing policy recursion
CREATE OR REPLACE FUNCTION is_lab_owner(lab_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM labs 
    WHERE id = lab_uuid AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Lab owners can manage members"
  ON lab_members
  FOR ALL
  TO authenticated
  USING (is_lab_owner(lab_id, auth.uid()))
  WITH CHECK (is_lab_owner(lab_id, auth.uid()));

-- Also allow lab admins to manage members
CREATE POLICY "Lab admins can manage members"
  ON lab_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members existing_member
      WHERE existing_member.lab_id = lab_members.lab_id
      AND existing_member.user_id = auth.uid()
      AND existing_member.role = 'admin'
    )
  );