// src/pages/index.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Creator = {
  key: string;   // ex: "toulouse"
  city: string;  // ex: "Toulouse"
  name: string;  // ex: "Margaux"
};

const CREATORS: Creator[] = [
  { city: "Toulouse",key: "toulouse", name: "Margaux" },
  { key: "marseille", city: "Marseille", name: "Mehdi" }
  // Tu pourras ajouter Paris/Marseille etc plus tard
];

export default function Home() {
  const router = useRouter();

  const [selected, setSelected] = useState(CREATORS[0].key);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const creatorKey = selected;

  useEffect(() => {
    async function check() {
      setStatusLoading(true);
      setStatusError(null);
      try {
        const r = await fetch(`/api/creator-status?creator_key=${encodeURIComponent(creatorKey)}`);
        const j = await r.json();
        setIsConnected(!!j.is_connected);
      } catch (e: any) {
        setStatusError(e?.message || "Failed to load status");
      } finally {
        setStatusLoading(false);
      }
    }
    check();
  }, [creatorKey]);

  const goDrafts = () => router.push(`/publish?creator_key=${encodeURIComponent(creatorKey)}`);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              <span className="h-2 w-2 rounded-full bg-[#FE2C55]" />
              Creator Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Creator accounts</h1>
            <p className="mt-2 max-w-xl text-zinc-400">
              Connect a Tiktok account, review drafts, and publish videos.
            </p>
          </div>

          <div className="hidden sm:block">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
              <div className="font-semibold text-white">Quick tips</div>
              <div className="mt-1 text-zinc-400">
                Use the drafts page to preview the video and set post options.
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Selector */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm font-semibold">Creator account</div>
            <p className="mt-1 text-sm text-zinc-400">Choose a creator profile.</p>

            <div className="mt-4 space-y-2">
              {CREATORS.map((c) => {
                const active = c.key === selected;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelected(c.key)}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left transition",
                      active
                        ? "border-zinc-700 bg-zinc-900"
                        : "border-zinc-900 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/40",
                    ].join(" ")}
                  >
<div>
  <div className="font-semibold text-white">{c.name}</div>
  <div className="mt-1 text-xs text-zinc-400">{c.city}</div>
</div>                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-zinc-300">Connection status</div>
                {statusLoading ? (
                  <span className="text-zinc-400">Loading…</span>
                ) : (
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-xs",
                      isConnected ? "bg-green-500/15 text-green-300" : "bg-zinc-800 text-zinc-300",
                    ].join(" ")}
                  >
                    {isConnected ? "Connected" : "Not connected"}
                  </span>
                )}
              </div>

              {statusError && <div className="mt-2 text-xs text-red-300">❌ {statusError}</div>}

              <div className="mt-4 flex gap-3">
                {isConnected ? (
                  <>
                    <button
                      onClick={goDrafts}
                      className="flex-1 rounded-full bg-[#FE2C55] px-4 py-3 text-sm font-semibold hover:bg-[#e02147]"
                    >
                      Open drafts
                    </button>
                    <button
                      onClick={() => router.push(`/api/oauth/start?creator_key=${encodeURIComponent(creatorKey)}`)}
                      className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900"
                    >
                      Reconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => router.push(`/api/oauth/start?creator_key=${encodeURIComponent(creatorKey)}`)}
                    className="w-full rounded-full bg-[#FE2C55] px-4 py-3 text-sm font-semibold hover:bg-[#e02147]"
                  >
                    Connect account
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">What you can do</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Review drafts, update metadata, and publish manually.
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-zinc-600" />
                Ready
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { title: "Select account", desc: "Pick a TikTok account profile." },
                { title: "Review draft", desc: "Preview the video and edit text." },
                { title: "Publish", desc: "Choose options and post manually." },
              ].map((b) => (
                <div key={b.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
                  <div className="text-sm font-semibold">{b.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{b.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900 p-5">
              <div className="text-sm font-semibold">Selected</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm">{creatorKey}</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm">
                  {CREATORS.find((c) => c.key === creatorKey)?.name ?? "—"}
                </span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm">
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>

              <button
                onClick={goDrafts}
                className="mt-4 rounded-full border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-900"
              >
                Go to drafts →
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}