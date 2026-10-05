import { Eye } from "lucide-react";
import type { CityMetrics as Metrics } from "@/types";
import { socialNumber } from "@/lib/city-social";

export function CityMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <div className="city-metrics" aria-label="Actividad de SkyCity">
      <span
        className="city-online"
        title={
          metrics.onlineSource === "demo"
            ? "Personas en línea: dato de demostración"
            : metrics.onlineSource === "unavailable"
              ? "Recuento de personas en línea aún no disponible"
              : "Personas en línea"
        }
      >
        <i className={metrics.online === null ? "offline" : ""} />
        <strong>
          {metrics.online === null ? "—" : socialNumber(metrics.online)}
        </strong>
        <span className="metric-label">en línea</span>
        {metrics.onlineSource === "demo" && <small>demo</small>}
      </span>
      <span title="Visitas registradas de la ciudad; se cuenta una por sesión de 30 minutos">
        <Eye size={16} aria-hidden="true" />
        <strong>{socialNumber(metrics.totalVisits)}</strong>
        <span className="metric-label">visitas</span>
      </span>
    </div>
  );
}
