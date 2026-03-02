// src/pages/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();

  const [selectedCreatorKey, setSelectedCreatorKey] = useState("toulouse");
  const [isConnected, setIsConnected] = useState(false);

  const connected = router.query.connected === "1";

  const oauthError =
    typeof router.query.error === "string" ? router.query.error : null;

  const connectedCreatorKey = useMemo(() => {
    const v = router.query.creator_key;
    return typeof v === "string" ? v : null;
  }, [router.query.creator_key]);

  // si on arrive du callback avec creator_key, on le met dans le select
  useEffect(() => {
    if (connectedCreatorKey) {
      setSelectedCreatorKey(connectedCreatorKey);
    }
  }, [connectedCreatorKey]);

  // check Airtable status pour la ville sélectionnée
  useEffect(() => {
    async function checkStatus() {
      try {
        const r = await fetch(
          `/api/creator-status?creator_key=${encodeURIComponent(
            selectedCreatorKey
          )}`
        );
        const data = await r.json();
        setIsConnected(!!data?.is_connected);
      } catch {
        setIsConnected(false);
      }
    }

    checkStatus();
  }, [selectedCreatorKey]);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>
        Creator Dashboard (Audit MVP)
      </h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Select a city account, connect TikTok, then review & publish posts
        manually.
      </p>

      {connected && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #0a0",
            borderRadius: 8,
          }}
        >
          ✅ TikTok connected for <b>{connectedCreatorKey ?? "this city"}</b>
        </div>
      )}

      {oauthError && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            border: "1px solid #a00",
            borderRadius: 8,
          }}
        >
          ❌ OAuth error: <b>{oauthError}</b>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          City account
        </label>

        <select
          value={selectedCreatorKey}
          onChange={(e) => setSelectedCreatorKey(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #000" }}
        >
          <option value="toulouse">Toulouse — Margaux</option>
          {/* plus tard: paris, marseille, etc */}
        </select>
      </div>

      <div style={{ marginTop: 16 }}>
        {isConnected ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div>✅ Already connected</div>

            <a
              href={`/api/oauth/start?creator_key=${encodeURIComponent(
                selectedCreatorKey
              )}`}
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #000",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Reconnect
            </a>
          </div>
        ) : (
          <a
            href={`/api/oauth/start?creator_key=${encodeURIComponent(
              selectedCreatorKey
            )}`}
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #000",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Continue with TikTok
          </a>
        )}
      </div>
    </main>
  );
}