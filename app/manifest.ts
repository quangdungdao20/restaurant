import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coffee Shop POS",
    short_name: "Coffee POS",
    description: "Phần mềm quản lý bán hàng và gọi món cho quán ăn",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#b45309",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
