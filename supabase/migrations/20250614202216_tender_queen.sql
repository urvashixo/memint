/*
  # Add reports table policy and storage bucket

  1. Security Changes
    - Add INSERT policy for reports table to allow lab members to create reports
    - Create reports storage bucket for file uploads

  2. Notes
    - Storage policies need to be configured through Supabase dashboard
    - This migration only handles what can be done via SQL migrations
*/

-- Add INSERT policy for reports table
CREATE POLICY "Lab members can create reports in their labs"
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

-- Create the reports storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
) ON CONFLICT (id) DO NOTHING;