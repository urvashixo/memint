/*
  # Add chat features to existing chat_messages table

  1. Changes
    - Add message_type column with default 'chat'
    - Add mentions column for future @mentions functionality
    - Add check constraint for message_type (with proper error handling)
    - Add indexes for better performance
    - Update RLS policies for chat functionality

  2. Security
    - Only lab members can read and send chat messages
    - Users can only send messages as themselves
*/

-- Add new columns to existing chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'chat' NOT NULL,
ADD COLUMN IF NOT EXISTS mentions jsonb DEFAULT '[]' NOT NULL;

-- Add check constraint for message_type (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_message_type_check' 
    AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages 
    ADD CONSTRAINT chat_messages_message_type_check 
    CHECK (message_type IN ('chat', 'system'));
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentions ON chat_messages USING gin(mentions);

-- Enable RLS if not already enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Lab members can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Lab members can send chat messages" ON chat_messages;

-- Create new policies for chat functionality
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