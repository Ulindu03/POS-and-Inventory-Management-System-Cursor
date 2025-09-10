import { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

const SimpleLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [rememberMe, setRememberMe] = useState(false);

  // Stable particle data (avoids using array index as key and re-randomizing every render)
  const particles = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      id: `particle-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 15 + i * 2,
      delay: i * 0.5,
    })),
    []
  );

  const translations = {
    en: {
      title: "VoltZone POS System",
      subtitle: "Glow Smart, Live Bright",
      username: "Username or Email",
      password: "Password",
      forgotPassword: "Forgot Password?",
      rememberMe: "Remember Me",
      loginButton: "Sign In",
      welcome: "Welcome Back",
  description: "Enter your credentials to access your dashboard"
    },
    si: {
      title: "VoltZone POS පද්ධතිය",
      subtitle: "දීප්තිමත්ව සිතන්න, ජීවත් වන්න",
      username: "පරිශීලක නාමය",
      password: "මුරපදය",
      forgotPassword: "මුරපදය අමතකද?",
      rememberMe: "මතක තබා ගන්න",
      loginButton: "පිවිසෙන්න",
      welcome: "නැවත සාදරයෙන් පිළිගනිමු",
  description: "ඔබගේ උපකරණ පුවරුවට ප්‍රවේශ වීමට"
    }
  };

  const t = translations[language as 'en' | 'si'];

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.login({ username, password, rememberMe });
      toast.success('Login successful');
      // Optionally redirect
    } catch (err:any){
      const msg = err?.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-700 flex items-center justify-center p-6 overflow-auto">
      <Toaster position="top-right" richColors />
      
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `float ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg mx-auto my-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto mb-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-white/10 transform hover:rotate-6 transition-transform duration-500">
              <svg viewBox="0 0 100 100" className="w-16 h-16">
                <path
                  d="M50 15 L35 50 L45 50 L40 85 L65 45 L55 45 Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2 drop-shadow">{t.title}</h1>
          <div className="text-purple-200 text-sm flex items-center justify-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4"/>
            {t.subtitle}
            <Sparkles className="w-4 h-4"/>
            <button
              onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-all duration-200 text-white text-sm backdrop-blur"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'සිංහල' : 'English'}
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-white mt-4 mb-2">{t.welcome}</h2>
          <p className="text-purple-200 text-base mb-6 max-w-md mx-auto">{t.description}</p>

          <form onSubmit={handleLogin} className="space-y-5 text-left bg-black/20 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl">
            {/* Username field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2 tracking-wide">
                {t.username}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all text-base"
                  placeholder="your username or email"
                  aria-label={t.username}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2 tracking-wide">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all text-base"
                  placeholder="••••••••"
                  aria-label={t.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between text-sm flex-wrap gap-4">
              <label className="flex items-center text-purple-200 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 mr-2 bg-white/10 border border-white/30 rounded focus:ring-yellow-400" 
                />
                {t.rememberMe}
              </label>
              <button type="button" className="text-purple-200 hover:text-white transition-colors">
                {t.forgotPassword}
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-black font-semibold rounded-xl shadow-lg hover:shadow-yellow-500/30 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-yellow-400/40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  {t.loginButton}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>


          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-purple-200 text-xs">
          <p>© 2024 VoltZone. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;