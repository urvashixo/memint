/*
  # Task Management System for Labs

  1. New Tables
    - `task_lists` - Todo lists within labs
    - `tasks` - Individual tasks within lists
    - `task_assignments` - User assignments to tasks
    - `task_activities` - Activity log for notifications

  2. Security
    - Enable RLS on all new tables
    - Lab members can create and manage task lists
    - Task creators and assignees can update tasks
    - Lab members can view all tasks in their lab

  3. Features
    - Task lists with colors and descriptions
    - Individual tasks with completion status
    - "On It" status for active work
    - User assignments and activity tracking
    - Real-time notifications
*/

-- Create task_lists table
CREATE TABLE IF NOT EXISTS task_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled List',
  description text DEFAULT '',
  color text NOT NULL DEFAULT '#3B82F6',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_list_id uuid NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  completed boolean DEFAULT false,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  on_it_by uuid REFERENCES users(id) ON DELETE SET NULL,
  on_it_at timestamptz,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamptz
);

-- Create task_activities table for notifications
CREATE TABLE IF NOT EXISTS task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('created', 'assigned', 'completed', 'on_it', 'updated')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_by jsonb DEFAULT '[]'
);

-- Enable RLS
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Task Lists Policies
CREATE POLICY "Lab members can read task lists"
  ON task_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = task_lists.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create task lists"
  ON task_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = task_lists.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Task list creators can update their lists"
  ON task_lists
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Task list creators can delete their lists"
  ON task_lists
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Tasks Policies
CREATE POLICY "Lab members can read tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_lists
      JOIN lab_members ON lab_members.lab_id = task_lists.lab_id
      WHERE task_lists.id = tasks.task_list_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_lists
      JOIN lab_members ON lab_members.lab_id = task_lists.lab_id
      WHERE task_lists.id = tasks.task_list_id
      AND lab_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Task creators and assignees can update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM task_lists
      JOIN lab_members ON lab_members.lab_id = task_lists.lab_id
      WHERE task_lists.id = tasks.task_list_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );

CREATE POLICY "Task creators can delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Task Activities Policies
CREATE POLICY "Lab members can read task activities"
  ON task_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = task_activities.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create task activities"
  ON task_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = task_activities.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_lists_lab_id ON task_lists(lab_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_created_by ON task_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_task_list_id ON tasks(task_list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_task_activities_lab_id ON task_activities(lab_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at);

-- Create function to update task timestamp
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_task_lists_timestamp
  BEFORE UPDATE ON task_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();

CREATE TRIGGER trigger_update_tasks_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_timestamp();

-- Create function to log task activities
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  lab_uuid uuid;
  activity_msg text;
  user_name text;
BEGIN
  -- Get lab_id from task_lists
  SELECT task_lists.lab_id INTO lab_uuid
  FROM task_lists
  WHERE task_lists.id = NEW.task_list_id;

  -- Get user name
  SELECT name INTO user_name
  FROM users
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    activity_msg := user_name || ' created task "' || NEW.title || '"';
    
    INSERT INTO task_activities (task_id, lab_id, user_id, activity_type, message)
    VALUES (NEW.id, lab_uuid, auth.uid(), 'created', activity_msg);
    
    -- If task is assigned to someone else, create assignment activity
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != auth.uid() THEN
      SELECT name INTO user_name FROM users WHERE id = NEW.assigned_to;
      activity_msg := 'Task "' || NEW.title || '" was assigned to ' || user_name;
      
      INSERT INTO task_activities (task_id, lab_id, user_id, activity_type, message)
      VALUES (NEW.id, lab_uuid, auth.uid(), 'assigned', activity_msg);
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for completion
    IF OLD.completed = false AND NEW.completed = true THEN
      SELECT name INTO user_name FROM users WHERE id = NEW.completed_by;
      activity_msg := user_name || ' completed task "' || NEW.title || '"';
      
      INSERT INTO task_activities (task_id, lab_id, user_id, activity_type, message)
      VALUES (NEW.id, lab_uuid, NEW.completed_by, 'completed', activity_msg);
    END IF;
    
    -- Check for "on it" status
    IF OLD.on_it_by IS NULL AND NEW.on_it_by IS NOT NULL THEN
      SELECT name INTO user_name FROM users WHERE id = NEW.on_it_by;
      activity_msg := user_name || ' is working on task "' || NEW.title || '"';
      
      INSERT INTO task_activities (task_id, lab_id, user_id, activity_type, message)
      VALUES (NEW.id, lab_uuid, NEW.on_it_by, 'on_it', activity_msg);
    END IF;
    
    -- Check for assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      SELECT name INTO user_name FROM users WHERE id = NEW.assigned_to;
      activity_msg := 'Task "' || NEW.title || '" was assigned to ' || user_name;
      
      INSERT INTO task_activities (task_id, lab_id, user_id, activity_type, message)
      VALUES (NEW.id, lab_uuid, auth.uid(), 'assigned', activity_msg);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task activities
CREATE TRIGGER trigger_log_task_activity
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();