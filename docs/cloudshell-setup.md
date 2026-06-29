# AWS CloudShell を使った完全セットアップガイド

このガイドは **AWS CloudShell だけ** を使って、Sales Transcriber を最初からデプロイするための手順書です。  
PCの種類・OSに関係なく、AWSアカウントとGitHubアカウントがあれば、コマンドを上から順に実行するだけで完成します。

---

## 前提条件

| 必要なもの | 説明 |
|---|---|
| **AWS アカウント** | https://aws.amazon.com/ で作成 |
| **GitHub アカウント** | https://github.com/ で作成 |
| **GitHubリポジトリ** | このリポジトリを自分のアカウントにフォークまたはコピー済み |

---

## CloudShell の開き方

1. [AWS マネジメントコンソール](https://console.aws.amazon.com/) にログイン
2. 右上のリージョンを **「アジアパシフィック (東京)」`ap-northeast-1`** に変更
3. 画面上部のメニューバーの **`>_`** アイコンをクリック → CloudShell が起動

> CloudShell には AWS CLI・SAM CLI・Git・Node.js・Python がプリインストール済みです。`aws configure` は不要です。

---

## Step 1: バージョン確認

まず必要なツールが使えることを確認します。

```bash
aws --version
sam --version
node --version
git --version
```

**期待される出力例:**
```
aws-cli/2.x.x
SAM CLI, version 1.x.x
v20.x.x
git version 2.x.x
```

---

## Step 2: GitHub CLI のインストール

GitHub Secrets をコマンドラインから設定するために GitHub CLI をインストールします。

```bash
# GitHub CLI のインストール（Amazon Linux 2023 / CloudShell 用）
sudo dnf install -y 'dnf-command(config-manager)'
sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo dnf install gh --repo gh-cli -y

# バージョン確認
gh --version
```

---

## Step 3: GitHub にログイン

```bash
gh auth login
```

対話式のプロンプトが表示されます。以下のように回答してください：

```
? What account do you want to log into?  → GitHub.com を選択（Enter）
? What is your preferred protocol?       → HTTPS を選択（Enter）
? Authenticate Git with your GitHub credentials? → Y（Enter）
? How would you like to authenticate?    → Login with a web browser を選択（Enter）
```

**ワンタイムコード** が表示されます。  
→ https://github.com/login/device を **別タブ** で開き、コードを入力してください。  
認証完了後、CloudShellに戻ります。

```bash
# ログイン確認
gh auth status
```

---

## Step 4: リポジトリのクローン

自分のGitHubリポジトリのURLに置き換えてください。

```bash
# ホームディレクトリに移動
cd ~

# gh CLI 経由でクローン（認証が自動で使われます）
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber
```

---

## Step 5: AWS インフラのデプロイ（SAM）

AWS Lambda・API Gateway・S3 を一括でデプロイします。

### 5.1 SAM ビルド用の S3 バケット作成

SAM がデプロイ用アーティファクトを保存するバケットを作成します。

```bash
# アカウントIDを取得
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWSアカウントID: $ACCOUNT_ID"

# SAMデプロイ用バケットを作成
aws s3 mb s3://sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1
echo "SAMバケット作成完了: sales-transcriber-sam-${ACCOUNT_ID}"
```

### 5.2 SAM ビルド

Lambda の依存パッケージをインストールしてビルドします。

```bash
cd ~/sales-transcriber/infrastructure

# SAM ビルド（各 Lambda の npm install が自動で行われます）
sam build
```

**成功すると以下のようなメッセージが表示されます:**
```
Build Succeeded
Built Artifacts  : .aws-sam/build
```

### 5.3 SAM デプロイ

```bash
# アカウントIDを取得（再取得）
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# デプロイ実行（確認あり）
sam deploy \
  --stack-name sales-transcriber \
  --s3-bucket sales-transcriber-sam-${ACCOUNT_ID} \
  --region ap-northeast-1 \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --confirm-changeset
```

デプロイ中に確認プロンプトが表示されます：
```
Deploy this changeset? [y/N]:
```
`y` を入力して Enter を押してください。

### 5.4 API Gateway エンドポイントの取得

デプロイ完了後、エンドポイントURLを取得します。

```bash
# API エンドポイントを取得して変数に保存
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name sales-transcriber \
  --region ap-northeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text)

echo "================================================"
echo "API エンドポイント: $API_ENDPOINT"
echo "================================================"
```

このURLを後で使用します。必ずメモしておいてください。

---

## Step 6: GitHub Secrets の設定

GitHub Actions がフロントエンドをビルドする際に必要な環境変数をセットします。

```bash
# プロジェクトルートに戻る
cd ~/sales-transcriber

# Secret を設定（API_ENDPOINT は Step 5.4 で取得した値）
gh secret set VITE_API_ENDPOINT --body "$API_ENDPOINT"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"

# 設定確認
gh secret list
```

**期待される出力:**
```
VITE_API_ENDPOINT  Updated  ...
VITE_AWS_REGION    Updated  ...
```

---

## Step 7: GitHub Pages の有効化

### 7.1 GitHub Pages を設定

```bash
# GitHub Pages を GitHub Actions から有効化
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/masan-sato/sales-transcriber/pages \
  -f source='{"branch":"main","path":"/"}' 2>/dev/null || true

# Pages のソースを GitHub Actions に変更
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/masan-sato/sales-transcriber/pages \
  -f build_type="workflow" 2>/dev/null || true
```

> **UIから設定する場合:**  
> GitHubリポジトリ → Settings → Pages → Source: **GitHub Actions** を選択

### 7.2 フロントエンドをプッシュしてデプロイ

```bash
cd ~/sales-transcriber

# Git の初期設定（メールアドレスは自分のものに変更）
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# 全ファイルをコミット
git add .
git commit -m "feat: initial deployment"
git push origin main
```

プッシュするとGitHub Actionsが自動でビルドし、GitHub Pages にデプロイします。

---

## Step 8: デプロイ状況の確認

```bash
# GitHub Actions のワークフロー実行状況を確認
gh run list --limit 5

# 最新のワークフローログをリアルタイムで確認
gh run watch
```

デプロイ完了後、以下のURLでアプリにアクセスできます：

```
https://YOUR_USERNAME.github.io/sales-transcriber/
```

```bash
# デプロイURLを自動で表示
echo "アプリURL: https://$(gh api /repos/:owner/:repo --jq .owner.login).github.io/sales-transcriber/"
```

---

## Step 9: 動作確認

ブラウザでアプリを開き、以下を確認してください：

1. **マイク録音** — 「録音開始」ボタンをクリック → マイク許可 → 話す → 「録音停止」
2. **ファイルアップロード** — MP3/WAV/M4Aファイルを選択
3. **文字起こし** — 1〜2分待つと結果が表示される
4. **Markdown出力** — 「コピー」または「ダウンロード」ボタンで議事録を保存

---

## トラブルシューティング

### SAM ビルドが失敗する場合

```bash
# Node.js バージョンを確認
node --version
# v20.x.x 以上であることを確認

# SAM のバージョンを確認
sam --version

# Lambda の依存パッケージを手動でインストールして確認
cd ~/sales-transcriber/infrastructure/lambda/upload
npm install
cd ~/sales-transcriber/infrastructure/lambda/transcribe
npm install
cd ~/sales-transcriber/infrastructure/lambda/result
npm install

# もう一度 SAM ビルド
cd ~/sales-transcriber/infrastructure
sam build
```

### デプロイでエラーが出る場合

```bash
# スタックのイベントログを確認
aws cloudformation describe-stack-events \
  --stack-name sales-transcriber \
  --region ap-northeast-1 \
  --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'].[ResourceType,ResourceStatusReason]" \
  --output table
```

### API が CORS エラーを返す場合

```bash
# Lambda のログを確認
aws logs tail /aws/lambda/sales-transcriber-transcribe --follow --region ap-northeast-1
```

### 文字起こしが失敗する場合

```bash
# Transcribe ジョブの一覧を確認
aws transcribe list-transcription-jobs \
  --region ap-northeast-1 \
  --query "TranscriptionJobSummaries[*].[TranscriptionJobName,TranscriptionJobStatus,FailureReason]" \
  --output table
```

---

## インフラの削除（後片付け）

使い終わった後、不要な課金が発生しないようにリソースを削除します。

```bash
# アカウントIDを取得
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# S3 バケット内のオブジェクトを先に削除（バケット削除の前に必要）
aws s3 rm s3://sales-transcriber-audio-${ACCOUNT_ID}-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-output-${ACCOUNT_ID}-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-sam-${ACCOUNT_ID} --recursive

# SAM スタック（Lambda・API Gateway・IAM・S3）を削除
sam delete --stack-name sales-transcriber --region ap-northeast-1

# SAM用バケットを削除
aws s3 rb s3://sales-transcriber-sam-${ACCOUNT_ID} --force
```

---

## 費用の目安

| サービス | 無料枠 | 超過時の料金 |
|---|---|---|
| **Amazon Transcribe** | 60分/月（12ヶ月間） | $0.024/分 |
| **AWS Lambda** | 100万リクエスト/月 | $0.20/100万リクエスト |
| **Amazon S3** | 5GB/月 | $0.025/GB |
| **API Gateway** | 100万リクエスト/月（12ヶ月間） | $3.50/100万リクエスト |

> 通常の営業同行用途（月数十件程度）であれば、無料枠内で運用できます。

---

## 全コマンド早見表

```bash
# ---- Step 1: バージョン確認 ----
aws --version && sam --version && node --version && git --version

# ---- Step 2: GitHub CLI インストール ----
sudo dnf install -y 'dnf-command(config-manager)'
sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo dnf install gh --repo gh-cli -y

# ---- Step 3: GitHub ログイン ----
gh auth login

# ---- Step 4: クローン ----
cd ~ && gh repo clone masan-sato/sales-transcriber && cd sales-transcriber

# ---- Step 5: SAM デプロイ ----
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 mb s3://sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1
cd ~/sales-transcriber/infrastructure && sam build
sam deploy --stack-name sales-transcriber --s3-bucket sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1 --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --confirm-changeset
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name sales-transcriber --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)
echo "API: $API_ENDPOINT"

# ---- Step 6: GitHub Secrets 設定 ----
cd ~/sales-transcriber
gh secret set VITE_API_ENDPOINT --body "$API_ENDPOINT"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"

# ---- Step 7: プッシュ & デプロイ ----
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
git add . && git commit -m "feat: initial deployment" && git push origin main

# ---- Step 8: 確認 ----
gh run watch
echo "URL: https://$(gh api /repos/:owner/:repo --jq .owner.login).github.io/sales-transcriber/"
```
