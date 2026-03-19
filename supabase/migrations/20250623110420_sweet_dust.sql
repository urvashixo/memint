/*
  # Add file_url column to reports table

  1. Changes
    - Add file_url column to store the URL of uploaded report files
    - Update existing reports to have empty file_url (nullable)

  2. Security
    - No RLS changes needed as reports table already has proper policies
*/

-- Add file_url column to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS file_url text;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_reports_file_url ON reports(file_url);