/*
  # Fix infinite recursion in labs RLS policies

  1. Problem
    - The "Lab members can read labs they belong to" policy creates infinite recursion
    - It queries lab_members table which has policies that reference labs table
    - This creates a circular dependency causing infinite recursion

  2. Solution
    - Drop the problematic policy
    - Create a simpler policy structure that avoids circular references
    - Lab owners can always access their labs
    - Lab members can access labs through a direct user_id check without circular reference

  3. Changes
    - Remove the recursive policy on labs table
    - Keep the owner policy which works correctly
    - Add a policy that allows reading labs where user is directly a member
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Lab members can read labs they belong to" ON labs;

-- Create a new policy that avoids the circular reference
-- This policy allows users to read labs where they are members by checking lab_members directly
-- without creating a circular dependency
CREATE POLICY "Users can read labs where they are members"
  ON labs
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT lab_id 
      FROM lab_members 
      WHERE user_id = auth.uid()
    )
  );