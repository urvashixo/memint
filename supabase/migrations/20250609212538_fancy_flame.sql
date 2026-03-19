/*
  # Update task deletion policies for admin permissions

  1. Changes
    - Drop existing task deletion policy
    - Create new policy that allows:
      - Task creators to delete their own tasks
      - Lab admins to delete any task in their lab
    
  2. Security
    - Maintains creator ownership for regular users
    - Gives admins full task management capabilities
    - Prevents unauthorized deletions
*/

-- Drop existing task deletion policy
DROP POLICY IF EXISTS "Task creators can delete tasks" ON tasks;

-- Create new policy that allows both creators and admins to delete tasks
CREATE POLICY "Task creators and lab admins can delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM task_lists
      JOIN lab_members ON lab_members.lab_id = task_lists.lab_id
      WHERE task_lists.id = tasks.task_list_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );