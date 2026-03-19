/*
  # Fix storage bucket for reports

  1. Storage Setup
    - Create reports storage bucket with proper configuration
    - Set up storage policies for authenticated users
    - Allow lab members to upload and download files

  2. Security
    - Only authenticated users can upload files
    - Only lab members can access files from their labs
    - Files are organized by lab_id for better security
*/

-- Create the reports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports', 
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[];

-- Create storage policies for the reports bucket

-- Allow authenticated users to upload files to their lab folders
CREATE POLICY "Lab members can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[1] OR
  EXISTS (
    SELECT 1 FROM lab_members
    WHERE lab_members.lab_id::text = (storage.foldername(name))[1]
    AND lab_members.user_id = auth.uid()
  )
);

-- Allow lab members to view/download files from their labs
CREATE POLICY "Lab members can view reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM lab_members
    WHERE lab_members.lab_id::text = (storage.foldername(name))[1]
    AND lab_members.user_id = auth.uid()
  )
);

-- Allow file creators to delete their files
CREATE POLICY "Users can delete their own reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow lab admins to delete any files in their labs
CREATE POLICY "Lab admins can delete lab reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM lab_members
    WHERE lab_members.lab_id::text = (storage.foldername(name))[1]
    AND lab_members.user_id = auth.uid()
    AND lab_members.role = 'admin'
  )
);