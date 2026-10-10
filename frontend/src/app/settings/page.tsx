"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api";

type Profile = {
  username: string;
  email: string;
  profile: { display_name: string };
};

type Settings = {
  timezone: string;
  email_notifications: boolean;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>({ timezone: "UTC", email_notifications: true });
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      authFetch("/api/auth/profile/").then((response) => response.json()),
      authFetch("/api/auth/settings/").then((response) => response.json()),
    ]).then(([profileData, settingsData]) => {
      setProfile(profileData);
      setDisplayName(profileData.profile?.display_name || "");
      setSettings(settingsData);
    }).catch(() => setMessage("Could not load your settings."));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await authFetch("/api/auth/profile/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName }),
    });
    setMessage(response.ok ? "Profile saved." : "Could not save profile.");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await authFetch("/api/auth/settings/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setMessage(response.ok ? "Settings saved." : "Could not save settings.");
  }

  return (
    <main className="min-h-screen bg-appDark text-appText p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-sm text-brandBlue hover:underline">Back to notebooks</Link>
          <h1 className="mt-4 text-3xl font-bold">Account settings</h1>
          <p className="mt-1 text-sm text-slate-400">{profile?.username || "Your profile"}</p>
        </div>

        {message && <p className="rounded-lg border border-brandBlue/40 bg-brandBlue/10 p-3 text-sm text-slate-200">{message}</p>}

        <form onSubmit={saveProfile} className="rounded-xl border border-slate-700 bg-appGray p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <p className="mb-4 text-sm text-slate-400">Email: {profile?.email || "Not provided"}</p>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="display-name">Display name</label>
          <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-brandBlue" />
          <button className="rounded-lg bg-brandBlue px-4 py-2 text-sm font-medium text-white">Save profile</button>
        </form>

        <form onSubmit={saveSettings} className="rounded-xl border border-slate-700 bg-appGray p-6">
          <h2 className="mb-4 text-lg font-semibold">Preferences</h2>
          <label className="mb-2 block text-sm text-slate-300" htmlFor="timezone">Timezone</label>
          <input id="timezone" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-brandBlue" />
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={settings.email_notifications} onChange={(event) => setSettings({ ...settings, email_notifications: event.target.checked })} />
            Email notifications
          </label>
          <button className="rounded-lg bg-brandBlue px-4 py-2 text-sm font-medium text-white">Save preferences</button>
        </form>
      </div>
    </main>
  );
}
