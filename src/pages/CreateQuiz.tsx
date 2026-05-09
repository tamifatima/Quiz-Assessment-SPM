import { useNavigate, useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import {
  Sparkles,
  RefreshCw,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  CheckCircle2,
  Circle,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const CreateQuiz: React.FC = () => {
  const { profile, clientId } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [topicText, setTopicText] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      loadQuiz();
    }
  }, [id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      // Fetch quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (quizError) throw quizError;
      
      setTitle(quiz.title);
      setTopicText(quiz.topic_text);
      setIsPublished(quiz.is_published);

      // Fetch questions
      const { data: qData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('id', { ascending: true });

      if (qError) throw qError;

      setQuestions(qData.map((q: any) => ({
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      })));
    } catch (err: any) {
      toast.error('Failed to load quiz: ' + err.message);
      navigate('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    if (!topicText.trim()) {
      toast.error('Please enter some topic text first.');
      return;
    }
    setGenerating(true);
    setQuestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topicText },
      });

      if (error) {
        // Supabase functions.invoke returns error as a FunctionsError object
        console.error('Edge Function Error:', error);
        throw new Error(error.message || 'The AI service returned an error.');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error('Unexpected response format from AI.');
      }

      setQuestions(data.questions);
      setExpandedIdx(0);
      toast.success(`${data.questions.length} questions generated!`);
    } catch (err: any) {
      console.error('Generation Error:', err);
      toast.error(err.message || 'Failed to generate questions.');
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestion = (idx: number, field: keyof GeneratedQuestion, value: string | string[]) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const opts = [...q.options];
        opts[optIdx] = value;
        return { ...q, options: opts };
      })
    );
  };

  const saveQuiz = async () => {
    if (!title.trim()) { toast.error('Please enter a quiz title.'); return; }
    if (questions.length === 0) { toast.error('No questions to save.'); return; }
    if (!clientId) { toast.error('Not authenticated.'); return; }

    setSaving(true);
    try {
      let quizId = id;

      if (id) {
        // Update existing quiz
        const { error: quizError } = await supabase
          .from('quizzes')
          .update({
            title: title.trim(),
            topic_text: topicText.trim(),
            is_published: isPublished,
          })
          .eq('id', id);

        if (quizError) throw quizError;

        // Delete old questions and insert new ones (simpler than syncing)
        const { error: delError } = await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', id);

        if (delError) throw delError;
      } else {
        // Insert new quiz
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            teacher_id: clientId,
            title: title.trim(),
            topic_text: topicText.trim(),
            is_published: isPublished,
          })
          .select('id')
          .single();

        if (quizError) throw quizError;
        quizId = quiz.id;
      }

      // Insert questions
      const questionsPayload = questions.map((q) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));

      const { error: qError } = await supabase.from('questions').insert(questionsPayload);
      if (qError) throw qError;

      toast.success(id ? 'Quiz updated!' : 'Quiz saved successfully!');
      navigate('/teacher/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  };

  const hasQuestions = questions.length > 0;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{id ? 'Edit Quiz' : 'Create AI Quiz'}</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {id ? 'Modify your quiz settings and questions.' : 'Paste any text and let AI generate questions for you.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setIsPublished(!isPublished)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isPublished 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isPublished ? 'Published' : 'Draft'}
          </button>
        </div>
      </div>

      {/* Quiz Title */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-sm`}>
        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Quiz Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to Machine Learning"
          className={`w-full text-lg font-semibold rounded-xl px-4 py-3 outline-none border-2 transition-colors ${
            isDark
              ? 'bg-[#1e293b] border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500'
              : 'bg-gray-50 border-transparent text-gray-900 placeholder:text-gray-400 focus:border-indigo-400'
          }`}
        />
      </div>

      {/* Topic Text + Generate - Only show for NEW quizzes */}
      {!id && (
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'} shadow-sm space-y-4`}>
          <div>
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Topic Text
            </label>
            <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Paste a paragraph, article, or notes. The AI will generate 5 MCQs from it.
            </p>
            <textarea
              value={topicText}
              onChange={(e) => setTopicText(e.target.value)}
              rows={8}
              placeholder="Paste your topic text here... e.g. 'Machine learning is a subset of artificial intelligence that enables computers to learn from data without being explicitly programmed. There are three main types: supervised learning, unsupervised learning, and reinforcement learning...'"
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition-colors resize-none leading-relaxed ${
                isDark
                  ? 'bg-[#1e293b] border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500'
                  : 'bg-gray-50 border-transparent text-gray-900 placeholder:text-gray-400 focus:border-indigo-400'
              }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={generateQuestions}
              disabled={generating || !topicText.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
            >
              {generating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Generating questions...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {hasQuestions ? 'Regenerate Questions' : 'Generate Questions'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Questions */}
      <AnimatePresence>
        {hasQuestions && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Generated Questions
                <span className={`ml-2 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  ({questions.length})
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Click to expand and edit</p>
            </div>

            {questions.map((q, idx) => (
              <motion.div
                key={idx}
                layout
                className={`rounded-2xl border overflow-hidden transition-shadow ${
                  isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'
                } ${expandedIdx === idx ? 'shadow-md' : 'shadow-sm'}`}
              >
                {/* Question header */}
                <button
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                    isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {q.question_text}
                    </p>
                  </div>
                  {expandedIdx === idx ? <ChevronUp size={16} className="shrink-0 text-gray-400 ml-2" /> : <ChevronDown size={16} className="shrink-0 text-gray-400 ml-2" />}
                </button>

                {/* Expanded editor */}
                <AnimatePresence>
                  {expandedIdx === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
                    >
                      <div className="p-5 space-y-4">
                        {/* Question text */}
                        <div>
                          <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Question</label>
                          <textarea
                            value={q.question_text}
                            onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                            rows={2}
                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors resize-none ${
                              isDark ? 'bg-[#1e293b] border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-400'
                            }`}
                          />
                        </div>

                        {/* Options */}
                        <div>
                          <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Options</label>
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = opt === q.correct_answer;
                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(idx, 'correct_answer', opt)}
                                    className={`shrink-0 transition-colors ${isCorrect ? 'text-emerald-500' : isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}
                                    title="Set as correct answer"
                                  >
                                    {isCorrect ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                  </button>
                                  <input
                                    value={opt}
                                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                    className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none border transition-colors ${
                                      isCorrect
                                        ? isDark ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                        : isDark ? 'bg-[#1e293b] border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-400'
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            Click the circle icon to mark an option as the correct answer.
                          </p>
                        </div>

                        {/* Explanation */}
                        <div>
                          <label className={`text-xs font-bold uppercase tracking-wider mb-1.5 block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Explanation</label>
                          <textarea
                            value={q.explanation}
                            onChange={(e) => updateQuestion(idx, 'explanation', e.target.value)}
                            rows={2}
                            className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none border transition-colors resize-none ${
                              isDark ? 'bg-[#1e293b] border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-400'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {!id && (
                <>
                  <button
                    onClick={() => { setQuestions([]); setExpandedIdx(null); }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Trash2 size={16} />
                    Discard
                  </button>
                  <button
                    onClick={generateQuestions}
                    disabled={generating}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                      isDark ? 'bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                </>
              )}
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1f2937] hover:bg-[#374151] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Quiz</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      {!hasQuestions && !generating && (
        <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <BookOpen size={40} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Paste your topic text above and click "Generate Questions"
          </p>
        </div>
      )}
    </div>
  );
};

export default CreateQuiz;
