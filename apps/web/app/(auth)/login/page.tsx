'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setErr(error.message);
        setBusy(false);
      } else {
        toast.success('Welcome back!');
        router.replace('/dashboard');
        router.refresh();
      }
    } catch (e) {
      setErr("Failed to connect to database.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Deep Red */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#A42A22] p-12 lg:p-20 text-white">
        <div className="text-lg font-medium tracking-wide">
          [CRM name]
        </div>
        
        <div className="space-y-6 max-w-lg">
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.1] tracking-tight">
            Welcome back to<br/>your pipeline.
          </h1>
          <p className="text-white/80 text-lg font-medium max-w-md">
            Call leads, follow up and book site visits from one place.
          </p>
        </div>
        
        <div className="text-xs text-white/60">
          Built for real estate sales teams
        </div>
      </div>

      {/* Right Panel - Cream Form */}
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 sm:px-16 lg:px-24 bg-[#FDFBF7]">
        <div className="w-full max-w-[400px] mx-auto space-y-8">
          
          <div className="space-y-2">
            <h2 className="font-serif text-[2rem] text-gray-900 leading-tight">Sign in</h2>
            <p className="text-sm text-gray-500">Welcome back. Enter your details to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Email or phone</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-900">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#A42A22] focus:ring-[#A42A22]"
                />
                Remember me
              </label>
              <a href="#" className="text-[13px] font-medium text-[#A42A22] hover:underline">
                Forgot password?
              </a>
            </div>

            {err && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[#C02B2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] focus:outline-none focus:ring-2 focus:ring-[#A42A22] focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
            
            <button
              type="button"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
              onClick={() => toast.error('Phone OTP is not configured yet.')}
            >
              Sign in with phone OTP
            </button>

            <div className="text-center text-[13px] text-gray-500 pt-2">
              New here? <a href="#" className="font-medium text-[#A42A22] hover:underline">Create an account</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}