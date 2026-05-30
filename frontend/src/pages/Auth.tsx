import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
// Import capacitor plugin if you still plan to use it for native Google OAuth later, 
// but since the plan relies on backend redirect, we just use a simple redirect for now.

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Local Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleGoogleSign = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleLocalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { name, email, password };
      const res = await axios.post(`${API_BASE}${endpoint}`, payload);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-[#FFF9EA] text-[#1A1F2C] relative overflow-x-hidden font-sans pb-8">
      
      {/* Abstract Background Elements */}
      <div className="absolute top-12 right-12 w-2 h-2 bg-[#FFC107] rounded-full blur-[0.5px]" />
      <div className="absolute top-32 left-10 w-1.5 h-1.5 bg-[#FFC107] rounded-full blur-[0.5px]" />
      <div className="absolute top-[20%] right-[-20px] w-32 h-32 border border-[#FFC107]/10 rounded-full" />
      <div className="absolute top-[40%] left-[-40px] w-48 h-48 border border-[#FFC107]/10 rounded-full" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#FFE699]/40 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute top-[30%] left-[-150px] w-[350px] h-[350px] bg-gradient-to-tr from-[#FFD54F]/20 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />

      {/* TOP SECTION */}
      <div className="w-full flex flex-col items-center pt-3 md:pt-4 relative z-10 px-4 shrink-0 -mt-1">
        <div className="flex flex-col items-center relative z-20 mt-1.5">
          <img 
            src="/app-icon-generated.png" 
            alt="KeepInMind Logo" 
            className="w-[48px] h-[48px] rounded-[12px] shadow-lg shadow-[#FFC107]/25 mb-1.5 object-cover mix-blend-multiply" 
          />
          <h1 className="text-[19px] font-extrabold tracking-tight text-[#1A1F2C] text-center mb-0.5">
             KeepIn<span className="text-[#FFC107]">Mind</span>
          </h1>
          <p className="text-[10px] font-medium text-gray-500 text-center mb-4">
             Your thoughts, always organized.
          </p>
        </div>

        {/* Illustration */}
        <div className="w-full max-w-[490px] h-[300px] flex justify-center items-center relative z-10 mt-0">
           <img 
             src="/user-provided-notebook.jpg" 
             alt="Notebook" 
             className="h-full w-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.12)] mix-blend-multiply" 
             style={{
               WebkitMaskImage: 'radial-gradient(ellipse, black 50%, transparent 70%)',
               maskImage: 'radial-gradient(ellipse, black 50%, transparent 70%)'
             }}
           />
        </div>
      </div>

      {/* CENTER AUTH CARD */}
      <div className="w-full px-4 max-w-[380px] relative z-20 -mt-28 md:-mt-32">
        <div className="bg-white/95 backdrop-blur-xl rounded-[24px] w-full shadow-[0_20px_60px_rgb(0,0,0,0.06)] border border-white flex flex-col p-5 md:p-6">
          
          <div className="flex flex-col">
            <div className="text-center mb-4">
               <h2 className="text-[18px] font-bold text-gray-900 mb-0.5 flex items-center justify-center gap-1.5">
                  Welcome to KeepInMind 👋
               </h2>
               <p className="text-[12px] text-gray-500">
                  Log in or sign up to continue
               </p>
            </div>

            <div className="flex flex-col gap-3">
              {error && (
                <div className="bg-error/10 text-error text-xs p-2 rounded-lg text-center border border-error/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleLocalAuth} className="flex flex-col gap-3">
                {!isLogin && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <UserIcon size={16} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent transition-all"
                    />
                  </div>
                )}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent transition-all"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC107] focus:border-transparent transition-all"
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="mt-1 w-full flex items-center justify-center py-2.5 rounded-xl bg-[#FFC107] text-[#1A1F2C] text-[13px] font-bold shadow-md shadow-[#FFC107]/20 hover:bg-[#F5B000] hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-70"
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] uppercase tracking-wider font-bold">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleSign}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors bg-white shadow-sm w-full"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              
              <div className="text-center mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* BOTTOM INSTALL SECTION */}
      {showInstallBanner && (
        <div className="w-full px-4 max-w-[380px] relative z-20 mt-4">
          <div className="bg-gradient-to-r from-[#FFF3D6] to-[#FFEAB3] rounded-[16px] p-3 flex items-center gap-3 shadow-sm relative overflow-hidden">
             
             <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm relative z-10">
                <div className="absolute -top-0.5 -left-0.5 text-[#FFC107]">
                   <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 9l7 1-5 5 1 7-7-4-7 4 1-7-5-5 7-1z"></path></svg>
                </div>
                <div className="absolute top-0.5 -right-0.5 text-[#FFC107]">
                   <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 9l7 1-5 5 1 7-7-4-7 4 1-7-5-5 7-1z"></path></svg>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
             </div>
             
             <div className="flex flex-col flex-1 pr-5 z-10">
                <span className="text-[12px] font-bold text-gray-900 leading-snug">Install KeepInMind</span>
                <span className="text-[10px] text-gray-600 leading-tight mt-0.5">Install the app for a better experience and quick access.</span>
             </div>
             
             <button 
               onClick={handleInstallClick}
               className="bg-[#FFC107] hover:bg-[#F5B000] text-[#1A1F2C] font-bold text-[11.5px] px-3 py-1.5 rounded-[8px] flex items-center gap-1 shadow-md shadow-[#FFC107]/20 transition-all shrink-0 z-10"
             >
                Install 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
             </button>
          </div>
        </div>
      )}

      {/* FOOTER TEXT */}
      <div className="w-full px-4 max-w-[380px] relative z-20 mt-4 mb-2">
         <div className="flex justify-center items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border border-[#FFEAB3] flex items-center justify-center text-[#FFC107]">
               <ShieldCheck className="w-[15px] h-[15px]" />
            </div>
            <div className="flex flex-col">
               <span className="text-[10.5px] font-bold text-gray-800 leading-tight">100% Private & Secure</span>
               <span className="text-[9.5px] text-gray-500 leading-tight">Your notes are safe with us.</span>
            </div>
         </div>
      </div>

    </div>
  );
}
