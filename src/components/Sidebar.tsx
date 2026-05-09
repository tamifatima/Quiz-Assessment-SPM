import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, 
  PlusCircle,
  Library,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

type SidebarProps = {
  mode?: 'desktop' | 'mobile';
  onClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ mode = 'desktop', onClose }) => {
  const { logout, email, isTeacher, profile, refreshProfile } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [profileName, setProfileName] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState('');
  const [savingProfile, setSavingProfile] = React.useState(false);

  const avatarChoices = React.useMemo(() => {
    const base = profile?.id || email || 'user';
    return [1, 2, 3, 4, 5, 6].map(
      (index) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`${base}-${index}`)}`,
    );
  }, [profile?.id, email]);

  const currentAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || email || 'user'}`;

  const isMobile = mode === 'mobile';

  const menuItems = isTeacher
    ? [
        { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'My Quizzes' },
        { to: '/teacher/create-quiz', icon: PlusCircle, label: 'Create AI Quiz' },
      ]
    : [
        { to: '/student/dashboard', icon: Library, label: 'Available Quizzes' },
      ];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    if (mode === 'mobile') onClose?.();
    navigate('/login', { replace: true });
    logout().catch(() => {
      toast.error('Sign out failed. Please try again.');
    });
  };

  const openProfileModal = () => {
    setProfileName(profile?.full_name || '');
    setAvatarUrl(avatarChoices[0]);
    setProfileModalOpen(true);
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profileName })
        .eq('id', profile.id);

      if (error) {
        toast.error(error.message || 'Failed to update profile');
        return;
      }

      await refreshProfile();
      toast.success('Profile updated');
      setProfileModalOpen(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
    <div
      className={`${isMobile ? 'w-[82vw] max-w-72 h-dvh' : 'w-64 h-screen fixed left-0 top-0 z-[70]'} flex flex-col p-6 transition-all duration-200 ${isDark ? 'text-slate-100 bg-[#060b13]' : 'text-[#8b8e98] bg-[#f4f5f8]'}`}
    >
      {isMobile && (
        <div className="flex items-center justify-between mb-3">
          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#1f2937]'}`}>Menu</p>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
            <X size={16} />
          </button>
        </div>
      )}

      <button onClick={openProfileModal} className="h-14 flex items-center gap-3 px-2 mb-4 mt-1 text-left hover:opacity-90 transition-opacity">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm border-white bg-white">
          <img 
            src={currentAvatar}
            alt="User" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className={`text-[13px] font-bold truncate w-32 ${isDark ? 'text-white' : 'text-[#1f2937]'}`}>{profile?.full_name || email || 'User'}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {isTeacher ? 'Teacher' : 'Student'}
          </p>
        </div>
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar mt-2">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (isMobile) onClose?.();
              }}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group
                ${isActive
                  ? (isDark ? 'bg-white text-black shadow-sm' : 'bg-white text-[#111] shadow-[0_2px_8px_rgba(0,0,0,0.05)] font-semibold')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-[#111] font-medium')}
              `}
            >
              <div className="flex items-center w-full gap-4">
                <item.icon size={18} className="opacity-70" />
                <span className="text-[13px] tracking-wide">{item.label}</span>
              </div>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="pt-3 mt-auto">
        <button 
          onClick={(e) => { e.preventDefault(); handleLogout(); }}
          disabled={loggingOut}
          type="button"
          className="flex w-fit items-center gap-3 px-4 py-2 transition-colors disabled:opacity-60 text-gray-400 hover:text-[#111] font-bold text-[13px]"
        >
          <div className="bg-gray-100 p-2 rounded-full"><LogOut size={16} /></div>
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>

    {profileModalOpen && createPortal(
      <div className="fixed inset-0 z-[120] bg-black/30 backdrop-blur-sm grid place-items-center p-4" onClick={() => setProfileModalOpen(false)}>
        <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-[#1f2937]">Edit Profile</h3>
            <button onClick={() => setProfileModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100"><X size={16} /></button>
          </div>

          <div className="space-y-4">
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-gray-50 rounded-xl px-4 py-2.5"
            />
            
            <input
              value={isTeacher ? 'Teacher' : 'Student'}
              readOnly
              placeholder="Role"
              className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-gray-500"
            />

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Choose Avatar</p>
              <div className="grid grid-cols-6 gap-2">
                {avatarChoices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setAvatarUrl(choice)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 ${avatarUrl === choice ? 'border-[#1f2937]' : 'border-transparent'}`}
                  >
                    <img src={choice} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full bg-[#1f2937] text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
};

export default Sidebar;
