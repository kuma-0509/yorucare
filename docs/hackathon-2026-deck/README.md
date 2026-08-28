# 提出スライドの組み立て

都知事杯オープンデータ・ハッカソン 2026 の提出スライドを、
`build-deck.js` から組み立てる。

`.pptx` と素材は `.gitignore` の方針どおり追跡しない（`*.pptx` は除外対象）。
追跡するのはこの手順と、トンマナを決める
[`design-system.md`](./design-system.md)、および生成スクリプトである。

## 直すときの順番

1. [`design-system.md`](./design-system.md) を読む
2. 色・字送り・格子を変えるなら、先に `design-system.md` を直す
3. `build-deck.js` の `C` / `T` / `G` を合わせる
4. 組み直して目視で確認する

1枚だけ例外の色やサイズを足さない。継ぎ足すと、改稿前と同じ状態へ戻る。

## 素材の用意

`build-deck.js` と同じ階層に `assets/` を置く。中身は次の4点。

| ファイル | 内容 | 作り方 |
| --- | --- | --- |
| `hero_phone.jpg` | 表紙の端末画面 | アプリの実機スクリーンショット |
| `demo.mp4` | 5枚目の実演録画（約23秒） | `record-demo.js` が書き出す |
| `demo_poster.jpg` | 動画のポスター（PDF配布時に残る絵） | 同上 |
| `founder.jpg` | 人物写真（正方形 900×900） | 撮影データから切り出す |

### 実演録画（`demo.mp4` / `demo_poster.jpg`）

`record-demo.js` が、実際に動いているアプリを操作して収録する。手作業の画面収録は使わない。
改稿前は表紙を写した録画をそのまま貼っていたため、5枚目が1枚目と同じ絵になっていた。

収録する流れは次の4つで、約23秒。

1. 簡単に記録できる（気分を選んで保存する）
2. ふりかえりで確かめる（35日分の記録から月のグラフを出す）
3. 記録項目を自分に合わせる（カスタム入力で項目を足す）
4. 相談先を地域から探す（区市町村を選んで窓口を出す）

グラフは35件そろってから出す。`demo-seed.js` が34日分を入れ、収録中に1件書いて35件にする。
見本データはすべて作りもので、実在の体調・服薬・面談の内容は含めない。

```bash
# 1. アプリを動かす（別の端末で動いているなら YORUCARE_URL で指す）
pnpm dev

# 2. 収録する。ffmpeg と Playwright の Chromium が要る
npm install playwright
node docs/hackathon-2026-deck/record-demo.js
```

`assets/demo.mp4`（860×1764）と `assets/demo_poster.jpg` ができる。

間合いを変えたいときは `record-demo.js` の `SPEED` を動かす。個々の待ち時間の比は
そのままに、全体の長さだけが変わる。20〜25秒に収める。

環境変数:

- `YORUCARE_URL` — 収録するアプリのURL（既定 `http://localhost:3000`）
- `CHROME_PATH` — Chromium の場所（既定は Playwright が入れたもの）

収録は `localStorage` に見本データを入れ、案内・同意のダイアログが出ない状態にしてから
始める。開発用のバッジも画面から外している。

## 組み立て

```bash
npm install pptxgenjs   # このリポジトリの依存には含めない
node docs/hackathon-2026-deck/build-deck.js
```

`docs/hackathon-2026-deck/out/yorucare-hackathon-2026.pptx` ができる。

## 確認

```bash
# 画像に書き出して1枚ずつ見る
soffice --headless --convert-to pdf out/yorucare-hackathon-2026.pptx
pdftoppm -jpeg -r 150 out/yorucare-hackathon-2026.pdf slide
```

見るところ。

- 文字が枠や画面の外へ出ていないか（`Meiryo` が無い環境では別の書体に置き換わり、
  幅が変わる。本番の PowerPoint とは折り返しが違うので、余裕を1割見ておく）
- 説明文と画面の中身が合っているか（4つの場面が動画の順番どおりか）
- 脚注・フッターが本文と重なっていないか
- カードの下に不自然な空きが残っていないか

## 発表時

- 5枚目の端末は録画である。会場では再生し、PDFで配るときはポスター画像が残る
- 録画は約23秒。右の4枚のカードが、そのまま動画の順番になっている
- 表紙の要約は発表者ノートに入れてある
