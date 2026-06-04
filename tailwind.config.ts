import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f9fb",
        foreground: "#2d3748",
        card: { DEFAULT: "#ffffff", foreground: "#2d3748" },
        primary: { DEFAULT: "#6b9fd4", foreground: "#ffffff" },
        secondary: { DEFAULT: "#e8f4ec", foreground: "#2d5a3d" },
        muted: { DEFAULT: "#f1f3f6", foreground: "#64748b" },
        accent: { DEFAULT: "#ede9f7", foreground: "#4a3f6b" },
        destructive: { DEFAULT: "#e8a87c", foreground: "#7c4a2a" },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#6b9fd4",
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
