-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  use_shared_seating BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_departments junction table
CREATE TABLE public.exam_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, department_id)
);

-- Add columns to exams table for bench configuration
ALTER TABLE public.exams 
ADD COLUMN bench_rows INTEGER,
ADD COLUMN bench_columns INTEGER;

-- Add columns to seat_allocations for subject and department
ALTER TABLE public.seat_allocations
ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
ADD COLUMN department_name TEXT;

-- Enable RLS on new tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects
CREATE POLICY "Admins can manage subjects for their exams"
ON public.subjects
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = subjects.exam_id
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view subjects"
ON public.subjects
FOR SELECT
USING (true);

-- RLS Policies for departments
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
USING (true);

CREATE POLICY "Admins can create departments"
ON public.departments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for exam_departments
CREATE POLICY "Admins can manage exam departments"
ON public.exam_departments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_departments.exam_id
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view exam departments"
ON public.exam_departments
FOR SELECT
USING (true);