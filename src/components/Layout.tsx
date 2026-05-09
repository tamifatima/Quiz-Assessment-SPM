import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu } from 'lucide-react';

const Layout: React.FC = () => {
  const { clientId, loading } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const syncIntent = new URLSearchParams(location.search).get('sync');
    if (syncIntent !== 'google') return;
    navigate('/recipients?sync=google', { replace: true });
  }, [location.search, navigate]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSidebarOpen]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [mobileSidebarOpen]);

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

  if (!clientId) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`h-dvh overflow-hidden flex p-2 md:p-4 transition-colors ${isDark ? 'bg-[#05080e] text-slate-100' : 'app-surface text-[#1f2937]'}`}>
      <div className="hidden md:block">
        <Sidebar mode="desktop" />
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/35"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu"
        >
          <div className="relative z-10 inline-block" onClick={(e) => e.stopPropagation()}>
            <Sidebar mode="mobile" onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-64 transition-all duration-200">
        <div className={`relative h-full rounded-[1.8rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col ${isDark ? 'bg-[#0b1220]/70 border-white/5' : 'bg-[#f4f5f8] md:border-[8px] border-[#f4f5f8]'}`}>
          <div className="md:hidden flex items-center gap-3 px-4 pt-4 pb-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-white border border-gray-200 text-[#1f2937]"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <p className="text-sm font-bold text-[#1f2937]">QuizAI.</p>
          </div>

          <div className={`flex-1 overflow-y-auto p-4 md:p-10 md:pt-10 relative min-h-0 ${isDark ? 'bg-[#0f172a]/40' : 'bg-transparent'}`}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
