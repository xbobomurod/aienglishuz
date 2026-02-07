-- Add new notification preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN practice_reminder_enabled boolean DEFAULT true,
ADD COLUMN milestone_alerts_enabled boolean DEFAULT true;