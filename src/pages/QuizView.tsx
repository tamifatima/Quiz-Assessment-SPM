import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { ArrowLeft, CheckCircle2, Circle, RefreshCw, Trophy, Eye, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  teacher_id: string;
}

export default function QuizView() {
  const { id } = useParams<{ id: string }>();
  const { isDark } = useTheme();
  const { profile, clientId } = useAuth();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (id) fetchQuiz();
    const params = new URLSearchParams(window.location.search);
    if (params.get('review') === 'true') {
      setShowReview(true);
    }
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('id', { ascending: true });

      if (qError) throw qError;
      setQuestions(qData);

      // If student and reviewing, fetch past submission to restore answers
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === 'true' && !isTeacher && clientId) {
        const { data: subData } = await supabase
          .from('submissions')
          .select('score, answers')
          .eq('quiz_id', id)
          .eq('student_id', clientId)
          .maybeSingle();

        if (subData) {
          if (subData.answers) setAnswers(subData.answers);
          setScore(subData.score || 0);
          setFinished(true);
        }
      }
    } catch (err: any) {
      toast.error('Error loading quiz: ' + err.message);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedAnswer) return;
    
    const newAnswers = { ...answers, [questions[currentIdx].id]: selectedAnswer };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      const nextQId = questions[currentIdx + 1].id;
      setSelectedAnswer(newAnswers[nextQId] || null);
    } else {
      calculateAndSubmit(newAnswers);
    }
  };

  const calculateAndSubmit = async (finalAnswers: Record<string, string>) => {
    let correctCount = 0;
    questions.forEach(q => {
      if (finalAnswers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setFinished(true);

    if (!isTeacher && clientId) {
      try {
        const { error } = await supabase.from('submissions').insert({
          quiz_id: id,
          student_id: clientId,
          score: finalScore,
          total_questions: questions.length,
          answers: finalAnswers
        });
        if (error) throw error;
        toast.success('Quiz submitted!');
      } catch (err: any) {
        console.error('Error submitting:', err);
        toast.error('Failed to save submission: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className={`h-dvh w-screen flex items-center justify-center ${isDark ? 'bg-[#05080e]' : 'bg-[#f4f5f8]'}`}>
        <RefreshCw size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // Teacher Review Screen (Immediate List)
  if (isTeacher && !finished && showReview) {
    return (
      <div className={`h-dvh w-screen overflow-y-auto p-4 md:p-10 ${isDark ? 'bg-[#05080e]' : 'bg-[#f4f5f8]'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Review Questions: {quiz?.title}</h1>
            <button 
              onClick={() => setShowReview(false)}
              className={`px-6 py-2 rounded-xl font-bold text-sm ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Back to Preview
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className={`p-6 rounded-[2rem] border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-100 text-indigo-700`}>
                    {idx + 1}
                  </span>
                  <h3 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{q.question_text}</h3>
                </div>

                <div className="grid grid-cols-1 gap-2 ml-12">
                  {q.options.map((opt) => {
                    const isRightAnswer = opt === q.correct_answer;
                    return (
                      <div key={opt} className={`p-4 rounded-xl border-2 font-medium flex items-center justify-between ${isRightAnswer ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : isDark ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                        <span>{opt}</span>
                        {isRightAnswer && <CheckCircle2 size={18} />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className={`mt-4 ml-12 p-4 rounded-xl text-sm ${isDark ? 'bg-indigo-900/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                    <span className="font-bold block mb-1">Explanation:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (finished && !showReview) {
    return (
      <div className={`h-dvh w-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#05080e]' : 'bg-[#f4f5f8]'}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-full max-w-md p-8 md:p-10 rounded-[2.5rem] border text-center ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-2xl`}
        >
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
            <Trophy size={40} />
          </div>
          <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quiz Completed!</h2>
          <p className={`text-lg font-medium mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isTeacher ? 'Preview results:' : 'You scored'}
          </p>
          
          <div className="text-6xl font-black mb-10 text-indigo-600 tracking-tight">
            {score}%
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowReview(true)}
              className="w-full py-4 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-bold transition-all"
            >
              <Eye size={18} />
              Review Answers
            </button>
            <button
              onClick={() => navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard')}
              className="w-full py-4 bg-[#1f2937] hover:bg-[#374151] text-white rounded-2xl font-bold transition-all shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Student Review Mode
  if (finished && showReview) {
    return (
      <div className={`h-dvh w-screen overflow-y-auto p-4 md:p-10 ${isDark ? 'bg-[#05080e]' : 'bg-[#f4f5f8]'}`}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Review: {quiz?.title}</h1>
            <button 
              onClick={() => setShowReview(false)}
              className={`px-6 py-2 rounded-xl font-bold text-sm ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Back to Score
            </button>
          </div>

          {questions.map((q, idx) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_answer;
            return (
              <div key={q.id} className={`p-6 rounded-[2rem] border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {idx + 1}
                  </span>
                  <h3 className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{q.question_text}</h3>
                </div>

                <div className="grid grid-cols-1 gap-2 ml-12">
                  {q.options.map((opt) => {
                    const isUserPick = opt === userAnswer;
                    const isRightAnswer = opt === q.correct_answer;
                    
                    let statusClass = isDark ? 'border-gray-800 text-gray-400 bg-[#1e293b]' : 'border-gray-200 text-gray-600 bg-white';
                    if (isRightAnswer) statusClass = 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20';
                    else if (isUserPick && !isCorrect) statusClass = 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20';

                    return (
                      <div key={opt} className={`p-4 rounded-xl border-2 font-medium flex items-center justify-between ${statusClass}`}>
                        <span>{opt}</span>
                        {isRightAnswer && <CheckCircle2 size={18} />}
                        {isUserPick && !isCorrect && <XCircle size={18} />}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className={`mt-4 ml-12 p-4 rounded-xl text-sm ${isDark ? 'bg-indigo-900/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                    <span className="font-bold block mb-1">Explanation:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className={`h-dvh w-screen overflow-hidden flex flex-col ${isDark ? 'bg-[#05080e]' : 'bg-[#f4f5f8]'}`}>
      <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <ArrowLeft size={18} />
            Exit {isTeacher ? 'Preview' : 'Quiz'}
          </button>
          
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button 
                onClick={() => setShowReview(true)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-indigo-400 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
              >
                Review All Questions
              </button>
            )}
            {isTeacher && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                Teacher Preview
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-6">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <div className="text-center">
            <h1 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{quiz?.title}</h1>
            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
              <span className="shrink-0">Q {currentIdx + 1} / {questions.length}</span>
              <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-indigo-600"
                />
              </div>
            </div>
          </div>

          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 md:p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-xl shadow-black/5`}
          >
            <h2 className={`text-lg md:text-xl font-bold mb-8 leading-tight text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {question.question_text}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left group ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-4 ring-indigo-500/5' 
                        : isDark 
                          ? 'border-gray-800 bg-[#1e293b] text-gray-300 hover:border-gray-600' 
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <span className="font-bold">{option}</span>
                    {isSelected ? (
                      <CheckCircle2 className="text-indigo-600" size={24} />
                    ) : (
                      <Circle className={`${isDark ? 'text-gray-700' : 'text-gray-300'} group-hover:text-gray-400`} size={24} />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="flex justify-between items-center px-4">
            <button
              onClick={() => {
                if (currentIdx > 0) {
                  setCurrentIdx(prev => prev - 1);
                  const prevQId = questions[currentIdx - 1].id;
                  setSelectedAnswer(answers[prevQId] || null);
                }
              }}
              disabled={currentIdx === 0}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors ${
                currentIdx > 0 
                  ? isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              Previous
            </button>
            
            <button
              disabled={!selectedAnswer}
              onClick={handleNext}
              className={`px-10 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${
                selectedAnswer 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentIdx === questions.length - 1 ? (isTeacher ? 'End Preview' : 'Finish Quiz') : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
