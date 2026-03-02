-- Create global_settings table for dynamic configurations
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view global settings"
ON public.global_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage global settings"
ON public.global_settings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Insert default results URL
INSERT INTO public.global_settings (key, value)
VALUES ('results_url', 'https://erode-sengunthar.ac.in/dec25results')
ON CONFLICT (key) DO NOTHING;
