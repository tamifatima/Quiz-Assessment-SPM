import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, Mail, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

type SignupMode = 'student' | 'teacher';

const Signup: React.FC = () => {
  const [mode, setMode] = useState<SignupMode>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUpWithPassword, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signUpWithPassword({
        email,
        password,
        name,
        role: mode,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Account created! Check your email if confirmation is enabled, then login.');
        navigate('/login');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      toast.error(result.error);
    }
  };

  const isTeacher = mode === 'teacher';
  const accentBg = isTeacher ? 'bg-indigo-500' : 'bg-[#f2a93b]';
  const accentHover = isTeacher ? 'hover:bg-indigo-600' : 'hover:bg-amber-500';
  const accentShadow = isTeacher ? 'shadow-indigo-500/30' : 'shadow-[#f2a93b]/30';

  return (
    <div className="h-dvh w-full overflow-hidden app-surface flex items-center justify-center p-4 md:p-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-gray-100 p-6 md:p-8 rounded-[2.4rem] shadow-xl shadow-black/5 relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="text-2xl font-bold text-[#1f2937] mb-3">QuizAI.</div>
          <h2 className="text-3xl font-bold text-[#1f2937] tracking-tight">Join Us</h2>
          <p className="text-gray-400 mt-1.5 font-medium text-center">
            {isTeacher ? 'Create and manage AI-powered quizzes' : 'Start taking intelligent quizzes today'}
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setMode('student')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === 'student'
                ? 'bg-white text-[#1f2937] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <BookOpen size={15} />
            Student
          </button>
          <button
            type="button"
            onClick={() => setMode('teacher')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              mode === 'teacher'
                ? 'bg-white text-[#1f2937] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <GraduationCap size={15} />
            Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#1f2937] ml-1 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-[#1f2937] placeholder:text-gray-400 focus:outline-none transition-all font-medium"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#1f2937] ml-1 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-[#1f2937] placeholder:text-gray-400 focus:outline-none transition-all font-medium"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-[#1f2937] ml-1 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-[#1f2937] placeholder:text-gray-400 focus:outline-none transition-all font-medium"
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.button
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              type="submit"
              disabled={loading}
              className={`w-full ${accentBg} ${accentHover} ${accentShadow} text-white font-bold py-3.5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create {isTeacher ? 'Teacher' : 'Student'} Account
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </AnimatePresence>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-[#1f2937] font-semibold py-3.5 rounded-2xl transition-all duration-200 inline-flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.21 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.194 6.053 29.362 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.001 13 24 13c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.194 6.053 29.362 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.24 0 10.021-2.009 13.597-5.279l-6.286-5.321C29.225 34.977 26.715 36 24 36c-5.189 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.791 2.237-2.231 4.166-3.992 5.6l.003-.002 6.286 5.321C37.133 38.646 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Sign up with Google
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1f2937] font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
