-- ==========================================
-- 1. CUSTOM TYPES
-- ==========================================
-- Enforce strict roles so you don't have random strings in your DB
CREATE TYPE user_role AS ENUM ('teacher', 'student');

-- ==========================================
-- 2. PROFILES (Extends Supabase Auth)
-- ==========================================
-- Supabase handles login in `auth.users`, we store app-specific data here.
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'student',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. QUIZZES
-- ==========================================
CREATE TABLE quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  topic_text TEXT NOT NULL, -- The source text you feed to the AI
  is_published BOOLEAN DEFAULT false, -- Hide from students until ready
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. QUESTIONS & ANSWERS
-- ==========================================
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Store as an array of strings: '["Apple", "Banana", "Cherry"]'
  correct_answer TEXT NOT NULL, 
  explanation TEXT, -- RICH FEATURE: Ask AI to explain WHY the answer is correct
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. SUBMISSIONS (The overall attempt)
-- ==========================================
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. STUDENT ANSWERS (Granular tracking)
-- ==========================================
-- RICH FEATURE: Tracks exactly what the student picked so you can show a review screen later.
CREATE TABLE student_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);