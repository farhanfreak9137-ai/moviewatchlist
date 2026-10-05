'use client';

import React, { useState } from 'react';
import { useSync } from '@/hooks/useSync';
import { Cloud, LogOut, Loader2, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CloudAccountCard() {
  const { userEmail, isConfigured, signIn, signUp, signOut } = useSync();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        Cloud sync isn&apos;t configured in this build.
      </div>
    );
  }

  if (userEmail) {
    return (
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-emerald-300/80 font-semibold uppercase tracking-wider">Signed in</p>
            <p className="text-sm font-semibold text-white truncate">{userEmail}</p>
          </div>
        </div>
        <button
          id="cloud-sign-out"
          onClick={async () => {
            setBusy(true);
            await signOut();
            setBusy(false);
          }}
          disabled={busy}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          Sign out
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        const ready = await signUp(email.trim(), password);
        if (!ready) {
          setInfo('Account created. Open the confirmation email we sent, tap the link, then come back and sign in.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      const msg: string = err?.message || 'Something went wrong';
      setError(
        /invalid login/i.test(msg)
          ? 'Wrong email or password.'
          : /not confirmed/i.test(msg)
            ? 'Please confirm your email first (check your inbox), then sign in.'
            : msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
      <div className="flex items-center gap-2">
        <Cloud className="w-4 h-4 text-sky-400" />
        <p className="text-sm font-semibold text-white">
          {mode === 'signin' ? 'Sign in to sync' : 'Create your sync account'}
        </p>
      </div>
      <p className="text-[11px] text-slate-400">
        Use the same account on your phone and PC. Your library stays on each device and works offline; the cloud keeps them in step.
      </p>

      <label className="block">
        <span className="sr-only">Email</span>
        <div className="flex items-center gap-2 bg-[#181a24] rounded-xl border border-white/10 focus-within:border-sky-500 px-3">
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            id="cloud-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 min-w-0 bg-transparent text-white text-sm py-2.5 focus:outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="sr-only">Password</span>
        <div className="flex items-center gap-2 bg-[#181a24] rounded-xl border border-white/10 focus-within:border-sky-500 px-3">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            id="cloud-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="flex-1 min-w-0 bg-transparent text-white text-sm py-2.5 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </label>

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      <button
        id="cloud-submit"
        type="submit"
        disabled={busy}
        className={cn(
          'w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60',
          'bg-sky-600 hover:bg-sky-500'
        )}
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError(null);
          setInfo(null);
        }}
        className="w-full text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        {mode === 'signin' ? "First time? Create an account" : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
