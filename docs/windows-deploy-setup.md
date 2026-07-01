# Windows PC で AWS インフラをデプロイするガイド

このガイドは、**Windows PC から AWS への SAM デプロイを最初からできる** ステップバイステップです。
環境がない状態から始めても、コマンドを上から順に実行するだけで完成します。

---

## 前提条件

| 必要なもの | 説明 |
|---|---|
| **Windows 10/11** | Pro 以上推奨（Home でも動作可） |
| **AWS アカウント** | https://aws.amazon.com/ で作成済み |
| **GitHub アカウント** | https://github.com/ で作成済み |
| **インターネット接続** | ツールのダウンロード・デプロイに必須 |

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

確認：

```powershell
git --version
```

---

## Step 5: AWS CLI のインストール

公式インストーラーから：

https://awscli.amazonaws.com/AWSCLIV2.msi をダウンロード・実行

または winget で：

```powershell
winget install Amazon.AWSCLI
```

インストール後、PowerShell を **再起動** して確認：

```powershell
aws --version
```

---

## Step 6: SAM CLI のインストール

SAM CLI をインストールするには、Docker Desktop が必要です。

**Docker Desktop のインストール:**

https://www.docker.com/products/docker-desktop からダウンロード・インストール

インストール完了後、SAM CLI をインストール：

```powershell
winget install Amazon.SAM-CLI
```

確認：

```powershell
sam --version
```

---

## Step 7: AWS 認証設定

AWS CLI が AWS にアクセスするための認証を設定します。

```powershell
aws login
```

ブラウザが自動で開き、AWS マネジメントコンソールでのログイン画面が表示されます。

以下の流れで認証します：
1. AWS アカウントのメールアドレスを入力
2. パスワードを入力
3. MFA（多要素認証）コードを入力（設定されている場合）
4. 「アクセス権限を付与」をクリック

認証完了後、PowerShell に `Updated profile default to use...` と表示されたら成功です。

**確認コマンド:**

```powershell
aws sts get-caller-identity
```

以下のような JSON が表示されたら設定完了です：
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXX",
    "Account": "697807134024",
    "Arn": "arn:aws:iam::697807134024:user/your-email@example.com"
}
```

`Account` の番号をメモしておいてください（後で使います）。

---

## Step 8: GitHub CLI のインストール

```powershell
winget install GitHub.cli
```

確認：

```powershell
gh --version
```

---

## Step 9: GitHub 認証

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

## Step 10: リポジトリのクローン

GitHub から Sales Transcriber コードをダウンロードします。

```powershell
cd ~
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber
```

リポジトリが `C:\Users\YourUsername\sales-transcriber` に保存されます。

---

## Step 11: SAM ビルド

インフラ関連のディレクトリに移動してビルドします。

```powershell
cd ~\sales-transcriber\infrastructure
sam build
```

**成功すると以下が表示されます:**
```
Build Succeeded

Built Artifacts  : .aws-sam\build
Built Template   : .aws-sam\build\template.yaml
```

ビルドに 2〜3 分かかることがあります。

---

## Step 12: S3 デプロイバケット作成

SAM がデプロイ用アーティファクトを保存するバケットを作成します。

```powershell
# Step 7 でメモしたアカウント ID を設定
$ACCOUNT_ID = "697807134024"

# S3 バケットを作成
aws s3 mb s3://sales-transcriber-sam-$ACCOUNT_ID --region ap-northeast-1
```

成功メッセージが表示されます：
```
make_bucket: sales-transcriber-sam-697807134024
```

---

## Step 13: SAM デプロイ

AWS インフラ（Lambda・API Gateway・S3・IAM）を一括でデプロイします。

```powershell
sam deploy `
  --stack-name sales-transcriber `
  --s3-bucket sales-transcriber-sam-$ACCOUNT_ID `
  --region ap-northeast-1 `
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

デプロイ中に確認プロンプトが表示されます：

```
	Changeset created successfully. arn:aws:cloudformation:ap-northeast-1:697807134024:change/...

Deploy this changeset? [y/N]:
```

`y` を入力して Enter を押してください。

デプロイ完了まで **3〜5 分** かかります。

---

## Step 14: API Gateway エンドポイント URL を取得

デプロイ完了後、フロントエンドで使用する API エンドポイントを取得します。

```powershell
$API_ENDPOINT = aws cloudformation describe-stacks `
  --stack-name sales-transcriber `
  --region ap-northeast-1 `
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
  --output text

Write-Host "API Endpoint: $API_ENDPOINT"
```

以下のような URL が表示されます：
```
API Endpoint: https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

**この URL をメモしておいてください。** 次のステップで使用します。

---

## Step 15: GitHub Secrets の設定

GitHub Actions がフロントエンドをビルドする際に必要な環境変数をセットします。

まずリポジトリルートに移動：

```powershell
cd ~\sales-transcriber
```

Secret を設定（Step 14 で取得した URL を使用）：

```powershell
# API エンドポイント URL を設定（$API_ENDPOINT は Step 14 の値）
gh secret set VITE_API_ENDPOINT --body "$API_ENDPOINT"

# リージョンを設定
gh secret set VITE_AWS_REGION --body "ap-northeast-1"
```

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

## Step 16: GitHub Pages の有効化

GitHub Pages で フロントエンドをホストする設定をします。

```powershell
gh api `
  --method PUT `
  -H "Accept: application/vnd.github+json" `
  /repos/:owner/:repo/pages `
  -f source='{"branch":"main","path":"/"}'
```

---

## Step 17: デプロイ & GitHub Actions 実行

ローカルの変更（AWS インフラ用ファイルなど）をコミット・プッシュします。

```powershell
# Git の初期設定（初回のみ）
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# 変更をコミット
git add .
git commit -m "feat: deploy realtime transcription"

# GitHub にプッシュ
git push origin main
```

プッシュすると GitHub Actions が自動でビルドし、GitHub Pages にデプロイします。

デプロイ状況を確認：

```powershell
gh run list --limit 5
```

`completed` と表示されたら完成です。

---

## Step 18: アプリケーションにアクセス

デプロイ完了後、ブラウザでアプリにアクセスします。

```powershell
# ユーザー名を取得
$GITHUB_USERNAME = gh api /repos/:owner/:repo --jq .owner.login

# アプリ URL を表示
Write-Host "https://$GITHUB_USERNAME.github.io/sales-transcriber/"
```

表示された URL をブラウザで開いてください。

例：`https://masan-sato.github.io/sales-transcriber/`

---

## Step 19: 動作確認

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

## トラブルシューティング

### `aws login` がタイムアウトする

```powershell
aws login --region ap-northeast-1
```

リージョンを明示的に指定してください。

### SAM ビルドが失敗する

キャッシュをクリア：

```powershell
Remove-Item -Recurse -Force .aws-sam/
sam build
```

### デプロイ後 API が 404 エラーを返す

GitHub Secrets が正しく設定されているか確認：

```powershell
gh secret list
```

Secrets が空の場合は Step 15 を再度実行してください。

### アプリにアクセスできない

GitHub Actions のビルドが失敗しているか確認：

```powershell
gh run list --limit 10
gh run view <RUN_ID>
```

### `sam build` で `--cached` オプションが未対応エラーが出る

SAM CLI を更新：

```powershell
winget upgrade Amazon.SAM-CLI
```

---

## クリーンアップ（リソース削除）

テスト完了後、AWS の課金を止めるためにリソースを削除します。

```powershell
# アカウント ID を設定
$ACCOUNT_ID = "697807134024"

# S3 のオブジェクトを削除（先に削除が必要）
aws s3 rm s3://sales-transcriber-audio-$ACCOUNT_ID-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-output-$ACCOUNT_ID-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-sam-$ACCOUNT_ID --recursive

# CloudFormation スタックを削除
sam delete --stack-name sales-transcriber --region ap-northeast-1

# S3 バケット自体を削除
aws s3 rb s3://sales-transcriber-sam-$ACCOUNT_ID --force
```

---

## よくある質問

### Q: デプロイにはどのくらい時間がかかりますか？

A: 初回は 5〜10 分かかります。再デプロイは 2〜3 分です。

### Q: AWS の料金はいくらかかりますか？

A: 月の使用量が少なければ（月数十回の利用）、ほぼ無料枠内に収まります。詳細は [AWS 無料利用枠](https://aws.amazon.com/jp/free/) を参照してください。

### Q: winget でインストール失敗する

A: 別の方法でインストールしてください：
- Node.js: https://nodejs.org/ からダウンロード
- Git: https://git-scm.com/download/win からダウンロード
- AWS CLI: https://awscli.amazonaws.com/AWSCLIV2.msi からダウンロード
- SAM CLI: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install-windows.html

### Q: PowerShell を使いたくない

A: コマンドプロンプト (cmd.exe) では `^` で行続行してください：

```cmd
sam deploy ^
  --stack-name sales-transcriber ^
  --s3-bucket sales-transcriber-sam-697807134024 ^
  ...
```

---

## 全コマンド早見表

環境が整っている場合は、以下を上から実行するだけで完成です：

```powershell
# ---- ステップ 7-10: 認証・クローン ----
aws login
cd ~ 
gh repo clone masan-sato/sales-transcriber 
cd sales-transcriber

# ---- ステップ 11-14: ビルド・デプロイ ----
cd ~\sales-transcriber\infrastructure
sam build
$ACCOUNT_ID = "697807134024"
aws s3 mb s3://sales-transcriber-sam-$ACCOUNT_ID --region ap-northeast-1
sam deploy --stack-name sales-transcriber --s3-bucket sales-transcriber-sam-$ACCOUNT_ID --region ap-northeast-1 --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

$API_ENDPOINT = aws cloudformation describe-stacks --stack-name sales-transcriber --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text
Write-Host "API: $API_ENDPOINT"

# ---- ステップ 15-17: GitHub Secrets・デプロイ ----
cd ~\sales-transcriber
gh secret set VITE_API_ENDPOINT --body "$API_ENDPOINT"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
git add . 
git commit -m "feat: deploy" 
git push origin main

# ---- ステップ 18: アプリ URL 確認 ----
$GITHUB_USERNAME = gh api /repos/:owner/:repo --jq .owner.login
Write-Host "URL: https://$GITHUB_USERNAME.github.io/sales-transcriber/"
```
