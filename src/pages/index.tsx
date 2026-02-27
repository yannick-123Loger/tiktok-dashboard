// src/pages/index.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const [creatorKey, setCreatorKey] = useState("toulouse");
  const connected = router.query.connected === "1";
  const oauthError = typeof router.query.error === "string";

  useEffect(() => {
    const queryCreatorKey = router.query.creator_key;
    if (typeof queryCreatorKey === "string" && queryCreatorKey.length > 0) {
      setCreatorKey(queryCreatorKey);
    }
  }, [router.query.creator_key]);

  return (
    <div className="page">
      <div className="aurora auroraLeft" aria-hidden="true" />
      <div className="aurora auroraRight" aria-hidden="true" />

      <main className="container">
        <section className="hero card">
          <p className="eyebrow">Creator Dashboard</p>
          <h1>Connecte ton compte TikTok et publie sans friction.</h1>
          <p className="lead">
            Choisis une ville, connecte le profil associé, puis continue vers le
            workflow de validation et publication.
          </p>
          <div className="chips">
            <span>OAuth TikTok</span>
            <span>Publication manuelle</span>
            <span>Multi-comptes</span>
          </div>
        </section>

        <section className="card panel">
          <div className="panelTop">
            <h2>Connexion</h2>
            {connected ? (
              <p className="success">Compte connecté avec succès.</p>
            ) : oauthError ? (
              <p className="error">La connexion a échoué, réessaie.</p>
            ) : (
              <p className="muted">Connecte un compte pour commencer.</p>
            )}
          </div>

          <label className="fieldLabel" htmlFor="creator-key">
            Compte ville
          </label>
          <select
            id="creator-key"
            className="select"
            value={creatorKey}
            onChange={(e) => setCreatorKey(e.target.value)}
          >
            <option value="toulouse">Toulouse - Margaux</option>
          </select>

          <a
            href={`/api/oauth/start?creator_key=${encodeURIComponent(creatorKey)}`}
            className="cta"
          >
            Continuer avec TikTok
          </a>

          <p className="info">
            En local, TikTok peut bloquer le flow si l&apos;URI de callback n&apos;est pas
            whitelistée.
          </p>

          <div className="steps">
            <article>
              <strong>1. Connexion</strong>
              <p>Autorise TikTok pour ce compte.</p>
            </article>
            <article>
              <strong>2. Validation</strong>
              <p>Vérifie les contenus avant envoi.</p>
            </article>
            <article>
              <strong>3. Publication</strong>
              <p>Lance la publication manuelle.</p>
            </article>
          </div>

          <div className="signals" aria-hidden="true">
            <span className="signal successDot">Succès</span>
            <span className="signal failureDot">Échec</span>
            <span className="signal warningDot">Warning</span>
          </div>
        </section>
      </main>

      <style jsx>{`
        .page {
          --color-cta: #314dac;
          --color-text: #1c1c1c;
          --color-secondary: #575763;
          --color-info: #314dac;
          --color-cell: #f0f3ff;
          --color-success: #65ab6f;
          --color-failure: #dd1824;
          --color-warning: #fbd46d;
          --line: rgba(49, 77, 172, 0.18);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 15% 20%, rgba(49, 77, 172, 0.16) 0%, transparent 36%),
            radial-gradient(circle at 90% 10%, rgba(251, 212, 109, 0.28) 0%, transparent 35%),
            linear-gradient(150deg, #f9faff 0%, #eef2ff 100%);
          color: var(--color-text);
          font-family: "Oatmeal Pro", "OatmealPro", "Avenir Next", "Helvetica Neue", sans-serif;
          padding: 40px 20px 48px;
        }

        .aurora {
          position: absolute;
          border-radius: 999px;
          filter: blur(48px);
          opacity: 0.5;
          pointer-events: none;
          animation: drift 12s ease-in-out infinite alternate;
        }

        .auroraLeft {
          width: 240px;
          height: 240px;
          left: -60px;
          top: 70px;
          background: rgba(49, 77, 172, 0.35);
        }

        .auroraRight {
          width: 260px;
          height: 260px;
          right: -80px;
          bottom: 80px;
          background: rgba(251, 212, 109, 0.4);
          animation-delay: 1.4s;
        }

        .container {
          position: relative;
          z-index: 1;
          width: min(980px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
        }

        .card {
          border: 1px solid var(--line);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(10px);
          box-shadow:
            0 18px 42px rgba(49, 77, 172, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.45);
          animation: rise 0.75s both;
        }

        .hero {
          padding: 34px 30px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .eyebrow {
          margin: 0;
          display: inline-flex;
          width: fit-content;
          font-size: 0.8rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-info);
          border: 1px solid rgba(49, 77, 172, 0.34);
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(49, 77, 172, 0.08);
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3.1rem);
          line-height: 1.02;
          font-weight: 700;
          max-width: 16ch;
        }

        .lead {
          margin: 0;
          color: var(--color-secondary);
          line-height: 1.55;
          max-width: 50ch;
        }

        .chips {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chips span {
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--color-cell);
          border: 1px solid var(--line);
          font-size: 0.88rem;
          color: var(--color-info);
        }

        .panel {
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          animation-delay: 0.12s;
        }

        .panelTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
          margin-bottom: 14px;
        }

        h2 {
          margin: 0;
          font-size: 1.34rem;
          font-weight: 700;
        }

        .muted,
        .success,
        .error {
          margin: 0;
          font-size: 0.88rem;
        }

        .muted {
          color: var(--color-secondary);
        }

        .success {
          color: var(--color-success);
          font-weight: 700;
        }

        .error {
          color: var(--color-failure);
          font-weight: 600;
        }

        .fieldLabel {
          display: block;
          font-size: 0.88rem;
          margin-bottom: 8px;
          color: var(--color-secondary);
        }

        .select {
          width: 100%;
          border: 1px solid var(--line);
          background: var(--color-cell);
          color: var(--color-text);
          border-radius: 14px;
          padding: 12px 14px;
          font: 500 0.96rem/1.3 "Oatmeal Pro", "OatmealPro", "Avenir Next", "Helvetica Neue", sans-serif;
        }

        .select:focus-visible {
          outline: 2px solid rgba(49, 77, 172, 0.5);
          outline-offset: 2px;
        }

        .cta {
          margin-top: 14px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #ffffff;
          background: linear-gradient(135deg, var(--color-cta) 0%, #415fc3 100%);
          padding: 13px 16px;
          border-radius: 14px;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            filter 160ms ease;
          box-shadow: 0 12px 20px rgba(49, 77, 172, 0.26);
        }

        .cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
          box-shadow: 0 14px 24px rgba(49, 77, 172, 0.3);
        }

        .info {
          margin: 12px 2px 0;
          color: var(--color-info);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .steps {
          margin-top: 20px;
          display: grid;
          gap: 10px;
        }

        .steps article {
          border: 1px dashed rgba(49, 77, 172, 0.3);
          border-radius: 14px;
          padding: 12px;
          background: var(--color-cell);
        }

        .steps strong {
          display: block;
          font-size: 0.92rem;
          color: var(--color-text);
        }

        .steps p {
          margin: 4px 0 0;
          color: var(--color-secondary);
          font-size: 0.88rem;
        }

        .signals {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .signal {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 0.78rem;
          font-weight: 600;
          background: #fff;
        }

        .successDot {
          color: #33613a;
          border-color: rgba(101, 171, 111, 0.55);
          background: rgba(101, 171, 111, 0.16);
        }

        .failureDot {
          color: #7f0f17;
          border-color: rgba(221, 24, 36, 0.45);
          background: rgba(221, 24, 36, 0.12);
        }

        .warningDot {
          color: #6d5a17;
          border-color: rgba(251, 212, 109, 0.65);
          background: rgba(251, 212, 109, 0.25);
        }

        @media (max-width: 820px) {
          .container {
            grid-template-columns: 1fr;
          }

          .hero,
          .panel {
            padding: 24px 20px;
          }

          .panelTop {
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 12px;
          }
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drift {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(0, -16px, 0) scale(1.07);
          }
        }
      `}</style>
    </div>
  );
}
