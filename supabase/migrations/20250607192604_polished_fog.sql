/*
  # Fix lab creation trigger to include member name

  1. Updates
    - Update the trigger function to include member_name when adding lab owner as admin
    - Ensures the lab owner's name is properly set in lab_members table

  2. Security
    - Maintains the existing trigger functionality
    - Ensures proper data consistency
*/

-- Update the trigger function to include member_name
CREATE OR REPLACE FUNCTION add_lab_owner_as_admin()
RETURNS TRIGGER AS $$
DECLARE
  owner_name text;
BEGIN
  -- Get the owner's name from the users table
  SELECT name INTO owner_name
  FROM users
  WHERE id = NEW.owner_id;
  
  -- If no name found, use email as fallback
  IF owner_name IS NULL OR owner_name = '' THEN
    SELECT email INTO owner_name
    FROM users
    WHERE id = NEW.owner_id;
  END IF;
  
  -- Insert the lab owner as an admin member with their name
  INSERT INTO lab_members (user_id, lab_id, role, member_name)
  VALUES (NEW.owner_id, NEW.id, 'admin', COALESCE(owner_name, 'Lab Owner'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;