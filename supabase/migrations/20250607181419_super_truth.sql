/*
  # Fix infinite recursion in lab_members policies

  1. Security Changes
    - Drop existing recursive policies on lab_members table
    - Create new non-recursive policies that avoid circular dependencies
    - Ensure users can manage their own memberships
    - Allow lab owners to manage all memberships in their labs
    - Allow users to read memberships for labs they belong to

  2. Policy Strategy
    - Use direct user_id checks instead of recursive lab_members queries
    - Use labs table owner_id for admin permissions
    - Separate read and write permissions clearly
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Lab admins can manage lab members" ON lab_members;
DROP POLICY IF EXISTS "Users can read lab memberships" ON lab_members;

-- Create new non-recursive policies

-- Allow users to read their own lab memberships
CREATE POLICY "Users can read own lab memberships"
  ON lab_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to read lab memberships for labs they own
CREATE POLICY "Lab owners can read all lab memberships"
  ON lab_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  );

-- Allow lab owners to insert new members
CREATE POLICY "Lab owners can add members"
  ON lab_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  );

-- Allow lab owners to update member roles
CREATE POLICY "Lab owners can update member roles"
  ON lab_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  );

-- Allow lab owners to remove members
CREATE POLICY "Lab owners can remove members"
  ON lab_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  );

-- Allow users to leave labs (delete their own membership)
CREATE POLICY "Users can leave labs"
  ON lab_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());