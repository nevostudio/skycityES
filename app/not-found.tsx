import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-card">
      <span className="eyebrow">OFF THE MAP</span>
      <h1>This address is still a daydream.</h1>
      <p className="muted">
        We couldn’t find this building. There are plenty more to explore.
      </p>
      <Link href="/" className="button coral">
        Back to SkyCity ↗
      </Link>
    </main>
  );
}
