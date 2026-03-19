/*
  # Add RLS policies for labs table

  1. Security
    - Add INSERT policy for authenticated users to create labs (owner_id must match auth.uid())
    - Add SELECT policy for lab owners and members to read labs
    - Add UPDATE policy for lab owners to update their labs
    - Add DELETE policy for lab owners to delete their labs

  2. Changes
    - Enable comprehensive CRUD operations for labs table with proper security
    - Lab owners can manage their labs
    - Lab members can view labs they belong to
*/

-- Allow authenticated users to create labs (they must be the owner)
CREATE POLICY "Users can create labs as owner"
  ON labs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Allow lab owners and members to read labs
CREATE POLICY "Lab owners and members can read labs"
  ON labs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = labs.id
      AND lab_members.user_id = auth.uid()
    )
  );

-- Allow lab owners to update their labs
CREATE POLICY "Lab owners can update their labs"
  ON labs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Allow lab owners to delete their labs
CREATE POLICY "Lab owners can delete their labs"
  ON labs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);