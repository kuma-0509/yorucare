/** 卒業制作の図解ページ専用の Tailwind 設定。
 *  アプリ本体（tailwind.config.ts）とは別物で、図解の配色・書体だけを持つ。 */
module.exports = {
  content: [`${__dirname}/page.html`],
  theme: {
    extend: {
      colors: {
        ground: "#080B18",
        surface: "#111830",
        raised: "#18203C",
        line: "#28325A",
        ink: "#E9ECF7",
        muted: "#98A2C8",
        dim: "#6E78A0",
        moon: "#F2C97D",
        care: "#86AEF2",
        mint: "#7ED3B2",
        rose: "#EE8FA0",
      },
      fontFamily: {
        display: ['"Shippori Mincho B1"', "serif"],
        sans: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      maxWidth: { page: "1080px" },
    },
  },
  plugins: [],
};
