/*
  # Update task list deletion policies for admin permissions

  1. Changes
    - Drop existing task list deletion policy
    - Create new policy that allows both creators and lab admins to delete task lists
    - Lab admins can delete any task list in their lab
    - Regular users can only delete task lists they created

  2. Security
    - Maintains proper access control
    - Prevents unauthorized deletions
    - Gives lab administrators full management capabilities
*/

-- Drop existing task list deletion policy
DROP POLICY IF EXISTS "Task list creators can delete their lists" ON task_lists;

-- Create new policy that allows both creators and lab admins to delete task lists
CREATE POLICY "Task list creators and lab admins can delete lists"
  ON task_lists
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = task_lists.lab_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );