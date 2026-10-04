import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="SkyCity home">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      skycity<span className="brand-dot">®</span>
    </Link>
  );
}
