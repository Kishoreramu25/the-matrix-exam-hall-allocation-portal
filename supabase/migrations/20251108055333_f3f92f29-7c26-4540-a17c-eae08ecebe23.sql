-- Add optional location link column to halls table
ALTER TABLE public.halls 
ADD COLUMN location_link TEXT;