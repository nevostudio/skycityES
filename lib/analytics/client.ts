import type { EventName } from "@/types";
export function track(event: EventName, propertyId = "") {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, propertyId }),
    keepalive: true,
  }).catch(() => {});
}
