AI Online Quiz & Assessment System

An AI-powered online quiz and assessment platform that automates quiz generation, evaluation, and student feedback through intelligent question generation using Google Gemini AI. The platform provides teacher and student role-based workflows, allowing educators to generate quizzes from topic content and students to receive instant results and explanations.

Developed as a Software Project Management (SPM) Final Project at the University of the Punjab.

My Role — Project Manager & Developer

I contributed to this project as both a Project Manager (SPM 1) and Development Team Member.

Project Management Responsibilities
Project planning and coordination
Sprint execution and progress monitoring
Risk management and mitigation planning
Timeline tracking and milestone management
Team coordination and workload balancing
Development Contributions
Contributed to system development and implementation
Assisted in feature integration and platform functionality
Supported AI-powered assessment workflows
Collaborated on overall system architecture and execution
Core Features
AI-powered quiz generation
Role-based authentication
Quiz creation and management
Instant grading and evaluation
Student feedback with explanations
Cloud deployment on Vercel
Tech Stack

Frontend: React, TypeScript, Tailwind CSS
Backend: Supabase, PostgreSQL
AI: Google Gemini 1.5 Flash
Deployment: Vercel

Outcome

Successfully completed and deployed within a 3.5-week academic sprint, meeting all project objectives and deliverables


# MassCom (Supabase Migration)

This app now uses Supabase for:
- authentication (email/password + Google OAuth)
- templates and media storage (image/video/pdf)
- recipients
- campaign queue
- logs and retry tracking
- admin controls for user activation, limits, and WhatsApp instance assignment
- API key registry for Evolution API access

WhatsApp instance operations run through Evolution API.

## Setup

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` (required for admin management screens)
   - optional fallback vars: `VITE_EVOLUTION_BASE_URL`, `VITE_EVOLUTION_API_KEY`
3. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
4. In Supabase Auth settings:
   - enable Email provider
   - enable Google provider
   - set redirect URL to your app URL (e.g. `http://localhost:3000`)
5. Run app:
   `npm run dev`
