// sitemap.xml: the public pages Google should index.
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://collabrr.io/", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  ];
}
