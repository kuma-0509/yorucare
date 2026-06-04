# ヨルケアを GitHub に push し、Vercel にデプロイするスクリプト
# 事前: gh auth login / pnpm dlx vercel@41 login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$gh = if (Get-Command gh -ErrorAction SilentlyContinue) {
  "gh"
} elseif (Test-Path "$env:TEMP\gh-cli\bin\gh.exe") {
  "$env:TEMP\gh-cli\bin\gh.exe"
} else {
  Write-Host "GitHub CLI (gh) がありません。winget install GitHub.cli を実行するか、https://cli.github.com/ からインストールしてください。"
  exit 1
}

& $gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub にログインしてください: gh auth login"
  & $gh auth login -h github.com -p https -w
}

$repoName = "yorucare"
$hasRemote = git remote get-url origin 2>$null
if (-not $hasRemote) {
  Write-Host "GitHub リポジトリを作成して push します..."
  & $gh repo create $repoName --public --source=. --remote=origin --push
} else {
  git branch -M main
  git push -u origin main
}

Write-Host ""
Write-Host "GitHub 反映完了。リポジトリ URL:"
& $gh repo view --web 2>$null
& $gh repo view --json url -q ".url"

Write-Host ""
Write-Host "Vercel にデプロイします（初回はブラウザでログイン）..."
pnpm dlx vercel@41 --prod --yes

Write-Host "完了。Vercel の URL は上記ログを確認するか、https://vercel.com/dashboard で確認してください。"
