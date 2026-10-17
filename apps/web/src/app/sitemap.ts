import type { MetadataRoute } from "next";

const BASE = "https://midwaymover.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<{
    path: string;
    changeFrequency: "weekly" | "monthly";
    priority: number;
  }> = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/book", changeFrequency: "weekly", priority: 0.9 },
    { path: "/vision", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  ];
  return pages.map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
