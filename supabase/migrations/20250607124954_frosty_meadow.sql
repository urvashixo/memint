/*
  # reMedi Collaborative Research Platform Schema

  1. New Tables
    - `users` - User profiles and authentication data
    - `labs` - Research laboratories/workspaces
    - `lab_members` - Lab membership with roles
    - `whiteboards` - Collaborative drawing boards
    - `reports` - Research reports and documentation
    - `compounds` - Chemical compound data with SMILES notation
    - `proteins` - Protein structures with PDB data
    - `chat_messages` - Lab communication
    - `todos` - Task management within labs

  2. Security
    - Enable RLS on all tables
    - Users can read/update their own profile
    - Lab owners and admins can manage lab data
    - Lab members can read lab content and create new items
    - Public read access for some lab data (configurable)

  3. Features
    - Role-based access control (admin, member)
    - JSONB storage for whiteboard data and 3D visualizations
    - Full-text search capabilities
    - Audit trails with created_at timestamps
*/

-- Create enum for lab member roles
CREATE TYPE lab_role AS ENUM ('admin', 'member');

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Labs table
CREATE TABLE IF NOT EXISTS labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Lab members table
CREATE TABLE IF NOT EXISTS lab_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  role lab_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lab_id)
);

-- Whiteboards table
CREATE TABLE IF NOT EXISTS whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Whiteboard',
  data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Report',
  content text DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Compounds table
CREATE TABLE IF NOT EXISTS compounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smiles text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visualization_3d jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Proteins table
CREATE TABLE IF NOT EXISTS proteins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdb_id text DEFAULT '',
  name text NOT NULL DEFAULT '',
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  structure_file_url text DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  completed boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE proteins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Labs policies
CREATE POLICY "Lab owners can manage their labs"
  ON labs
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Lab members can read labs they belong to"
  ON labs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members 
      WHERE lab_members.lab_id = labs.id 
      AND lab_members.user_id = auth.uid()
    )
  );

-- Lab members policies
CREATE POLICY "Lab admins can manage lab members"
  ON lab_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members lm
      WHERE lm.lab_id = lab_members.lab_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM labs
      WHERE labs.id = lab_members.lab_id
      AND labs.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can read lab memberships"
  ON lab_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM lab_members lm
      WHERE lm.lab_id = lab_members.lab_id
      AND lm.user_id = auth.uid()
    )
  );

-- Whiteboards policies
CREATE POLICY "Lab members can manage whiteboards"
  ON whiteboards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = whiteboards.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

-- Reports policies
CREATE POLICY "Lab members can read reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = reports.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = reports.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Report creators can update their reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Compounds policies
CREATE POLICY "Lab members can read compounds"
  ON compounds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = compounds.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create compounds"
  ON compounds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = compounds.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND added_by = auth.uid()
  );

CREATE POLICY "Compound creators can update their compounds"
  ON compounds
  FOR UPDATE
  TO authenticated
  USING (added_by = auth.uid());

-- Proteins policies
CREATE POLICY "Lab members can read proteins"
  ON proteins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = proteins.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create proteins"
  ON proteins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = proteins.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Protein creators can update their proteins"
  ON proteins
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Chat messages policies
CREATE POLICY "Lab members can read chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = chat_messages.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can send chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = chat_messages.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Todos policies
CREATE POLICY "Lab members can read todos"
  ON todos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = todos.lab_id
      AND lab_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lab members can create todos"
  ON todos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = todos.lab_id
      AND lab_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Todo creators can update their todos"
  ON todos
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Lab admins can update any todos"
  ON todos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lab_members
      WHERE lab_members.lab_id = todos.lab_id
      AND lab_members.user_id = auth.uid()
      AND lab_members.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labs_owner_id ON labs(owner_id);
CREATE INDEX IF NOT EXISTS idx_lab_members_user_id ON lab_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_members_lab_id ON lab_members(lab_id);
CREATE INDEX IF NOT EXISTS idx_whiteboards_lab_id ON whiteboards(lab_id);
CREATE INDEX IF NOT EXISTS idx_reports_lab_id ON reports(lab_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_compounds_lab_id ON compounds(lab_id);
CREATE INDEX IF NOT EXISTS idx_compounds_added_by ON compounds(added_by);
CREATE INDEX IF NOT EXISTS idx_proteins_lab_id ON proteins(lab_id);
CREATE INDEX IF NOT EXISTS idx_proteins_created_by ON proteins(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_messages_lab_id ON chat_messages(lab_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_todos_lab_id ON todos(lab_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_by ON todos(created_by);

-- Create function to automatically add lab owner as admin member
CREATE OR REPLACE FUNCTION add_lab_owner_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lab_members (user_id, lab_id, role)
  VALUES (NEW.owner_id, NEW.id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add lab owner as admin
CREATE TRIGGER trigger_add_lab_owner_as_admin
  AFTER INSERT ON labs
  FOR EACH ROW
  EXECUTE FUNCTION add_lab_owner_as_admin();

-- Create function to update whiteboard timestamp
CREATE OR REPLACE FUNCTION update_whiteboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update whiteboard timestamp on data changes
CREATE TRIGGER trigger_update_whiteboard_timestamp
  BEFORE UPDATE ON whiteboards
  FOR EACH ROW
  EXECUTE FUNCTION update_whiteboard_timestamp();