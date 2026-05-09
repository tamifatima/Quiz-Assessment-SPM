import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PlusCircle, FileText, Settings, Play, RefreshCw, Trash2, Edit, MoreVertical, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Quiz {
  id: string;
  title: string;
  created_at: string;
  is_published: boolean;
  submissions_count?: number;
}

export default function TeacherDashboard() {
  const { profile, clientId } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Submissions Modal State
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Quiz | null>(null);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    fetchQuizzes();
  }, [clientId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      // Simpler query to avoid join issues if count is weird
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id, 
          title, 
          created_at, 
          is_published
        `)
        .eq('teacher_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch submission counts separately for reliability
      const quizzesWithCounts = await Promise.all(data.map(async (quiz) => {
        const { count } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);
        
        return { ...quiz, submissions_count: count || 0 };
      }));
      
      setQuizzes(quizzesWithCounts);
    } catch (error: any) {
      toast.error('Error fetching quizzes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (quiz: Quiz) => {
    setViewingSubmissionsFor(quiz);
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('score, created_at, profiles:student_id(full_name)')
        .eq('quiz_id', quiz.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizSubmissions(data || []);
    } catch (err: any) {
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz? All questions and submissions will be lost.')) return;
    
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Quiz deleted');
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    } finally {
      setOpenMenuId(null);
    }
  };

  const togglePublish = async (quiz: Quiz) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !quiz.is_published })
        .eq('id', quiz.id);
      
      if (error) throw error;
      
      setQuizzes(prev => prev.map(q => 
        q.id === quiz.id ? { ...q, is_published: !q.is_published } : q
      ));
      toast.success(quiz.is_published ? 'Quiz unpublished' : 'Quiz published!');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setOpenMenuId(null);
    }
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>My Quizzes</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Manage your AI-generated quizzes and track student performance.
          </p>
        </div>
        <button
          onClick={() => navigate('/teacher/create-quiz')}
          className="flex items-center gap-2 bg-[#1f2937] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#374151] transition-colors"
        >
          <PlusCircle size={18} />
          <span>Create New AI Quiz</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className={`p-6 rounded-2xl border flex flex-col relative ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <FileText size={20} />
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${quiz.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {quiz.is_published ? 'Published' : 'Draft'}
                </span>
                
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === quiz.id ? null : quiz.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <MoreVertical size={18} />
                  </button>

                  <AnimatePresence>
                    {openMenuId === quiz.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-20 overflow-hidden ${isDark ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-100'}`}
                        >
                          <button 
                            onClick={() => navigate(`/teacher/edit-quiz/${quiz.id}`)}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <Edit size={16} /> Edit Quiz
                          </button>
                          <button 
                            onClick={() => navigate(`/quiz/${quiz.id}?review=true`)}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <Eye size={16} /> Review Questions
                          </button>
                          <button 
                            onClick={() => togglePublish(quiz)}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            {quiz.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <div className={`h-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                          <button 
                            onClick={() => deleteQuiz(quiz.id)}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-rose-500 transition-colors ${isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'}`}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{quiz.title}</h3>
            
            <div className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {quiz.submissions_count && quiz.submissions_count > 0 ? (
                <button 
                  onClick={() => fetchSubmissions(quiz)}
                  className="font-bold text-indigo-500 hover:text-indigo-600 transition-colors hover:underline"
                >
                  {quiz.submissions_count} Submissions
                </button>
              ) : (
                <p>0 Submissions</p>
              )}
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => navigate(`/quiz/${quiz.id}?review=true`)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isDark 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20' 
                    : 'bg-[#1f2937] hover:bg-[#374151] text-white shadow-lg shadow-black/10'
                }`}
              >
                <Play size={16} />
                Preview
              </button>
            </div>
          </div>
        ))}

        {quizzes.length === 0 && !loading && (
          <div className={`col-span-full py-20 text-center rounded-3xl border-2 border-dashed ${isDark ? 'border-gray-800 bg-[#0f172a]/50' : 'border-gray-200 bg-gray-50/50'}`}>
            <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-400'}`} />
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>No quizzes found</h3>
            <p className={`text-sm max-w-sm mx-auto mb-8 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Quizzes you create will appear here. Start by creating an AI-powered assessment.
            </p>
            <button
              onClick={() => navigate('/teacher/create-quiz')}
              className="inline-flex items-center gap-2 bg-[#1f2937] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#374151] transition-all shadow-lg"
            >
              <PlusCircle size={20} />
              <span>Create Your First Quiz</span>
            </button>
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      <AnimatePresence>
        {viewingSubmissionsFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingSubmissionsFor(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
                isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Submissions
                  </h2>
                  {!loadingSubmissions && quizSubmissions.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1 font-semibold">
                      Average Score: {Math.round(quizSubmissions.reduce((acc, sub) => acc + (sub.score || 0), 0) / quizSubmissions.length)}%
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setViewingSubmissionsFor(null)}
                  className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : quizSubmissions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 font-medium">
                    No submissions yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizSubmissions.map((sub, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-[#1e293b] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div>
                          <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {sub.profiles?.full_name || 'Anonymous Student'}
                          </p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(sub.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className={`text-xl font-black ${
                          sub.score >= 80 ? 'text-emerald-500' : sub.score >= 50 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {sub.score}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
