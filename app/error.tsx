"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-card">
      <span className="eyebrow">A SHORT DETOUR</span>
      <h1>The city needs a moment.</h1>
      <p className="muted">
        We couldn’t load this part of SkyCity. Please try again.
      </p>
      <button className="button coral" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
