/*
  # Fix RLS policies for invitation acceptance

  1. Problem
    - Users cannot insert themselves into lab_members when accepting invitations
    - Current policies don't allow regular users to add themselves as members

  2. Solution
    - Add policy to allow users to insert themselves as members when they have a valid accepted invitation
    - Ensure the invitation exists and is being accepted by the right user

  3. Security
    - Only allows insertion if there's a valid invitation for that user's email
    - Prevents unauthorized additions to labs
*/

-- Add policy to allow users to add themselves as members when accepting invitations
CREATE POLICY "Users can add themselves when accepting invitations"
  ON lab_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'member' AND
    EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.lab_id = lab_members.lab_id
      AND invitations.invited_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
      AND invitations.status = 'pending'
      AND invitations.expires_at > now()
    )
  );