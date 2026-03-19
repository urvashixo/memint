/*
  # Add display columns to invitations table

  1. Changes
    - Add `lab_name` column to store the lab name directly
    - Add `invited_by_name` column to store the inviter's name directly
    - Update existing invitations with current lab and user names
    - Add indexes for better performance

  2. Security
    - No RLS changes needed as we're just adding display columns
*/

-- Add new columns to invitations table
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS lab_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS invited_by_name text DEFAULT '';

-- Update existing invitations with lab names
UPDATE invitations 
SET lab_name = labs.name
FROM labs 
WHERE invitations.lab_id = labs.id;

-- Update existing invitations with inviter names
UPDATE invitations 
SET invited_by_name = users.name
FROM users 
WHERE invitations.invited_by = users.id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_lab_name ON invitations(lab_name);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by_name ON invitations(invited_by_name);

-- Set NOT NULL constraints after updating existing data
ALTER TABLE invitations 
ALTER COLUMN lab_name SET NOT NULL,
ALTER COLUMN invited_by_name SET NOT NULL;