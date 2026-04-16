import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BaseDare",
    short_name: "BaseDare",
    description: "Own the grid. Discover real IRL dares, live venues, and on-chain proof.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020204",
    theme_color: "#050510",
    categories: ["social", "entertainment", "lifestyle", "navigation"],
    icons: [
      {
        src: "/assets/basedare-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/basedare-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/basedare-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/assets/basedarenew.png",
        sizes: "1536x1024",
        type: "image/png",
        form_factor: "wide",
        label: "BaseDare venue and dare discovery",
      },
    ],
    shortcuts: [
      {
        name: "Create Dare",
        short_name: "Create",
        description: "Launch a new dare",
        url: "/create",
      },
      {
        name: "Open Map",
        short_name: "Map",
        description: "Explore nearby venues and dares",
        url: "/map",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open your command base",
        url: "/dashboard",
      },
    ],
  };
}
