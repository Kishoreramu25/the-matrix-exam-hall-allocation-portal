-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles for authentication"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Create exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_code TEXT UNIQUE NOT NULL,
  exam_name TEXT NOT NULL,
  total_students INTEGER NOT NULL,
  number_of_halls INTEGER NOT NULL,
  students_per_hall INTEGER NOT NULL,
  bench_rows INTEGER,
  bench_columns INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft'
);

-- Enable RLS on exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Anyone can view published exams"
  ON public.exams FOR SELECT
  USING (true);

CREATE POLICY "Admins can create exams"
  ON public.exams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their own exams"
  ON public.exams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete their own exams"
  ON public.exams FOR DELETE
  USING (auth.uid() = created_by);

-- 3. Create halls table
CREATE TABLE public.halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  hall_name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  location_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on halls
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;

-- Halls policies
CREATE POLICY "Anyone can view halls"
  ON public.halls FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage halls"
  ON public.halls FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = halls.exam_id
      AND exams.created_by = auth.uid()
    )
  );

-- 4. Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  use_shared_seating BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subjects for their exams"
ON public.subjects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = subjects.exam_id
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view subjects"
ON public.subjects FOR SELECT
USING (true);

-- 5. Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments"
ON public.departments FOR SELECT
USING (true);

CREATE POLICY "Admins can create departments"
ON public.departments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Create exam_departments junction table
CREATE TABLE public.exam_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(exam_id, department_id)
);

ALTER TABLE public.exam_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam departments"
ON public.exam_departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_departments.exam_id
    AND exams.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view exam departments"
ON public.exam_departments FOR SELECT
USING (true);

-- 7. Create seat_allocations table
CREATE TABLE public.seat_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  hall_id UUID REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  department_name TEXT,
  student_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  row_number INTEGER,
  column_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on seat_allocations
ALTER TABLE public.seat_allocations ENABLE ROW LEVEL SECURITY;

-- Seat allocations policies
CREATE POLICY "Anyone can view seat allocations"
  ON public.seat_allocations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage seat allocations"
  ON public.seat_allocations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = seat_allocations.exam_id
      AND exams.created_by = auth.uid()
    )
  );

-- 8. Functions and Triggers

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'username', '')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
