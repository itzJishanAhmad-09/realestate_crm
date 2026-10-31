'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    teamSize: '1 to 5',
    password: ''
  });
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setErr("You must agree to the Terms and Privacy Policy.");
      return;
    }
    
    setErr(null);
    setBusy(true);

    try {
      // 1. Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            company_name: formData.companyName,
            team_size: formData.teamSize
          }
        }
      });

      if (authError) throw authError;

      // 2. Note: Multi-tenant setup (creating the company and public.users profile)
      // requires a backend API route or server action to securely create the company
      // and link the user via the service role key. 
      // For now, we redirect them to the dashboard.
      
      toast.success('Account created successfully!');
      router.replace('/dashboard');
      router.refresh();
      
    } catch (e: any) {
      setErr(e.message || "Failed to create account.");
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
            Start closing more<br/>site visits.
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
      <div className="flex flex-col justify-center w-full md:w-1/2 px-8 sm:px-16 lg:px-24 bg-[#FDFBF7] py-10">
        <div className="w-full max-w-[400px] mx-auto space-y-6">
          
          <div className="space-y-2">
            <h2 className="font-serif text-[2rem] text-gray-900 leading-tight">Create your account</h2>
            <p className="text-sm text-gray-500">Set up your team in a few minutes.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Full name</label>
              <input
                type="text" name="fullName" required
                value={formData.fullName} onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Company name</label>
              <input
                type="text" name="companyName" required
                value={formData.companyName} onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Work email</label>
              <input
                type="email" name="email" required
                value={formData.email} onChange={handleChange}
                placeholder="you@company.com"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Phone number</label>
              <div className="flex rounded-md border border-gray-200 bg-white focus-within:border-[#A42A22] focus-within:ring-1 focus-within:ring-[#A42A22]">
                <span className="flex items-center px-3 text-sm text-gray-500 border-r border-gray-200 bg-gray-50 rounded-l-md">
                  +91
                </span>
                <input
                  type="tel" name="phone" required
                  value={formData.phone} onChange={handleChange}
                  className="flex-1 rounded-r-md bg-transparent px-3 py-2 text-sm text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Team size</label>
              <select
                name="teamSize"
                value={formData.teamSize} onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              >
                <option value="1 to 5">1 to 5</option>
                <option value="6 to 15">6 to 15</option>
                <option value="16 to 50">16 to 50</option>
                <option value="50+">50+</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-900">Password</label>
              <input
                type="password" name="password" required
                value={formData.password} onChange={handleChange}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#A42A22] focus:outline-none focus:ring-1 focus:ring-[#A42A22]"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2 text-[13px] text-gray-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#A42A22] focus:ring-[#A42A22]"
                />
                <span>I agree to the Terms and Privacy Policy</span>
              </label>
            </div>

            {err && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-[#C02B2B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#A42A22] focus:outline-none focus:ring-2 focus:ring-[#A42A22] focus:ring-offset-2 disabled:opacity-50 transition-colors mt-2"
            >
              {busy ? 'Creating account...' : 'Create account'}
            </button>
            
            <div className="text-center text-[13px] text-gray-500 pt-2">
              Already have an account? <Link href="/login" className="font-medium text-[#A42A22] hover:underline">Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}