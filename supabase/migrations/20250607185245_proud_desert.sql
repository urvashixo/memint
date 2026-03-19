/*
  # Create invitations table for lab invitations

  1. New Tables
    - `invitations`
      - `id` (uuid, primary key)
      - `lab_id` (uuid, foreign key to labs)
      - `invited_email` (text, email of invited user)
      - `invited_by` (uuid, foreign key to users who sent invitation)
      - `status` (enum: pending, accepted, rejected)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)

  2. Security
    - Enable RLS on invitations table
    - Lab admins can create invitations
    - Invited users can read their own invitations
    - Lab admins can read invitations for their labs

  3. Features
    - Invitations expire after 7 days
    - Email-based invitations
    - Status tracking
*/

-- Create enum for invitation status
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE(lab_id, invited_email, status) -- Prevent duplicate pending invitations
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Lab admins can create invitations
CREATE POLICY "Lab admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = invitations.lab_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );

-- Users can read invitations sent to their email
CREATE POLICY "Users can read their invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- Lab admins can read invitations for their labs
CREATE POLICY "Lab admins can read lab invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = invitations.lab_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );

-- Users can update invitations sent to their email (to accept/reject)
CREATE POLICY "Users can update their invitations"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    invited_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invited_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_lab_id ON invitations(lab_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_email ON invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);