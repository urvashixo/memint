/*
  # Add member name to lab_members table

  1. Changes
    - Add `member_name` column to `lab_members` table
    - Update existing records with user names
    - Update frontend to use member_name instead of joining with users table

  2. Security
    - No RLS changes needed since lab_members already has RLS disabled
*/

-- Add member_name column to lab_members table
ALTER TABLE lab_members 
ADD COLUMN IF NOT EXISTS member_name text DEFAULT '';

-- Update existing lab_members with user names
UPDATE lab_members 
SET member_name = users.name
FROM users 
WHERE lab_members.user_id = users.id;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_lab_members_member_name ON lab_members(member_name);

-- Set NOT NULL constraint after updating existing data
ALTER TABLE lab_members 
ALTER COLUMN member_name SET NOT NULL;