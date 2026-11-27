// robots.txt: the marketing site is public; the app behind sign-in is not
// for search engines, so the homepage is what people find for "collabrr".
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/explore", "/event/", "/card/", "/create", "/profile", "/select-org"],
    },
    sitemap: "https://collabrr.io/sitemap.xml",
    host: "https://collabrr.io",
  };
}
