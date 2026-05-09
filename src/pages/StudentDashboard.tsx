import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PlayCircle, Award, CheckCircle, RefreshCw, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface Quiz {
  id: string;
  title: string;
  topic_text: string;
  is_completed?: boolean;
  score?: number | null;
}

export default function StudentDashboard() {
  const { profile, clientId } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      // Fetch published quizzes
      const { data: publishedQuizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, topic_text')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (quizError) throw quizError;

      // Fetch user submissions to check for completion
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('quiz_id, score')
        .eq('student_id', clientId);

      if (subError) throw subError;

      const submissionMap = new Map(submissions.map(s => [s.quiz_id, s.score]));

      const mappedQuizzes = publishedQuizzes.map((q: any) => ({
        ...q,
        is_completed: submissionMap.has(q.id),
        score: submissionMap.get(q.id) ?? null
      }));

      setQuizzes(mappedQuizzes);
    } catch (error: any) {
      console.error('Error fetching student dashboard data:', error.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchQuizzes();
    // Refresh when user returns to tab
    window.addEventListener('focus', fetchQuizzes);
    return () => window.removeEventListener('focus', fetchQuizzes);
  }, [fetchQuizzes]);

  if (loading && quizzes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Available Quizzes</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Select a quiz to start learning or review your previous results.
          </p>
        </div>
        <button 
          onClick={fetchQuizzes}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className={`flex flex-col p-6 rounded-2xl border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                {quiz.is_completed ? <Award size={20} /> : <PlayCircle size={20} />}
              </div>
              {quiz.is_completed && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle size={12} />
                  Completed
                </span>
              )}
            </div>
            
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{quiz.title}</h3>
            <p className={`text-sm mb-6 flex-1 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{quiz.topic_text}</p>

            {quiz.is_completed ? (
              <div className="mt-auto">
                <div className={`flex justify-between items-center p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'} mb-3`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Your Score</span>
                  <span className={`text-lg font-bold ${quiz.score !== null && quiz.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {quiz.score}%
                  </span>
                </div>
                <button 
                  onClick={() => navigate(`/quiz/${quiz.id}?review=true`)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Review Answers
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate(`/quiz/${quiz.id}`)}
                className="w-full mt-auto flex justify-center items-center gap-2 bg-[#1f2937] hover:bg-[#374151] text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                <PlayCircle size={18} />
                Start Quiz
              </button>
            )}
          </div>
        ))}

        {quizzes.length === 0 && !loading && (
          <div className={`col-span-full py-16 text-center rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <BookOpen size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No quizzes available</h3>
            <p className={`text-sm max-w-sm mx-auto ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Check back later! Your teachers haven't published any quizzes yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
