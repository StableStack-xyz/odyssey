import { useState, useRef, useEffect, type ComponentProps } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

function ReCAPTCHAWrapper(props: Omit<ComponentProps<'div'>, 'onChange'> & { sitekey: string; onChange: (token: string | null) => void; onExpired?: () => void; onErrored?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!containerRef.current) return;

      const { default: ReCAPTCHA } = await import('react-google-recaptcha');
      if (cancelled || !containerRef.current) return;

      const widget = (
        <ReCAPTCHA
          sitekey={props.sitekey}
          onChange={props.onChange}
          onExpired={props.onExpired}
          onErrored={props.onErrored}
          theme="light"
        />
      );

      const { createRoot } = await import('react-dom/client');
      if (cancelled || !containerRef.current) return;

      const root = createRoot(containerRef.current);
      root.render(widget);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={containerRef} className="flex justify-center" />;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { login } = useAuth();
  const search = useSearch({ strict: false });

  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SECRET_KEY;
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const showRecaptcha = recaptchaSiteKey && !isLocalhost;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showRecaptcha && !captchaToken) {
      toast.error('Please complete the CAPTCHA');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Welcome back');
        const searchRedirect = (search as { redirect?: string }).redirect;
        // Safeguard: Never redirect back to the login page itself (prevents infinite redirect loops)
        const redirect = searchRedirect && !searchRedirect.includes('/login') ? searchRedirect : '/';
        window.location.href = redirect;
      } else {
        setCaptchaToken(null);
        toast.error('Invalid credentials or not an admin');
      }
    } catch (error) {
      setCaptchaToken(null);
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper transition-colors duration-200">
      {/* Top cream notice ribbon (flush, the only chromatic note) */}
      <div className="w-full bg-cream-notice py-2.5 px-4 text-center border-b border-graphite-hairline">
        <p className="text-xs tracking-wider text-[#171717] font-display">
          STABLESTACK CONTROL PANEL • AUTHORIZED PERSONNEL ONLY
        </p>
      </div>

      {/* Main container */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px] space-y-12">
          {/* Logo & Headline */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img src="/logo.svg?v=2" alt="StableStack" className="h-12 dark:hidden" />
              <img src="/logo-dark.svg?v=2" alt="StableStack" className="h-12 hidden dark:block" />
            </div>
            <h1 className="font-display text-[36px] tracking-tight text-ink leading-tight">
              StableStack Admin
            </h1>
            <p className="text-slate text-xs tracking-wider uppercase">
              quiet wealth infrastructure
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-slate">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all"
                  placeholder="name@stablestack.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs uppercase tracking-wider text-slate">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-[11px] text-slate hover:text-ink underline underline-offset-2 transition-colors font-display uppercase tracking-wider"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ash hover:text-slate transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isClient && showRecaptcha && (
              <div className="py-2">
                <ReCAPTCHAWrapper
                  sitekey={recaptchaSiteKey}
                  onChange={(token: string | null) => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                  onErrored={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-ink text-paper rounded-full text-sm font-display hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Access Terminal'}
            </button>
          </form>

          {/* Ghost text link for support */}
          <div className="text-center">
            <a href="mailto:support@stablestack.com" className="text-xs text-slate underline underline-offset-4 hover:text-ink transition-colors">
              Request credentials from administrator
            </a>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="py-4 text-center border-t border-graphite-hairline">
        <p className="text-[10px] uppercase tracking-widest text-ash">
          © 2026 StableStack Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
