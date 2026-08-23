# 卒業制作の図解（提出物）

AI-Driven School 第1期 土曜クラス【6ヶ月目】卒業制作『自分の武器を作る』の提出物。
ヨルケア（https://yorucare.vercel.app/）について、作ったもの・解決する面倒・作りたいと思った理由・工夫した点と苦戦した点をまとめた1枚の図解ページ。

## ファイル

| ファイル | 用途 |
| --- | --- |
| `index.html` | ブラウザでそのまま開ける完全なHTML。CSSと画面写真を埋め込み済み |
| `artifact.html` | `<head>` を持たない本文だけの版（外部の公開サービスへ貼る用） |
| `screenshots/` | 図解に埋め込む画面写真の原本（すべて検証用のダミーデータ） |
| `src/page.html` | 本文のソース。Tailwind のユーティリティクラスで書く |
| `src/input.css` | Tailwind の入口と、図解だけで使う数点のスタイル |
| `src/tailwind.config.cjs` | 図解専用の配色・書体（アプリ本体の設定とは別） |
| `src/build.mjs` | 上記を1ファイルへ組み立てる |

`index.html` と `artifact.html` は生成物なので、直接編集せず `src/page.html` を直してから作り直す。

## 作り直しかた

```bash
node docs/graduation-project-diagram/src/build.mjs
```

Tailwind CSS は生成して埋め込むため、閲覧時に外部から取りに行くのは Google Fonts だけになる。

## 画面写真の撮り直しかた

`scripts/make-test-data.mjs` で見本データを作り、本番ビルドを起動した状態で撮る。
実在の体調・服薬・面談の内容は写さない。

```bash
pnpm build && PORT=3100 pnpm start
node scripts/make-test-data.mjs --out <一時ディレクトリ>
# 見本データを localStorage へ入れて 390×844 で撮影し、screenshots/ を置き換える
```

## 記載時の制約

- 個人情報、利用者が入力した健康・服薬・面談に関する情報、個人を特定できる情報を載せない。
- ヒアリング内容は一般化して書く。
- 診断・治療・処方を行うものではない旨を必ず併記する。
