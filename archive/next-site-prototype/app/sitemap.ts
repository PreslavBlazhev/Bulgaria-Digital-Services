import type { MetadataRoute } from "next";
import { SOLUTIONS } from "@/data/solutions";
import { PROJECTS } from "@/data/projects";
import { INSIGHTS } from "@/data/insights";
import { absoluteUrl } from "@/lib/site";

/**
 * Generated from the same data the pages render from, so a new case study or
 * article cannot be forgotten here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/solutions", priority: 0.9, changeFrequency: "monthly" },
    { path: "/work", priority: 0.9, changeFrequency: "monthly" },
    { path: "/technology", priority: 0.7, changeFrequency: "monthly" },
    { path: "/process", priority: 0.7, changeFrequency: "yearly" },
    { path: "/about", priority: 0.6, changeFrequency: "yearly" },
    { path: "/insights", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.9, changeFrequency: "yearly" },
    { path: "/build", priority: 0.8, changeFrequency: "monthly" },
    { path: "/consultant", priority: 0.8, changeFrequency: "monthly" },
    { path: "/client", priority: 0.6, changeFrequency: "monthly" },
    { path: "/status", priority: 0.3, changeFrequency: "daily" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...SOLUTIONS.map((solution) => ({
      url: absoluteUrl(`/solutions/${solution.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PROJECTS.map((project) => ({
      url: absoluteUrl(`/work/${project.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...INSIGHTS.map((insight) => ({
      url: absoluteUrl(`/insights/${insight.slug}`),
      lastModified: new Date(insight.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
