import React, { useState } from 'react';
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

// VoltZone Logo Component (FFE100 accent)
const VoltZoneLogo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 rounded-full opacity-20" style={{ boxShadow: '0 0 60px 10px #FFE100' }}></div>
    <div className="relative rounded-full flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #FFE100, #FFD100)' }}>
      <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
        <path
          d="M50 15 L35 50 L45 50 L40 85 L65 45 L55 45 Z"
          fill="#000000"
          stroke="#000000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="35" fill="none" stroke="#000000" strokeWidth="2" opacity="0.5" />
      </svg>
    </div>
  </div>
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

  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  // Translations (use i18next + local overrides for extra strings)
  const t = {
    title: language === 'si' ? 'VoltZone POS පද්ධතිය' : 'VoltZone POS System',
    subtitle: language === 'si' ? 'දීප්තිමත්ව සිතන්න, ජීවත් වන්න' : 'Glow Smart, Live Bright',
    username: language === 'si' ? 'පරිශීලක නාමය හෝ ඊමේල්' : 'Username or Email',
    password: language === 'si' ? 'මුරපදය' : 'Password',
    email: language === 'si' ? 'විද්‍යුත් තැපෑල' : 'Email Address',
    forgotPassword: language === 'si' ? 'මුරපදය අමතකද?' : 'Forgot Password?',
    rememberMe: language === 'si' ? 'මතක තබා ගන්න' : 'Remember Me',
    loginButton: language === 'si' ? 'පිවිසෙන්න' : 'Sign In',
    welcome: language === 'si' ? 'නැවත සාදරයෙන් පිළිගනිමු' : 'Welcome Back',
    description: language === 'si' ? 'ඔබගේ උපකරණ පුවරුවට ප්‍රවේශ වීමට අක්තපත්‍ර ඇතුළත් කරන්න' : 'Enter your credentials to access your dashboard',
    forgotTitle: language === 'si' ? 'මුරපදය යළි සකසන්න' : 'Reset Password',
    forgotDescription: language === 'si' ? 'යළි සැකසීමේ උපදෙස් ලබා ගැනීමට ඔබගේ ඊමේල් ඇතුළත් කරන්න' : 'Enter your email to receive reset instructions',
    sendResetLink: language === 'si' ? 'යළි සැකසීමේ සබැඳිය යවන්න' : 'Send Reset Link',
    backToLogin: language === 'si' ? 'පිවිසුම වෙත ආපසු' : 'Back to Login',
    resetSent: language === 'si' ? 'යළි සැකසීමේ සබැඳිය ඔබගේ ඊමේල් වෙත යවන ලදී!' : 'Reset link sent to your email!',
    loginSuccess: language === 'si' ? 'සාර්ථකව පිවිසුණි! යොමු කරමින්...' : 'Login successful! Redirecting...',
    loginError: language === 'si' ? 'වැරදි පරිශීලක නාමය හෝ මුරපදය' : 'Invalid username or password',
    fillFields: language === 'si' ? 'කරුණාකර සියලුම ක්ෂේත්‍ර පුරවන්න' : 'Please fill in all fields',
    demo: language === 'si' ? 'නිදර්ශන අක්තපත්‍ර' : 'Demo Credentials',
    admin: language === 'si' ? 'පරිපාලක' : 'Admin',
    cashier: language === 'si' ? 'මුදල් අයකැමි' : 'Cashier',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentView === 'login') {
      if (!formData.username || !formData.password) {
        toast.error(t.fillFields);
        return;
      }
      
      setIsLoading(true);
      try {
        await login({ username: formData.username, password: formData.password, rememberMe: formData.rememberMe });
        toast.success(t.loginSuccess);
        navigate('/', { replace: true });
      } catch (err) {
        toast.error(t.loginError);
      } finally {
        setIsLoading(false);
      }
    } else if (currentView === 'forgot') {
      if (!formData.email) {
        toast.error(t.fillFields);
        return;
      }
      
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        toast.success(t.resetSent);
        setCurrentView('login');
      }, 1500);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const setDemoCredentials = (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      setFormData(prev => ({
        ...prev,
        username: 'admin',
        password: 'admin123'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        username: 'cashier',
        password: 'cashier123'
      }));
    }
    toast.success(`${role === 'admin' ? t.admin : t.cashier} credentials filled`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden py-6 sm:py-10" style={{ backgroundColor: '#000000' }}>
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
      </div>

      {/* Floating particles */}
      {[...Array(10)].map((_, i) => (
        <FloatingParticle key={i} delay={i * 1.3} />
      ))}

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] items-start sm:items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[540px]"
        >
          {/* Logo and Title */}
          <motion.div 
            className="text-center mb-8"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              className="inline-block"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <VoltZoneLogo className="w-24 h-24 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#F8F8F8' }}>
              {t.title}
            </h1>
            <p className="text-sm flex items-center justify-center gap-2" style={{ color: '#F8F8F8CC' }}>
              <Sparkles className="w-4 h-4" color="#FFE100" />
              {t.subtitle}
              <Sparkles className="w-4 h-4" color="#FFE100" />
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
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
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold mb-2" style={{ color: '#F8F8F8' }}>{t.welcome}</h2>
                  <p className="text-sm mb-6" style={{ color: '#F8F8F8B3' }}>{t.description}</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username field */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <label className="block text-sm font-medium mb-2" style={{ color: '#F8F8F8B3' }}>
                        {t.username}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" color="#F8F8F8AA" />
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                          style={{ backgroundColor: 'rgba(248,248,248,0.10)', border: '1px solid rgba(248,248,248,0.15)', color: '#F8F8F8', caretColor: '#FFE100' }}
                          placeholder="admin or cashier"
                          autoComplete="username"
                        />
                      </div>
                    </motion.div>

                    {/* Password field */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <label className="block text-sm font-medium mb-2" style={{ color: '#F8F8F8B3' }}>
                        {t.password}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" color="#F8F8F8AA" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
                          style={{ backgroundColor: 'rgba(248,248,248,0.10)', border: '1px solid rgba(248,248,248,0.15)', color: '#F8F8F8', caretColor: '#FFE100' }}
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors bg-transparent border-0 p-0 focus:outline-none"
                          style={{ color: '#F8F8F8AA' }}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </motion.div>

                    {/* Remember me and Forgot password */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="flex items-center justify-between"
                    >
                      <label className="flex items-center text-sm cursor-pointer" style={{ color: '#F8F8F8B3' }}>
                        <input
                          type="checkbox"
                          name="rememberMe"
                          checked={formData.rememberMe}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded focus:ring-2 mr-2"
                          style={{ backgroundColor: 'rgba(248,248,248,0.10)', border: '1px solid rgba(248,248,248,0.20)' }}
                        />
                        {t.rememberMe}
                      </label>
                      <button
                        type="button"
                        onClick={() => setCurrentView('forgot')}
                        className="text-sm transition-colors bg-transparent border-0 p-0 focus:outline-none"
                        style={{ color: '#F8F8F8B3' }}
                      >
                        {t.forgotPassword}
                      </button>
                    </motion.div>

                    {/* Submit button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group"
                        style={{ background: 'linear-gradient(135deg, #FFE100 0%, #FFD100 100%)', color: '#000000' }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            {t.loginButton}
                            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </>
                        )}
                      </button>
                    </motion.div>

                    {/* Demo credentials */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      className="pt-4"
                      style={{ borderTop: '1px solid rgba(248,248,248,0.10)' }}
                    >
                      <p className="text-xs text-center mb-3" style={{ color: '#F8F8F8B3' }}>{t.demo}:</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDemoCredentials('admin')}
                          className="flex-1 py-2 px-3 text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'rgba(248,248,248,0.08)', color: '#F8F8F8' }}
                        >
                          <User className="w-4 h-4" />
                          {t.admin}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemoCredentials('cashier')}
                          className="flex-1 py-2 px-3 text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'rgba(248,248,248,0.08)', color: '#F8F8F8' }}
                        >
                          <User className="w-4 h-4" />
                          {t.cashier}
                        </button>
                      </div>
                    </motion.div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">{t.forgotTitle}</h2>
                  <p className="text-purple-200 text-sm mb-6">{t.forgotDescription}</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email field */}
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <label className="block text-sm font-medium text-purple-200 mb-2">
                        {t.email}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>
                    </motion.div>

                    {/* Submit button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            {t.sendResetLink}
                            <Mail className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </motion.div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="text-center mt-8 text-sm"
            style={{ color: '#F8F8F8B3' }}
          >
            <p>© 2024 VoltZone. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;