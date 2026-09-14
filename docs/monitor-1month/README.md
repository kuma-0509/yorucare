# ヨルケア 1か月モニター（2026年10月20日〜11月15日）募集資材

事業計画の「試運転（1か月）」の募集に使う資材一式です。定員は事業計画の最少3名から**6名（3名×2グループ）**に変更しています。

関連ファイル：
- 確定仕様（正本）: `../evidence/yorucare-5month-program-spec.md`
- 事業計画: `../business-plan-return-to-work.md`

## 中身

| ファイル | 用途 |
|---|---|
| `ヨルケア募集チラシ_両面_A4.pdf` | 手元のプリンタ／メール添付／LINE転送用（210×297mm） |
| `ヨルケア募集チラシ_両面_入稿用（塗り足し3mm付き）.pdf` | 印刷所入稿用（216×303mm・塗り足し3mm） |
| `flyer/` | チラシのソースと再生成スクリプト |
| `ヨルケア参加同意説明書_A4.pdf` | 参加同意説明書（A4・7ページ） |
| `line-messages.html` | 公式LINE（@615ixfwt）の自動返信文面集 |
| `consent/` | 同意説明書のソースと再生成スクリプト |

## チラシの設計ルール

継ぎ足しで余白を削る作りを避けるため、次を固定しています。**情報を足すときは余白を削らず、各面の「予備の余白」を使ってください。**

- 仕上がり A4（794×1123px / 96dpi）＋ 塗り足し3mm（11px）＝ **816×1145px**
- 文字サイズは **11 / 14 / 18 / 22 / 28 / 35** の6段階のみ（比率 約1.27）
- 余白は **4 / 8 / 12 / 16 / 24 / 48** の8pxベース
- 本文幅 714px ＝ 12段グリッド（1段54px・ガター6px）
- 予備の余白（`.grow`）：表 約47px／裏 約41px

## 再生成のしかた

Google Fonts の Noto Sans JP を**実際に読み込ませて**測ります。代替フォントで測ると1行の折り返しが変わり、A4からはみ出しても気づけません（実際に一度はみ出しました）。

```bash
cd docs/monitor-1month/flyer
npm install qrcode jsqr            # QRの生成と読み取り検証に使う

# 実フォントを取得（fonts/ と gf.css はリポジトリに含めていません）
curl -sS -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" -o gf.css
mkdir -p fonts && i=0
for u in $(grep -o 'https://fonts.gstatic.com[^)]*' gf.css | sort -u); do
  i=$((i+1)); curl -sS -A "Mozilla/5.0" "$u" -o "fonts/n$i.ttf"
done

node build-preview.mjs Main Back   # 検証用プレビューを生成
node check-fit.mjs Main Back       # A4に収まるか判定（はみ出したら exit 1）
node build-pdf.mjs                 # PDF 2種類を出力
node verify-qr.mjs                 # チラシ上のQRが読めるか確認
```

## 同意説明書PDFの作り方

`consent/consent.html` が正本です。画面用の指定（幅760px・15px）のままでは紙に合わないので、
`build-pdf.mjs` が印刷用CSSを後から重ねて上書きします。**本文を直すときは `consent.html` だけを直してください。**

```bash
cd docs/monitor-1month/consent
npm install                        # pdfjs-dist（出力したPDFを画像にして確認する用）

# 実フォントを取得（fonts/ はリポジトリに含めていません）
mkdir -p fonts && cp ../flyer/fonts/*.ttf fonts/     # 本文用 Noto Sans JP（n1〜n4）
curl -sS -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@600;700&display=swap" -o zom.css
i=0; for u in $(grep -o 'https://fonts.gstatic.com[^)]*' zom.css | sort -u); do
  i=$((i+1)); curl -sS -A "Mozilla/5.0" "$u" -o "fonts/m$i.ttf"
done

node build-pdf.mjs                 # PDFを出力（フォント未読込・CSS差し込み失敗なら exit 1）
node shot-pdf.mjs                  # 出力したPDFを pg1..pgN.png に描画して目視確認
```

`shot-pdf.mjs` は `viewer.html` を **http で**開く必要があります（file:// ではモジュール読み込みがブロックされます）。
同じフォルダで `python3 -m http.server 8731` を動かしてから実行してください。

補助スクリプト：

- `crop.mjs` — 元写真を顔中心の正方形に切り出して縮小する（ImageMagick なしで動くよう Chromium を使用）
- `qr.mjs` — LINE ID からQRを生成し、復号して内容一致を確認する
- `sections.mjs` — 各セクションの高さを実測する（どこが重いか調べる用）

## 未確定・未着手

- **判断フローチャートと発言例**（確定仕様8章が作成を求めているもの）— 未作成
- **支援員向けの案内1枚** — 未作成
- チラシ裏面の「1週間の合計はおよそ60〜80分」は、セッションのみの数字。アプリ記録を含めると87〜94分
