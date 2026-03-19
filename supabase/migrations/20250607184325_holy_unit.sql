/*
  # Add RLS policies for lab_members table

  1. Security Policies
    - Allow lab owners to add themselves as admin when creating a lab
    - Allow lab admins to manage lab memberships
    - Allow users to read lab memberships for labs they belong to
    - Allow users to remove themselves from labs

  This fixes the RLS violation error that occurs when the trigger tries to add
  the lab owner as an admin member after lab creation.
*/

-- Allow lab owners to add themselves as admin when creating a lab
CREATE POLICY "Lab owners can add themselves as admin"
  ON lab_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'admin' AND
    EXISTS (
      SELECT 1 FROM labs 
      WHERE labs.id = lab_members.lab_id 
      AND labs.owner_id = auth.uid()
    )
  );

-- Allow lab admins to manage lab memberships
CREATE POLICY "Lab admins can manage memberships"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members existing_member
      WHERE existing_member.lab_id = lab_members.lab_id
      AND existing_member.user_id = auth.uid()
      AND existing_member.role = 'admin'
    )
  );

-- Allow users to read lab memberships for labs they belong to
CREATE POLICY "Users can read lab memberships"
  ON lab_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members user_membership
      WHERE user_membership.lab_id = lab_members.lab_id
      AND user_membership.user_id = auth.uid()
    )
  );

-- Allow users to remove themselves from labs
CREATE POLICY "Users can remove themselves from labs"
  ON lab_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());