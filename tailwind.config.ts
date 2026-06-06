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
        primary: { DEFAULT: "#3d7ab8", foreground: "#ffffff" },
        secondary: { DEFAULT: "#e8f4ec", foreground: "#2d5a3d" },
        success: { DEFAULT: "#e8f4ec", foreground: "#2d5a3d" },
        muted: { DEFAULT: "#f1f3f6", foreground: "#64748b" },
        accent: { DEFAULT: "#ede9f7", foreground: "#4a3f6b" },
        caution: {
          DEFAULT: "#fef3e8",
          foreground: "#7c4a2a",
          border: "#e8a87c",
        },
        destructive: { DEFAULT: "#dc6b6b", foreground: "#ffffff" },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#3d7ab8",
      },
      borderRadius: {
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      spacing: {
        nav: "3.5rem",
        "action-bar": "3.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
