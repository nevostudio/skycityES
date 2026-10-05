import type { ValueStep } from "@/types";
import { euro } from "@/lib/client";

/**
 * The staircase (PDF page 4): every bar is a real settled payment for this location —
 * the initial purchase, then each takeover. The current value is the last bar, in orange.
 */
export function ValueHistory({
  steps,
  max = 5,
}: {
  steps: ValueStep[];
  max?: number;
}) {
  if (!steps.length) return null;
  const shown = steps.slice(-max);
  const hidden = steps.length - shown.length;
  const top = Math.max(...shown.map((s) => s.amount));
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  return (
    <figure className="value-history" aria-label="Historial de valor">
      <ol>
        {shown.map((s, i) => {
          const last = i === shown.length - 1;
          return (
            <li
              key={`${s.at}${i}`}
              className={last ? "current" : undefined}
              title={`${s.brand} · ${euro(s.amount)} · ${new Date(s.at).toLocaleString("es-ES")}`}
            >
              <strong>{euro(s.amount)}</strong>
              <span
                className="bar"
                style={{
                  height: `${Math.max(14, (s.amount / top) * 100)}%`,
                  opacity: last ? 1 : 0.55 + (0.35 * (i + 1)) / shown.length,
                }}
              />
              <small>{s.kind === "build" ? "INICIO" : "TAKEOVER"}</small>
              <em>
                {date(s.at)}
                {s.brand ? ` · ${s.brand}` : ""}
              </em>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <figcaption>
          {hidden} {hidden === 1 ? "cambio anterior" : "cambios anteriores"}
        </figcaption>
      )}
    </figure>
  );
}
