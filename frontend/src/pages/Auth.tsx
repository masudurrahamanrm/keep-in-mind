import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile, signInWithCredential } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginWithFirebaseToken } from '../services/authService';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [otpCode, setOtpCode] = useState('');
  const [is2FAMode, setIs2FAMode] = useState(false);

  const [tfState, setTfState] = useState<{
    pendingToken: string;
    userName: string;
    googleToken: string;
  } | null>(null);

  const from = location.state?.from?.pathname || '/notes';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {

      if (mode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        const data = await loginWithFirebaseToken(idToken);
        
        if (data.twoFactorRequired) {
          setTfState({
            pendingToken: data.pendingToken,
            userName: data.user?.name?.split(' ')[0] || 'there',
            googleToken: '',
          });
          setIs2FAMode(true);
          return;
        }
        
        login(data.user, data.token, '');
        navigate(from, { replace: true });
      } else {
        // Sign Up Mode
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update user profile with their name
        await updateProfile(userCredential.user, { displayName: name });
        
        const idToken = await userCredential.user.getIdToken();
        const data = await loginWithFirebaseToken(idToken);
        
        login(data.user, data.token, '');
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.unverified) {
        setError(err.message);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes before trying again.');
      } else if (err.code === 'auth/invalid-api-key' || err.code === 'auth/unauthorized-domain') {
        setError('Firebase configuration error. Check your API Key and Authorized Domains in the console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-login-credentials') {
        setError('Invalid email or password. If you haven\'t created an account yet, please switch to Sign Up.');
      } else {
        setError(err.message || 'Authentication failed. Please check your connection or Firebase settings.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSign = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      let firebaseIdToken: string | null = null;
      let googleAccessToken: string | null = null;

      if (Capacitor.isNativePlatform()) {
        // Native platform: Use Capacitor Google Auth
        const googleUser = (await GoogleAuth.signIn()) as any;
        const nativeIdToken = googleUser.authentication.idToken as string;
        googleAccessToken = googleUser.authentication.accessToken as string;
        
        // Pass the native Google token to Firebase to sign in
        const credential = GoogleAuthProvider.credential(nativeIdToken);
        const result = await signInWithCredential(auth, credential);
        firebaseIdToken = await result.user.getIdToken();
      } else {
        // Web platform: Use Firebase Popup
        const result = await signInWithPopup(auth, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        googleAccessToken = credential?.accessToken || null;
        firebaseIdToken = await result.user.getIdToken();
      }

      if (!firebaseIdToken) throw new Error('Failed to obtain ID token.');

      const data = await loginWithFirebaseToken(firebaseIdToken);

      if (data.twoFactorRequired) {
        setTfState({
          pendingToken: data.pendingToken,
          userName: data.user?.name?.split(' ')[0] || 'there',
          googleToken: googleAccessToken || '',
        });
        setIs2FAMode(true);
        return;
      }

      login(data.user, data.token, googleAccessToken || '');
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') return;
      console.error('Google Sign-in Error:', err);
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      // Import sendPasswordResetEmail from firebase/auth
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      setError('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (otpCode.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken: tfState!.pendingToken, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      login(data.user, data.token, tfState!.googleToken || '');
      navigate(from, { replace: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
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
        <div className="w-full max-w-[490px] h-[300px] flex justify-center items-center relative z-10 -mt-6 md:-mt-8">
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
          
          <AnimatePresence mode="wait">
            {is2FAMode ? (
              <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-900">Verify Identity</h2>
                  <p className="text-[12px] text-gray-500 mt-0.5">Enter the code to verify it's you, {tfState?.userName}.</p>
                </div>
                {error && (
                  <div className={`text-xs font-bold py-2 px-3 rounded-lg text-center ${error.includes('sent') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {error}
                  </div>
                )}
                <input
                  type="number"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3 rounded-xl border border-gray-200 bg-gray-50 focus:border-[#FFC107] focus:ring-4 focus:ring-[#FFC107]/10 outline-none transition-all text-gray-900"
                  autoFocus
                />
                <button 
                  onClick={handleVerify2FA} 
                  disabled={isLoading || otpCode.length < 6} 
                  className="w-full py-3 rounded-lg bg-[#FFC107] text-white font-bold transition-all disabled:opacity-50 hover:bg-[#F5B000] shadow-lg shadow-[#FFC107]/30 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : 'Confirm'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
                
                <div className="text-center mb-4">
                   <h2 className="text-[18px] font-bold text-gray-900 mb-0.5 flex items-center justify-center gap-1.5">
                      {mode === 'login' ? 'Welcome back 👋' : 'Create an account'}
                   </h2>
                   <p className="text-[12px] text-gray-500">
                      {mode === 'login' ? 'Log in to continue' : 'Sign up to get started'}
                   </p>
                </div>

                <form className="flex flex-col gap-3" onSubmit={handleEmailAuth}>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className={`text-[11px] font-bold py-2 px-3 rounded-lg text-center overflow-hidden ${error.includes("Account created") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
                    >
                      {error}
                    </motion.div>
                  )}

                  <button 
                    type="button" 
                    onClick={handleGoogleSign}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-800 hover:bg-gray-50 transition-colors bg-white disabled:opacity-50 shadow-sm w-full"
                  >
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 my-1">
                     <div className="h-[1px] flex-1 bg-gray-100" />
                     <span className="text-[11px] text-gray-400 font-medium">or</span>
                     <div className="h-[1px] flex-1 bg-gray-100" />
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {mode === "signup" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col gap-1 overflow-hidden"
                      >
                        <div className="relative group">
                          <User className="w-4 h-4 text-[#FFC107] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                          <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 placeholder:text-gray-400 pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#FFC107] focus:ring-4 focus:ring-[#FFC107]/10 transition-all shadow-sm"
                            placeholder="Full Name"
                            required={mode === "signup"}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-1">
                    <div className="relative group">
                      <Mail className="w-4 h-4 text-[#FFC107] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim())}
                        className="w-full bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 placeholder:text-gray-400 pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#FFC107] focus:ring-4 focus:ring-[#FFC107]/10 transition-all shadow-sm"
                        placeholder="Email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-[#FFC107] absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value.trim())}
                        className="w-full bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-900 placeholder:text-gray-400 pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#FFC107] focus:ring-4 focus:ring-[#FFC107]/10 transition-all shadow-sm"
                        placeholder="Password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {mode === "login" && (
                      <div className="flex justify-end mt-1">
                        <button 
                          type="button" 
                          onClick={handleForgotPassword}
                          className="text-[11px] font-semibold text-[#FFC107] hover:text-[#F5B000] transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-1 bg-[#FFC107] text-[#1A1F2C] font-bold text-[14px] rounded-lg py-2.5 w-full flex items-center justify-center gap-1.5 hover:bg-[#F5B000] active:scale-[0.98] transition-all shadow-lg shadow-[#FFC107]/20 disabled:opacity-50"
                  >
                    {isLoading ? "Please wait..." : (mode === "login" ? "Log In" : "Create Account")}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="mt-3 text-center">
                    <span className="text-[12px] text-gray-500">
                      {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                      className="text-[12px] font-bold text-[#FFC107] hover:text-[#F5B000] transition-colors"
                    >
                      {mode === "login" ? "Sign up" : "Log in"}
                    </button>
                  </div>
                </form>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* BOTTOM INSTALL SECTION */}
      <div className="w-full px-4 max-w-[380px] relative z-20 mt-4">
        <div className="bg-gradient-to-r from-[#FFF3D6] to-[#FFEAB3] rounded-[16px] p-3 flex items-center gap-3 shadow-sm relative overflow-hidden">
           
           <button className="absolute top-2 right-2.5 text-gray-400 hover:text-gray-700 transition-colors z-10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
           
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
           
           <button className="bg-[#FFC107] hover:bg-[#F5B000] text-[#1A1F2C] font-bold text-[11.5px] px-3 py-1.5 rounded-[8px] flex items-center gap-1 shadow-md shadow-[#FFC107]/20 transition-all shrink-0 z-10">
              Install 
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
           </button>
        </div>
      </div>

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
