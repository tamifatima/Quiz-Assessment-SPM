import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { ThemeProvider } from './context/ThemeContext';

// New Pages
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import QuizView from './pages/QuizView';
import CreateQuiz from './pages/CreateQuiz';

const RequireRole: React.FC<{ role: 'teacher' | 'student'; children: React.ReactNode }> = ({ role, children }) => {
  const { loading, clientId, role: currentRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen app-surface grid place-items-center p-6">
        <div className="bg-white border border-gray-100 rounded-3xl px-8 py-6 shadow-xl shadow-black/5 text-center">
          <div className="w-8 h-8 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1f2937]">Loading...</p>
        </div>
      </div>
    );
  }

  if (clientId && !currentRole) {
    return (
      <div className="min-h-screen app-surface grid place-items-center p-6">
        <div className="bg-white border border-gray-100 rounded-3xl px-8 py-6 shadow-xl shadow-black/5 text-center">
          <div className="w-8 h-8 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1f2937]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return <Navigate to="/login" replace />;
  }

  if (currentRole !== role) {
    return <Navigate to={currentRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }

  return <>{children}</>;
};

const AuthRedirect: React.FC = () => {
  const { loading, clientId, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen app-surface grid place-items-center p-6">
        <div className="bg-white border border-gray-100 rounded-3xl px-8 py-6 shadow-xl shadow-black/5 text-center">
          <div className="w-8 h-8 border-4 border-[#1f2937] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1f2937]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clientId) return <Navigate to="/login" replace />;
  if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route element={<Layout />}>
              <Route
                path="/"
                element={<AuthRedirect />}
              />
              
              <Route
                path="/teacher/dashboard"
                element={
                  <RequireRole role="teacher">
                    <TeacherDashboard />
                  </RequireRole>
                }
              />

              <Route
                path="/student/dashboard"
                element={
                  <RequireRole role="student">
                    <StudentDashboard />
                  </RequireRole>
                }
              />

              <Route
                path="/teacher/create-quiz"
                element={
                  <RequireRole role="teacher">
                    <CreateQuiz />
                  </RequireRole>
                }
              />

              <Route
                path="/teacher/edit-quiz/:id"
                element={
                  <RequireRole role="teacher">
                    <CreateQuiz />
                  </RequireRole>
                }
              />

            </Route>

            <Route
              path="/quiz/:id"
              element={<QuizView />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
