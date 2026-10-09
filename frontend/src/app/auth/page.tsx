"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { apiUrl, setAuthToken } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint = registering ? "/api/auth/register/" : "/api/auth/login/";
      const payload = registering ? { username, email, password } : { username, password };
      const response = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.detail || "Authentication failed.");
        return;
      }
      setAuthToken(data.token);
      router.push("/");
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-appDark text-appText flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md bg-appGray border border-slate-700 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          {registering ? <UserPlus className="text-brandBlue" /> : <LogIn className="text-brandBlue" />}
          <div>
            <h1 className="text-2xl font-bold">{registering ? "Create account" : "Welcome back"}</h1>
            <p className="text-sm text-slate-400">Private study workspaces, scoped to you.</p>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <label className="block text-sm text-slate-300 mb-2" htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required className="w-full mb-4 rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-brandBlue" />

        {registering && (
          <>
            <label className="block text-sm text-slate-300 mb-2" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full mb-4 rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-brandBlue" />
          </>
        )}

        <label className="block text-sm text-slate-300 mb-2" htmlFor="password">Password</label>
        <input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full mb-6 rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-brandBlue" />

        <button disabled={busy} className="w-full rounded-lg bg-brandBlue py-3 font-medium text-white disabled:opacity-50">
          {busy ? "Please wait..." : registering ? "Register" : "Login"}
        </button>

        <button type="button" onClick={() => setRegistering((value) => !value)} className="mt-4 w-full text-sm text-brandBlue hover:underline">
          {registering ? "Already have an account? Login" : "Need an account? Register"}
        </button>
        <Link href="/" className="mt-5 block text-center text-xs text-slate-500 hover:text-slate-300">Back to home</Link>
      </form>
    </main>
  );
}
