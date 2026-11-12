import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SMARAN — स्मरण",
    short_name: "SMARAN",
    description:
      "Remember Him. Stay Connected. Daily chanting, authentic Bhagavad Gītā study, and quiet devotional community.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1628",
    theme_color: "#0C152B",
  };
}

