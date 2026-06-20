import type { MetadataRoute } from "next";

const BASE_URL = "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/play`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
