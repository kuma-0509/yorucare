# GitHub / Vercel への反映手順

## 前提

- [GitHub CLI](https://cli.github.com/)（`gh`）
- [pnpm](https://pnpm.io/)
- GitHub / Vercel アカウント

## 1. GitHub に push

```powershell
cd c:\Users\Chard\src\yorucare

# 未ログインの場合（ブラウザで認証）
gh auth login

# リポジトリ作成＋初回 push（名前: yorucare）
gh repo create yorucare --public --source=. --remote=origin --push
```

既にリポジトリがある場合:

```powershell
git remote add origin https://github.com/<あなたのユーザー名>/yorucare.git
git branch -M main
git push -u origin main
```

## 2. Vercel にデプロイ

### 方法 A: GitHub 連携（推奨）

1. https://vercel.com/new を開く
2. GitHub の `yorucare` リポジトリを Import
3. Framework Preset: **Next.js**（自動検出）
4. Install Command: `pnpm install`
5. Build Command: `pnpm run build`
6. Deploy

以降、`main` への push で自動デプロイされます。

### デプロイ後の確認

1. 本番 URL を開く: **https://yorucare.vercel.app**
2. 画面下部に **「ヨルケア · Phase 1 · 更新 （日付）」** が出ているか確認（古いままならデプロイ完了を待つ）
3. 下部タブが **書く / これまで / できること / ふりかえり** になっているか確認
4. 「書く」で気分を選び、**気分のすぐ下**または**画面下（タブの上）**の「記録を保存する」で保存できるか確認
5. 実機テストは [docs/smartphone-test-checklist.md](docs/smartphone-test-checklist.md) を参照

### 方法 B: CLI

```powershell
pnpm dlx vercel@41 login
pnpm dlx vercel@41 --prod
```

`vercel.json` で pnpm を指定済みです。

## 一括スクリプト

認証済みなら:

```powershell
.\scripts\publish.ps1
```
