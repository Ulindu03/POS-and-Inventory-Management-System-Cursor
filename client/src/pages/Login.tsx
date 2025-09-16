// Login page with optional admin OTP step.
// It shows a form, sends credentials to the store, and navigates to dashboard on success.
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  ChevronRight,
  Sparkles,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth.api';

// VoltZone Logo (use public/logo.jpg)
const VoltZoneLogo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <img
    src="/logo.jpg"
    alt="VoltZone Logo"
    className={`${className} rounded-xl shadow-2xl object-contain bg-transparent`}
  />
);

// Floating particles animation (FFE100 glow)
const FloatingParticle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{ backgroundColor: '#FFE100', filter: 'drop-shadow(0 0 6px #FFE100)', opacity: 0.7 }}
    initial={{ x: Math.random() * 400 - 200, y: 600, scale: 0.7, opacity: 0 }}
    animate={{
      y: -100,
      x: Math.random() * 400 - 200,
      scale: [0.7, 1, 0.85],
      opacity: [0, 0.7, 0.4]
    }}
    transition={{
      duration: Math.random() * 10 + 10,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
  />
);

// Subtle animated grid overlay
const AnimatedGrid = () => (
  <motion.div
    className="absolute inset-0"
    style={{
      backgroundImage:
        'radial-gradient(circle at 1px 1px, rgba(248,248,248,0.12) 1px, transparent 1px)'
      ,
      backgroundSize: '26px 26px',
      opacity: 0.08,
    }}
    animate={{ backgroundPosition: ['0px 0px', '26px 26px'] }}
    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
  />
);

// Orbiting glow ring with a moving dot
const OrbitingGlow = ({ radius = 160, size = 8, duration = 36, delay = 0 }: { radius?: number; size?: number; duration?: number; delay?: number }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <motion.div
      style={{
        width: radius * 2,
        height: radius * 2,
        borderRadius: 9999,
        border: '1px solid rgba(255,225,0,0.08)',
        boxShadow: 'inset 0 0 60px rgba(255,225,0,0.05)'
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    >
      <div className="relative w-full h-full">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: size,
            height: size,
            backgroundColor: '#FFE100',
            borderRadius: 9999,
            filter: 'drop-shadow(0 0 10px #FFE100) drop-shadow(0 0 24px #FFE100)'
          }}
        />
      </div>
    </motion.div>
  </div>
);

// Shooting star streak
const ShootingStar = ({ delay = 2, top = '10%', left = '-10%' }: { delay?: number; top?: string; left?: string }) => (
  <motion.div
    className="absolute"
    style={{ top, left }}
    initial={{ x: 0, y: 0, opacity: 0 }}
    animate={{ x: '120vw', y: '60vh', opacity: [0, 0.85, 0] }}
    transition={{ duration: 3.6, delay, repeat: Infinity, repeatDelay: 6, ease: 'easeOut' }}
  >
    <div style={{ width: 2, height: 2, backgroundColor: '#FFE100', borderRadius: 9999, boxShadow: '0 0 12px #FFE100, 0 0 28px #FFE100' }} />
    <div style={{ position: 'absolute', top: -1, left: -130, width: 130, height: 2, background: 'linear-gradient(90deg, #FFE10077, transparent)', filter: 'blur(1px)' }} />
  </motion.div>
);

// Aurora ribbon background
const Aurora = () => (
  <>
    <motion.div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(1200px 600px at 10% 10%, rgba(255,225,0,0.08), transparent 60%), radial-gradient(900px 500px at 90% 80%, rgba(255,225,0,0.06), transparent 60%)'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    />
    <motion.div
      className="absolute -top-32 left-0 right-0 h-96"
      style={{
        background: 'linear-gradient(90deg, rgba(255,225,0,0.15), rgba(248,248,248,0.06), rgba(255,225,0,0.12))',
        filter: 'blur(40px)'
      }}
      animate={{ x: ['-10%', '10%', '-6%'], rotate: [0, 2, -2, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-96"
      style={{
        background: 'linear-gradient(90deg, rgba(248,248,248,0.06), rgba(255,225,0,0.15), rgba(248,248,248,0.06))',
        filter: 'blur(48px)'
      }}
      animate={{ x: ['6%', '-8%', '4%'] }}
      transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
    />
  </>
);

// Separate, smaller components to keep the main component simple
type TText = ReturnType<typeof buildText>;
type LoginFormProps = {
  t: TText;
  formData: { username: string; password: string; rememberMe: boolean };
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  setCurrentView: (v: 'login' | 'forgot') => void;
};

const LoginView = ({ t, formData, showPassword, setShowPassword, handleInputChange, handleSubmit, isLoading, setCurrentView }: LoginFormProps) => (
  <>
    <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8F8F8' }}>{t.welcome}</h2>
    <p className="text-sm mb-6" style={{ color: '#F8F8F8B3' }}>{t.description}</p>

  <form onSubmit={handleSubmit} className="space-y-5">
  {/* Username */}
      <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F8F8F8B3' }}>{t.username}</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" color="#000000" />
          <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE100] focus:border-transparent transition-all duration-200 placeholder-black" style={{ backgroundColor: '#EEEEEE', border: '1px solid #EEEEEE', color: '#000000', caretColor: '#000000' }} placeholder="Enter username or email" autoComplete="username" />
        </div>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <label className="block text-sm font-medium mb-2" style={{ color: '#F8F8F8B3' }}>{t.password}</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" color="#000000" />
          <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} className="w-full pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE100] focus:border-transparent transition-all duration-200 placeholder-black" style={{ backgroundColor: '#EEEEEE', border: '1px solid #EEEEEE', color: '#000000', caretColor: '#000000' }} placeholder="••••••••" autoComplete="current-password" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors bg-transparent border-0 p-0 focus:outline-none" style={{ color: '#000000' }}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>

      {/* Remember + Forgot */}
      <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }} className="flex items-center justify-between">
        <label className="flex items-center text-sm cursor-pointer" style={{ color: '#F8F8F8B3' }}>
          <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} className="w-4 h-4 rounded focus:ring-2 focus:ring-[#FFE100] mr-2" style={{ backgroundColor: '#EEEEEE', border: '1px solid #EEEEEE', accentColor: '#000000' }} />
          {t.rememberMe}
        </label>
        <button type="button" onClick={() => setCurrentView('forgot')} className="text-sm transition-colors bg-transparent border-0 p-0 focus:outline-none" style={{ color: '#F8F8F8B3' }}>
          {t.forgotPassword}
        </button>
      </motion.div>

      {/* Submit */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}>
        <button type="submit" disabled={isLoading} className="w-full py-3 px-4 font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group" style={{ background: 'linear-gradient(135deg, #FFE100 0%, #FFD100 100%)', color: '#000000' }}>
          {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Loading...</>) : (<><span>{t.loginButton}</span><ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" /></>)}
        </button>
      </motion.div>

    </form>
  </>
);

type ForgotFormProps = {
  t: TText;
  formData: { email: string };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
};

const ForgotView = ({ t, formData, handleInputChange, handleSubmit, isLoading }: ForgotFormProps) => (
  <>
    <h2 className="text-2xl font-bold text-white mb-2">{t.forgotTitle}</h2>
    <p className="text-purple-200 text-sm mb-6">{t.forgotDescription}</p>
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <label className="block text-sm font-medium text-purple-200 mb-2">{t.email}</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" color="#000000" />
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE100] focus:border-transparent transition-all duration-200 placeholder-black" style={{ backgroundColor: '#EEEEEE', border: '1px solid #EEEEEE', color: '#000000', caretColor: '#000000' }} placeholder="you@example.com" autoComplete="email" />
        </div>
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
        <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
          {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>) : (<><span>{t.sendResetLink}</span><Mail className="w-5 h-5" /></>)}
        </button>
      </motion.div>
    </form>
  </>
);

// Helper to build translations text block
function buildText(language: 'en' | 'si') {
  const map = {
    en: {
      title: 'VoltZone POS System',
      subtitle: 'Glow Smart, Live Bright',
      username: 'Username or Email',
      password: 'Password',
      email: 'Email Address',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember Me',
      loginButton: 'Sign In',
      welcome: 'Welcome Back',
      description: 'Enter your credentials to access your dashboard',
      forgotTitle: 'Reset Password',
      forgotDescription: 'Enter your email to receive reset instructions',
      sendResetLink: 'Send Reset Link',
      backToLogin: 'Back to Login',
      resetSent: 'Reset link sent to your email!',
      loginSuccess: 'Login successful! Redirecting...',
  loginError: 'Invalid username or password',
  fillFields: 'Please fill in all fields',
    },
    si: {
      title: 'VoltZone POS පද්ධතිය',
      subtitle: 'දීප්තිමත්ව සිතන්න, ජීවත් වන්න',
      username: 'පරිශීලක නාමය හෝ ඊමේල්',
      password: 'මුරපදය',
      email: 'විද්‍යුත් තැපෑල',
      forgotPassword: 'මුරපදය අමතකද?',
      rememberMe: 'මතක තබා ගන්න',
      loginButton: 'පිවිසෙන්න',
      welcome: 'නැවත සාදරයෙන් පිළිගනිමු',
      description: 'ඔබගේ උපකරණ පුවරුවට ප්‍රවේශ වීමට අක්තපත්‍ර ඇතුළත් කරන්න',
      forgotTitle: 'මුරපදය යළි සකසන්න',
      forgotDescription: 'යළි සැකසීමේ උපදෙස් ලබා ගැනීමට ඔබගේ ඊමේල් ඇතුළත් කරන්න',
      sendResetLink: 'යළි සැකසීමේ සබැඳිය යවන්න',
      backToLogin: 'පිවිසුම වෙත ආපසු',
      resetSent: 'යළි සැකසීමේ සබැඳිය ඔබගේ ඊමේල් වෙත යවන ලදී!',
      loginSuccess: 'සාර්ථකව පිවිසුණි! යොමු කරමින්...',
  loginError: 'වැරදි පරිශීලක නාමය හෝ මුරපදය',
  fillFields: 'කරුණාකර සියලුම ක්ෂේත්‍ර පුරවන්න',
    }
  } as const;
  return map[language];
}

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'si'>('en');
  const [currentView, setCurrentView] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    rememberMe: false
  });
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);                 // action to login with username/password
  const otpRequired = useAuthStore((s) => s.otpRequired);     // true when backend asked for OTP
  const verifyAdminOtp = useAuthStore((s) => s.verifyAdminOtp); // action to verify the OTP
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // user login state

  const t = buildText(language);

  // Handle submit for both: login form and forgot password view.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView === 'forgot') {
      if (!formData.email) { toast.error(t.fillFields); return; }
      setIsLoading(true);
      setTimeout(() => { setIsLoading(false); toast.success(t.resetSent); setCurrentView('login'); }, 1500);
      return;
    }
    if (otpRequired) return; // If we are on the OTP step, ignore the login form submit
    if (!formData.username || !formData.password) { toast.error(t.fillFields); return; }
    setIsLoading(true);
    try {
      // Ask the store to perform login; rememberMe tells where to store tokens
      const res = await login({ username: formData.username, password: formData.password, rememberMe: formData.rememberMe });
      if (res?.requiresOtp) {
        // Backend wants an OTP; show the OTP UI
        setEmailSent(res.emailSent ?? null);
        setEmailError(res.emailError || null);
        setEmailPreviewUrl(res.emailPreviewUrl || null);
        toast.success(res.emailSent ? '🔐 OTP sent to admin email' : '🔐 OTP generated (email not sent)', {
          description: res.emailSent ? 'Check your email for the 6-digit verification code' : 'Use the development OTP to proceed',
          duration: 5000,
        });
        return;
      }
      toast.success(t.loginSuccess);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err); // eslint-disable-line no-console
      toast.error(t.loginError);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep form state in sync with inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  // countdown timer for resend
  useEffect(() => {
    if (!resendCooldown) return;
    const id = setInterval(() => setResendCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // Submit the OTP for admin login
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setIsLoading(true);
    try {
      await verifyAdminOtp({ otp, rememberMe: formData.rememberMe }); // store handles saving tokens
      toast.success(t.loginSuccess);
      // Navigation handled by isAuthenticated effect; avoid intermediate login flash
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast.error('Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect once authenticated (covers both direct login and OTP flow) without flashing login panel
  // Once logged in (either normal login or after OTP), go to dashboard.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Prevent UI flash: while authenticated but before navigation, render minimal placeholder
  if (isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <Toaster position="top-right" richColors />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* base glows */}
        <div className="absolute -top-10 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: '#FFE100' }} />
        <div className="absolute -bottom-20 -right-24 w-[28rem] h-[28rem] rounded-full blur-[100px] opacity-20" style={{ background: '#FFE100' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10" style={{ background: '#F8F8F8' }} />

        {/* animated grid */}
        <AnimatedGrid />

        {/* orbiting glows around center */}
        <OrbitingGlow radius={180} size={8} duration={42} />
        <OrbitingGlow radius={260} size={10} duration={58} delay={6} />

        {/* shooting stars */}
        <ShootingStar delay={2} top="12%" left="-8%" />
        <ShootingStar delay={7} top="28%" left="-12%" />
        <ShootingStar delay={12} top="6%" left="-15%" />

        {/* new aurora ribbons */}
        <Aurora />
      </div>

      {/* Floating particles (no hooks to avoid conditional hook rule); random keys stable enough for decorative elements */}
      {Array.from({ length: 10 }).map((_, i) => {
        const key = `particle-${i + 1}`; // deterministic non-index-like id
        return <FloatingParticle key={key} delay={i * 1.3} />;
      })}

      {/* Main content: split layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left: Login panel */}
        <div className="order-2 lg:order-1 flex items-center justify-center px-4 py-10 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[560px]"
          >
            <motion.div className="mb-8 flex items-center gap-4">
              <VoltZoneLogo className="w-16 h-16" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#F8F8F8' }}>{t.title}</h1>
                <p className="text-sm flex items-center gap-1" style={{ color: '#F8F8F8CC' }}>
                  <Sparkles className="w-4 h-4" color="#FFE100" /> {t.subtitle}
                </p>
              </div>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8"
              style={{ backgroundColor: 'rgba(248,248,248,0.06)', border: '1px solid rgba(248,248,248,0.12)' }}
            >
            {/* Language switcher */}
            <div className="flex justify-between items-center mb-6">
              {currentView !== 'login' && (
                <button
                  onClick={() => setCurrentView('login')}
                  className="flex items-center gap-2 transition-colors"
                  style={{ color: '#F8F8F8CC' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToLogin}
                </button>
              )}
              <button
                onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm ml-auto"
                style={{ backgroundColor: 'rgba(248,248,248,0.10)', color: '#F8F8F8' }}
              >
                <Globe className="w-4 h-4" />
                {language === 'en' ? 'සිංහල' : 'English'}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {currentView === 'login' ? (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  {!otpRequired && (
                    <>
                      {/* Render password inside this block so it disappears during OTP stage */}
                      <LoginView
                        t={t}
                        formData={{ username: formData.username, password: formData.password, rememberMe: formData.rememberMe }}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        setCurrentView={(v) => setCurrentView(v)}
                      />
                    </>
                  )}
                  {otpRequired && (
                    <form onSubmit={handleOtpVerify} className="space-y-5">
                      <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8F8F8' }}>Two-Factor Authentication</h2>
                      <p className="text-sm mb-6" style={{ color: '#F8F8F8B3' }}>
                        {emailSent ? 'We\'ve sent a 6-digit code to your admin email' : 'Development mode: OTP generated locally'}
                      </p>

                      {/* Status Messages */}
                      {emailSent && (
                        <motion.div 
                          initial={{ y: -10, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl mb-4" 
                          style={{ 
                            background: 'rgba(34, 197, 94, 0.1)', 
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e'
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Code sent successfully</p>
                            <p className="text-xs opacity-80">Check your email and enter the 6-digit code below</p>
                          </div>
                        </motion.div>
                      )}

                      {emailPreviewUrl && (
                        <motion.div 
                          initial={{ y: -10, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="text-center mb-4"
                        >
                          <a 
                            href={emailPreviewUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              background: 'rgba(255, 225, 0, 0.1)', 
                              color: '#FFE100',
                              border: '1px solid rgba(255, 225, 0, 0.3)'
                            }}
                          >
                            📧 Open Email Preview
                          </a>
                        </motion.div>
                      )}

                      {emailError && (
                        <motion.div 
                          initial={{ y: -10, opacity: 0 }} 
                          animate={{ y: 0, opacity: 1 }} 
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl mb-4" 
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444'
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Email delivery failed</p>
                            <p className="text-xs opacity-80">{emailError}</p>
                          </div>
                        </motion.div>
                      )}

                      {/* OTP Input Field */}
                      <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
                        <label htmlFor="otp" className="block text-sm font-medium mb-2" style={{ color: '#F8F8F8B3' }}>OTP Code</label>
                        <div className="relative">
                          <input 
                            id="otp" 
                            type="text" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} 
                            className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE100] focus:border-transparent transition-all duration-200 placeholder-black" 
                            style={{ 
                              backgroundColor: '#EEEEEE', 
                              border: '1px solid #EEEEEE', 
                              color: '#000000', 
                              caretColor: '#000000' 
                            }} 
                            placeholder="123456" 
                            inputMode="numeric"
                            maxLength={6}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <img src="/twofac.png" alt="OTP" className="w-5 h-5 object-contain" />
                          </div>
                          <button
                            type="button"
                            disabled={isLoading || resendCooldown > 0}
                            onClick={async () => {
                              if (resendCooldown > 0) return;
                              try {
                                setIsLoading(true);
                                await authApi.adminLoginInit({ username: formData.username, password: formData.password, rememberMe: formData.rememberMe });
                                setResendCooldown(30); // 30s cooldown
                                toast.success('🔄 OTP sent again', {
                                  description: 'Check your email for the new verification code',
                                  duration: 4000,
                                });
                              } catch {
                                toast.error('❌ Could not resend OTP');
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium px-3 py-1 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              background: resendCooldown > 0 
                                ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                                : 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                              color: '#F8F8F8',
                              border: '1px solid rgba(255,225,0,0.25)'
                            }}
                          >
                            {resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Resend'}
                          </button>
                        </div>
                      </motion.div>

                      {/* Verify Button */}
                      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}>
                        <button 
                          type="submit" 
                          disabled={isLoading || otp.length !== 6} 
                          className="w-full py-3 px-4 font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group" 
                          style={{ 
                            background: otp.length === 6 
                              ? 'linear-gradient(135deg, #FFE100 0%, #FFD100 100%)' 
                              : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', 
                            color: '#000000' 
                          }}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <span>Verify OTP</span>
                              <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </>
                          )}
                        </button>
                      </motion.div>
                    </form>
                  )}
                </motion.div>
              ) : (
                <motion.div key="forgot" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <ForgotView
                    t={t}
                    formData={{ email: formData.email }}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-center mt-8 text-sm"
              style={{ color: '#F8F8F8B3' }}
            >
              <p>© 2025 VoltZone. Secure • Encrypted • Private</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: Company marketing/info */}
        <div className="order-1 lg:order-2 relative hidden md:flex items-center justify-center p-8 lg:p-16">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl w-full"
          >
            <div className="backdrop-blur-xl/20 rounded-3xl p-8 lg:p-10">
              <div className="mb-6">
                <div className="text-sm opacity-70" style={{ color: '#F8F8F8B3' }}>VoltZone • Retail Suite</div>
                <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight">
                  <span style={{ color: '#F8F8F8' }}>Glow in.</span>{' '}
                  <span style={{ color: '#FFE100' }}>Log in.</span>
                </h2>
              </div>
              <p className="text-base lg:text-lg mb-6 max-w-xl" style={{ color: '#F8F8F8CC' }}>
                Welcome to your VoltZone dashboard — manage orders, track inventory, and keep your business shining. Secure, fast, elegant.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-8">
                <li className="flex items-center gap-2" style={{ color: '#F8F8F8B3' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background:'#FFE100' }} /> Real-time stock</li>
                <li className="flex items-center gap-2" style={{ color: '#F8F8F8B3' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background:'#FFE100' }} /> Smart analytics</li>
                <li className="flex items-center gap-2" style={{ color: '#F8F8F8B3' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background:'#FFE100' }} /> Fast checkout</li>
                <li className="flex items-center gap-2" style={{ color: '#F8F8F8B3' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background:'#FFE100' }} /> Secure backups</li>
              </ul>
              <div className="text-xs opacity-80" style={{ color: '#F8F8F899' }}>Secure • Encrypted • Private</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;