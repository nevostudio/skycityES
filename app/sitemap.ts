import type { MetadataRoute } from "next";
import { readState } from "@/lib/store";
import { appUrl } from "@/lib/config";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await readState();
  return [
    { url: appUrl(), changeFrequency: "daily", priority: 1 },
    { url: `${appUrl()}/auctions`, changeFrequency: "daily", priority: 0.8 },
    ...s.districts.map((d) => ({
      url: `${appUrl()}/city/${d.id}`,
      priority: 0.7,
    })),
    ...s.properties
      .filter((p) => p.enabled)
      .map((p) => ({
        url: `${appUrl()}/city/${p.districtId}/${p.id}`,
        priority: 0.6,
      })),
    ...s.auctions
      .filter((a) => a.status === "live")
      .map((a) => ({
        url: `${appUrl()}/auctions/${a.propertyId}`,
        priority: 0.7,
      })),
  ];
}
