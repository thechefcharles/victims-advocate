"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) return setErr(error.message);
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>

      <input
        className="w-full border rounded-md p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      {err && <div className="text-sm text-red-600">{err}</div>}
      {sent && <div className="text-sm text-green-700">Check your email for a reset link.</div>}

      <button className="w-full border rounded-md px-4 py-2">
        Send reset link
      </button>
    </form>
  );
}