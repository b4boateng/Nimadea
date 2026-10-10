"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { authFetch, clearAuthToken, getAuthToken } from "@/lib/api";

type ProfileResponse = {
  username: string;
};

export default function AuthStatus() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!getAuthToken()) return;

    authFetch("/api/auth/profile/")
      .then(async (response) => {
        if (!response.ok) return;
        const data: ProfileResponse = await response.json();
        setUsername(data.username);
      })
      .catch(() => setUsername(null));
  }, []);

  if (!username) {
    return (
      <Link href="/auth" className="text-xs font-medium text-slate-300 hover:text-white">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/settings" className="text-xs text-slate-300 hover:text-white">{username}</Link>
      <button
        type="button"
        onClick={() => {
          clearAuthToken();
          // A full navigation clears any authenticated page state.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/auth");
        }}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
