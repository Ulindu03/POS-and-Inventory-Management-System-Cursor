import { useState } from 'react';
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
      description: "Enter your credentials to access your dashboard",
      demo: "Demo Credentials",
      admin: "Admin",
      cashier: "Cashier"
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
      description: "ඔබගේ උපකරණ පුවරුවට ප්‍රවේශ වීමට",
      demo: "නිදර්ශන අක්තපත්‍ර",
      admin: "පරිපාලක",
      cashier: "මුදල් අයකැමි"
    }
  };

  const t = translations[language as 'en' | 'si'];

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      if ((username === 'admin' && password === 'admin123') ||
          (username === 'cashier' && password === 'cashier123')) {
        toast.success('Login successful! Redirecting...');
      } else {
        toast.error('Invalid credentials!');
      }
    }, 2000);
  };

  const setDemoCredentials = (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('cashier');
      setPassword('cashier123');
    }
    toast.success(`${role} credentials filled!`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-700 flex items-center justify-center p-4 overflow-auto">
      <Toaster position="top-right" richColors />
      
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${15 + i * 2}s linear infinite`,
              animationDelay: `${i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Main content - adjusted for better centering */}
      <div className="relative z-10 w-full max-w-md mx-auto my-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl transform hover:rotate-12 transition-transform duration-500">
              <svg viewBox="0 0 100 100" className="w-14 h-14">
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
          <h1 className="text-3xl font-bold text-white mb-1">{t.title}</h1>
          <p className="text-purple-200 text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t.subtitle}
            <Sparkles className="w-4 h-4" />
          </p>
        </div>

        {/* Glass card - reduced padding */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-6">
          {/* Language switcher */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setLanguage(language === 'en' ? 'si' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-white text-sm"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'සිංහල' : 'English'}
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-1">{t.welcome}</h2>
          <p className="text-purple-200 text-sm mb-4">{t.description}</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">
                {t.username}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="admin or cashier"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-purple-200 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 mr-2 bg-white/10 border border-white/20 rounded" 
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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

            {/* Demo credentials */}
            <div className="pt-3 border-t border-white/10">
              <p className="text-xs text-purple-200 text-center mb-2">{t.demo}:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoCredentials('admin')}
                  className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <User className="w-3 h-3" />
                  {t.admin}
                </button>
                <button
                  type="button"
                  onClick={() => setDemoCredentials('cashier')}
                  className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <User className="w-3 h-3" />
                  {t.cashier}
                </button>
              </div>
            </div>
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