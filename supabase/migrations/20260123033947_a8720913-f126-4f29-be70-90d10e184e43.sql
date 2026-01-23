-- Add email preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_report_sent_at timestamp with time zone;

-- Create index for efficient querying of users who need reports
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_report ON public.profiles(weekly_report_enabled, last_report_sent_at);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;