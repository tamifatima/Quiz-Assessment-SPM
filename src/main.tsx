import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabaseConfigError } from './services/supabase';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigError ? (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '680px', background: '#fff3f2', color: '#8a1f17', border: '1px solid #f7c5c0', borderRadius: '12px', padding: '16px 20px' }}>
          <h2 style={{ marginTop: 0 }}>Configuration Error</h2>
          <p style={{ marginBottom: 0 }}>
            {supabaseConfigError}. Add them to .env.local then restart dev server.
          </p>
        </div>
      </div>
    ) : (
      <App />
    )}
  </StrictMode>,
);
