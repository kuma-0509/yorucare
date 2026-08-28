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

`build-deck.js` と同じ階層に `assets/` を置く。中身は次の6点。

| ファイル | 内容 |
| --- | --- |
| `hero_phone.jpg` | 表紙の端末画面（アプリの実機スクリーンショット） |
| `demo.mp4` | 5枚目の実演録画（端末部分だけを切り出したもの） |
| `screen_write.jpg` | 書く画面 |
| `screen_list.jpg` | これまで画面 |
| `screen_chart.jpg` | ふりかえり画面 |
| `founder.jpg` | 人物写真（正方形 900×900） |

画面収録が 1920×1080 で、端末が x=1240 / y=68 の位置に 460×944 で写っている場合、
録画と静止画は次で作れる。座標は録画ごとに変わるため、実際の映像で確認する。

```bash
# 端末部分だけを切り出し、2倍に拡大して再エンコードする
ffmpeg -i 収録.mp4 \
  -vf "crop=460:944:1240:68,scale=920:1888:flags=lanczos" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -an -movflags +faststart \
  assets/demo.mp4

# 同じ録画から3画面を抜き出す（秒数は録画に合わせる）
ffmpeg -ss 2  -i assets/demo.mp4 -frames:v 1 -q:v 2 assets/screen_write.jpg
ffmpeg -ss 19 -i assets/demo.mp4 -frames:v 1 -q:v 2 assets/screen_list.jpg
ffmpeg -ss 45 -i assets/demo.mp4 -frames:v 1 -q:v 2 assets/screen_chart.jpg
```

切り出した画面が説明文と合っているか、必ず目で確かめる。
改稿前は、表紙を写した録画をそのまま貼っていたため、
5枚目が1枚目と同じ絵になっていた。

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
- 説明文と画面の中身が合っているか
- 脚注・フッターが本文と重なっていないか
- カードの下に不自然な空きが残っていないか

## 発表時

- 5枚目の1台目は録画である。会場では再生し、PDFで配るときはポスター画像が残る
- 表紙の要約は発表者ノートに入れてある
