"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "victim" }, // handy metadata (not security)
      },
    });

    setLoading(false);

    if (error) return setErr(error.message);

    // If email confirmation is enabled, session may be null until confirmed.
    if (!data.session) {
      setSuccess("Account created. Please check your email to confirm, then log in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create account</h1>

      <input
        className="w-full border rounded-md p-2"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <input
        className="w-full border rounded-md p-2"
        placeholder="Password (min 8 characters)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      {err && <div className="text-sm text-red-600">{err}</div>}
      {success && <div className="text-sm text-green-700">{success}</div>}

      <button className="w-full border rounded-md px-4 py-2" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
      </button>

      <div className="text-sm opacity-80">
        <a className="underline" href="/login">Already have an account?</a>
      </div>
    </form>
  );
}