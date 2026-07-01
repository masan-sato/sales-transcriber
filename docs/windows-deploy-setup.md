# Windows PC セットアップガイド

このガイドは、**Windows PC から Sales Transcriber アプリを使えるようにする** ステップバイステップです。

**前提:** AWS インフラ（Lambda・API Gateway・S3 など）は既に共有の AWS アカウントに構築済みです。  
このガイドでは、PC のツール設定と、デプロイに必要な GitHub Secrets の設定のみを行います。

---

## 前提条件

| 必要なもの | 説明 |
|---|---|
| **Windows 10/11** | Pro 以上推奨（Home でも動作可） |
| **GitHub アカウント** | https://github.com/ で作成済み |
| **API エンドポイント URL** | チーム内の AWS インフラ管理者から受け取る |
| **インターネット接続** | ツールのダウンロードに必須 |

---

## Step 1: PowerShell の開き方

このガイドのすべてのコマンドは **PowerShell 7 以上** で実行します。

**方法 1: スタートメニューから開く**
1. Windows ボタンを右クリック
2. 「Windows PowerShell」 または 「ターミナル」 を選択

**方法 2: 検索で開く**
1. Windows キー + X キーを押す
2. 「A」キーを押す
3. PowerShell が開く

**PowerShell のバージョン確認:**

```powershell
$PSVersionTable.PSVersion
```

`7.0` 以上であることを確認してください。バージョンが古い場合は以下をインストール：

```powershell
winget install Microsoft.PowerShell
```

---

## Step 2: 必要なツールのバージョン確認

インストール済みのツールを確認します。

```powershell
node --version
npm --version
git --version
```

以下のように表示されたら OK です：
```
v20.x.x  （Node.js）
9.x.x    （npm）
git version 2.x.x
```

**もし何か表示されない場合は、該当ツールをインストールしてください。**

---

## Step 3: Node.js のインストール（v20 以上が必要）

まだインストールされていない場合：

https://nodejs.org/ から **LTS 版** をダウンロード・実行してください。

または winget でインストール：

```powershell
winget install OpenJS.NodeJS.LTS
```

インストール後、PowerShell を **再起動** して、以下で確認：

```powershell
node --version
npm --version
```

---

## Step 4: Git のインストール

まだインストールされていない場合：

https://git-scm.com/download/win からダウンロード・実行するか、

```powershell
winget install Git.Git
```

インストール後、PowerShell を **再起動** して確認：

```powershell
git --version
```

**Git の初期設定（初回のみ）:**

```powershell
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

---

## Step 5: AWS CLI のインストール（オプション）

リポジトリをクローンするのに不要ですが、将来的に AWS 関連の作業が必要な場合のため、インストール推奨です。

https://awscli.amazonaws.com/AWSCLIV2.msi からダウンロード・実行するか、

```powershell
winget install Amazon.AWSCLI
```

確認：

```powershell
aws --version
```

---

## Step 6: GitHub CLI のインストール

```powershell
winget install GitHub.cli
```

確認：

```powershell
gh --version
```

---

## Step 7: GitHub 認証

```powershell
gh auth login
```

以下の選択肢が表示されます：

```
? What account do you want to log into? [Use arrows to move, type to filter]
> GitHub.com
  GitHub Enterprise Server
```

**GitHub.com** を選択 → Enter

次に認証方法を選ぶ：

```
? What is your preferred protocol for Git operations on this host?
  HTTPS
> SSH
```

**HTTPS** を選ぶことをおすすめします → Enter

```
? How would you like to authenticate GitHub CLI?
  Login with a web browser
> Paste an authentication token
```

**Login with a web browser** を選択 → Enter

ブラウザが開きます。GitHub アカウントでログインしてください。

---

## Step 8: リポジトリのクローン

GitHub から Sales Transcriber コードをダウンロードします。

```powershell
cd ~
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber
```

リポジトリが `C:\Users\YourUsername\sales-transcriber` に保存されます。

---

## Step 9: GitHub Secrets の設定

GitHub Actions がフロントエンドをビルドする際に必要な環境変数をセットします。

**準備：チーム内の AWS インフラ管理者から以下の情報を受け取る：**

- API エンドポイント URL：`https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod`

Secret を設定：

```powershell
# API エンドポイント URL を設定
gh secret set VITE_API_ENDPOINT --body "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"

# リージョンを設定
gh secret set VITE_AWS_REGION --body "ap-northeast-1"
```

**上記の URL は、実際のエンドポイント URL に置き換えてください。**

確認：

```powershell
gh secret list
```

以下のように表示されたら成功です：
```
VITE_API_ENDPOINT  Updated  2026-07-01T12:00:00+09:00
VITE_AWS_REGION    Updated  2026-07-01T12:00:00+09:00
```

---

## Step 10: 動作確認

### アプリケーションにアクセス

ブラウザで以下にアクセス：

```
https://masan-sato.github.io/sales-transcriber/
```

（`masan-sato` の部分は実際のリポジトリオーナーのユーザー名に置き換えてください）

### 通常モード
1. **「● 録音開始」** をクリック → マイク許可 → 話す → **「■ 録音停止」**
2. 1〜2 分待つと文字起こし結果が表示される

### リアルタイムモード
1. モード選択で **「⚡ リアルタイムモード」** をクリック
2. **「● 録音開始」** → 話す → **「■ 録音停止」**
3. リアルタイムで文字起こしが進行、1 分程度で完成

### 議事録出力
- **「📋 コピー」** ボタンで Markdown をコピー
- **「⬇ .md ダウンロード」** ボタンでファイルを保存

---

## Step 11: ソースコード変更時のデプロイ

フロントエンド（JavaScript・React コンポーネント）に変更を加えた場合：

```powershell
cd ~\sales-transcriber

# 変更をコミット
git add .
git commit -m "feat: your feature description"

# GitHub にプッシュ
git push origin main
```

プッシュすると GitHub Actions が自動でビルドし、GitHub Pages にデプロイします。

デプロイ状況を確認：

```powershell
gh run list --limit 5
```

---

## トラブルシューティング

### `gh auth login` がエラーになる

GitHub CLI を最新版にアップデート：

```powershell
winget upgrade GitHub.cli
```

### アプリにアクセスできない

1. URL が正しいか確認（`https://[username].github.io/sales-transcriber/`）
2. API エンドポイント URL が正しく設定されているか確認：
   ```powershell
   gh secret list
   ```
3. GitHub Actions のビルドが失敗していないか確認：
   ```powershell
   gh run list --limit 10
   ```

### 録音ボタンが反応しない

- ブラウザのマイク許可が有効か確認
- 別のアプリがマイクを使用していないか確認
- コンソールエラーを確認（F12 → Console タブ）

---

## よくある質問

### Q: AWS CLI は必須ですか？

A: 不要です。AWS インフラはチーム内の管理者が構築・管理します。ローカル環境では GitHub CLI のみで OK です。

### Q: SAM CLI は必要ですか？

A: 不要です。AWS Lambda のデプロイはすべてチーム内の管理者が行うため、ローカル環境には不要です。

### Q: Windows 以外の環境で実行できますか？

A: はい。Node.js と Git さえあれば、macOS・Linux でも同じ手順で動作します。

### Q: git config を実行する必要はありますか？

A: 初回のコミット・プッシュ時に必要です。既に設定済みの場合はスキップできます。

---

## 全コマンド早見表

環境が整っている場合は、以下を上から実行するだけで完成です：

```powershell
# ---- Step 2-4: ツール確認 ----
node --version
git --version

# ---- Step 6-7: GitHub CLI 認証 ----
gh --version
gh auth login

# ---- Step 8: リポジトリクローン ----
cd ~
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber

# ---- Step 9: GitHub Secrets 設定 ----
# (API_ENDPOINT は AWS インフラ管理者から受け取った URL に置き換え)
gh secret set VITE_API_ENDPOINT --body "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"

# ---- Step 10: アプリ URL ----
$GITHUB_USERNAME = gh api /repos/:owner/:repo --jq .owner.login
Write-Host "App URL: https://$GITHUB_USERNAME.github.io/sales-transcriber/"

# ---- Step 11: 変更をコミット（必要に応じて）----
# git add .
# git commit -m "your message"
# git push origin main
```
