"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setErr(error.message);

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <input
        className="w-full border rounded-md p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <input
        className="w-full border rounded-md p-2"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      {err && <div className="text-sm text-red-600">{err}</div>}

      <button className="w-full border rounded-md px-4 py-2" disabled={loading}>
        {loading ? "Logging in..." : "Log in"}
      </button>

      <div className="text-sm opacity-80 flex gap-4">
        <a className="underline" href="/signup">Create account</a>
        <a className="underline" href="/forgot-password">Forgot password</a>
      </div>
    </form>
  );
}