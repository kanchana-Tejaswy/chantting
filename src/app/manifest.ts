import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SMARAN — स्मरण",
    short_name: "SMARAN",
    description:
      "Remember Him. Stay Connected. Daily chanting, authentic Bhagavad Gītā study, and quiet devotional community.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D1628",
    theme_color: "#0C152B",
    categories: ["lifestyle", "utilities"],
    icons: [
      {
        src: "/media/nav-drsti.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/media/nav-drsti.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
