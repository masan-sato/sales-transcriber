# ローカル PC で AWS インフラをデプロイするガイド

このガイドは、**macOS PC から AWS への SAM デプロイを最初からできる** ステップバイステップです。
環境がない状態から始めても、コマンドを上から順に実行するだけで完成します。

---

## 📌 複数ユーザーでの利用パターン

**同じ AWS アカウント内で複数の IAM User がいる場合の選択肢：**

### パターン A: 推奨（インフラ共有）✅

| 対象 | 実行内容 |
|---|---|
| **最初の 1 人** | Step 1 ～ Step 16 すべて実行（AWS インフラをデプロイ） |
| **2 人目以降** | [スキップ手順](#複数ユーザー向けスキップ手順-aws-インフラ共有) を参照 |

**メリット：** 最速、費用最小、AWS リソース 1 セット  
**デメリット：** 最初の 1 人が完全なセットアップが必要

### パターン B: 個別デプロイ

全員が Step 1 ～ Step 16 を実行します。実行時に **Step 9, 10, 13** でユーザー名を含めた別名を使う（衝突を避けるため）。

**メリット：** 各自完全に独立したテスト環境  
**デメリット：** AWS リソースが N 倍になり、費用が増加

---

## 前提条件

| 必要なもの | 説明 |
|---|---|
| **macOS** | Apple Silicon (M1/M2/M3) または Intel プロセッサ |
| **AWS アカウント** | https://aws.amazon.com/ で作成済み |
| **GitHub アカウント** | https://github.com/ で作成済み |
| **インターネット接続** | ツールのダウンロード・デプロイに必須 |

---

## Step 1: 必要なツールのバージョン確認

まずはツールが揃っているか確認します。**ターミナル** を開いてください。

```bash
xcode-select --version
node --version
git --version
```

以下のように表示されたら OK です：
```
xcode-select version 2.x
v20.x.x  （Node.js）
git version 2.x
```

---

## Step 2: Homebrew のインストール（未インストール時）

Homebrew を使ってツールをインストールします。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、以下で確認：

```bash
brew --version
```

---

## Step 3: Node.js のインストール（v20 以上が必要）

```bash
brew install node
```

確認：

```bash
node --version
npm --version
```

**v20.x 以上** であることを確認してください。

---

## Step 4: AWS CLI のインストール

```bash
brew install awscli
```

確認：

```bash
aws --version
```

---

## Step 5: SAM CLI のインストール

```bash
brew install aws-sam-cli
```

確認：

```bash
sam --version
```

---

## Step 6: AWS 認証設定

AWS CLI が AWS にアクセスするための認証を設定します。

```bash
aws login
```

ブラウザが自動で開き、AWS マネジメントコンソールでのログイン画面が表示されます。

以下の流れで認証します：
1. AWS アカウントのメールアドレスを入力
2. パスワードを入力
3. MFA（多要素認証）コードを入力（設定されている場合）
4. 「アクセス権限を付与」をクリック

認証完了後、ターミナルに `Updated profile default to use...` と表示されたら成功です。

**確認コマンド:**

```bash
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

## Step 7: リポジトリのクローン

GitHub から Sales Transcriber コードをダウンロードします。

```bash
cd ~
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber
```

> `gh` コマンドが見つからない場合：
> ```bash
> brew install gh
> gh auth login
> ```
> その後、上記のコマンドを再実行してください。

---

## Step 8: SAM ビルド

インフラ関連のディレクトリに移動してビルドします。

```bash
cd ~/sales-transcriber/infrastructure
sam build
```

**成功すると以下が表示されます:**
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

ビルドに 2〜3 分かかることがあります。

---

## Step 9: S3 デプロイバケット作成

SAM がデプロイ用アーティファクトを保存するバケットを作成します。

```bash
# Step 6 でメモしたアカウント ID を設定
ACCOUNT_ID=697807134024

# S3 バケットを作成
aws s3 mb s3://sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1
```

成功メッセージが表示されます：
```
make_bucket: sales-transcriber-sam-697807134024
```

---

## Step 10: SAM デプロイ

AWS インフラ（Lambda・API Gateway・S3・IAM）を一括でデプロイします。

```bash
sam deploy \
  --stack-name sales-transcriber \
  --s3-bucket sales-transcriber-sam-${ACCOUNT_ID} \
  --region ap-northeast-1 \
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

## Step 11: API Gateway エンドポイント URL を取得

デプロイ完了後、フロントエンドで使用する API エンドポイントを取得します。

```bash
aws cloudformation describe-stacks \
  --stack-name sales-transcriber \
  --region ap-northeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text
```

以下のような URL が表示されます：
```
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

**この URL をメモしておいてください。** 次のステップで使用します。

---

## Step 12: GitHub Secrets の設定

GitHub Actions がフロントエンドをビルドする際に必要な環境変数をセットします。

まずリポジトリルートに移動：

```bash
cd ~/sales-transcriber
```

GitHub にログイン（未ログインの場合）：

```bash
gh auth login
```

Secret を設定（Step 11 で取得した URL を使用）：

```bash
# API エンドポイント URL を設定（XXX の部分は Step 11 の URL に置き換え）
gh secret set VITE_API_ENDPOINT --body "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"

# リージョンを設定
gh secret set VITE_AWS_REGION --body "ap-northeast-1"
```

確認：

```bash
gh secret list
```

以下のように表示されたら成功です：
```
VITE_API_ENDPOINT  Updated  2026-07-01T12:00:00+09:00
VITE_AWS_REGION    Updated  2026-07-01T12:00:00+09:00
```

---

## Step 13: GitHub Pages の有効化

GitHub Pages で フロントエンドをホストする設定をします。

```bash
# GitHub Pages を GitHub Actions から有効化
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  /repos/:owner/:repo/pages \
  -f source='{"branch":"main","path":"/"}' 2>/dev/null || true
```

---

## Step 14: デプロイ & GitHub Actions 実行

ローカルの変更（AWS インフラ用ファイルなど）をコミット・プッシュします。

```bash
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

```bash
gh run list --limit 5
```

`completed` と表示されたら完成です。

---

## Step 15: アプリケーションにアクセス

デプロイ完了後、ブラウザでアプリにアクセスします。

```bash
# アプリ URL を表示
echo "アプリURL: https://$(gh api /repos/:owner/:repo --jq .owner.login).github.io/sales-transcriber/"
```

表示された URL をブラウザで開いてください。

例：`https://masan-sato.github.io/sales-transcriber/`

---

## Step 16: 動作確認

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

### `aws login` がタイムアウト する

```bash
aws login --region ap-northeast-1
```

リージョンを明示的に指定してください。

### SAM ビルドが失敗する

```bash
# キャッシュをクリア
rm -rf .aws-sam/

# もう一度ビルド
sam build
```

### デプロイ後 API が 404 エラーを返す

GitHub Secrets が正しく設定されているか確認：

```bash
gh secret list
```

Secrets が空の場合は Step 12 を再度実行してください。

### アプリにアクセスできない

GitHub Actions のビルドが失敗しているか確認：

```bash
gh run list --limit 10
gh run view <RUN_ID>
```

---

## クリーンアップ（リソース削除）

テスト完了後、AWS の課金を止めるためにリソースを削除します。

```bash
# アカウント ID を設定
ACCOUNT_ID=697807134024

# S3 のオブジェクトを削除（先に削除が必要）
aws s3 rm s3://sales-transcriber-audio-${ACCOUNT_ID}-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-output-${ACCOUNT_ID}-ap-northeast-1 --recursive
aws s3 rm s3://sales-transcriber-sam-${ACCOUNT_ID} --recursive

# CloudFormation スタックを削除
sam delete --stack-name sales-transcriber --region ap-northeast-1

# S3 バケット自体を削除
aws s3 rb s3://sales-transcriber-sam-${ACCOUNT_ID} --force
```

---

## よくある質問

### Q: デプロイにはどのくらい時間がかかりますか？

A: 初回は 5〜10 分かかります。再デプロイは 2〜3 分です。

### Q: AWS の料金はいくらかかりますか？

A: 月の使用量が少なければ（月数十回の利用）、ほぼ無料枠内に収まります。詳細は [AWS 無料利用枠](https://aws.amazon.com/jp/free/) を参照してください。

### Q: macOS 以外の環境で実行できますか？

A: Linux・Windows でも可能です。Homebrew の代わりに各 OS のパッケージマネージャーを使ってください。

---

## 複数ユーザー向けスキップ手順（AWS インフラ共有）

**パターン A を選んだチームの 2 人目以降** は以下の手順で完成します。

### 準備：最初の 1 人から API エンドポイント URL を受け取る

最初の 1 人が Step 11 で取得した URL：
```
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

### スキップ手順（2 人目以降）

```bash
# ---- Step 1-5: ツール確認 & インストール ----
node --version  # v20 以上であること
git --version
aws --version
sam --version

# ---- Step 7: AWS 認証 ----
aws login

# ---- Step 8-10: リポジトリクローン ----
cd ~
gh repo clone masan-sato/sales-transcriber
cd sales-transcriber

# ---- Step 15: GitHub Secrets 設定（最初の 1 人から受け取った URL を使用）----
gh secret set VITE_API_ENDPOINT --body "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"

# ---- Step 17-18: デプロイ & アクセス ----
# ソースコード変更がなければ不要。変更がある場合のみ：
git add .
git commit -m "your commit message"
git push origin main

# ブラウザで以下にアクセス
# https://masan-sato.github.io/sales-transcriber/
```

**所要時間:** 5〜10 分（AWS インフラのデプロイは不要）

---

## 全コマンド早見表

環境が整っている場合は、以下を上から実行するだけで完成です：

```bash
# ---- ステップ 6-7: 認証・クローン ----
aws login
cd ~ && gh repo clone masan-sato/sales-transcriber && cd sales-transcriber

# ---- ステップ 8-11: ビルド・デプロイ ----
cd ~/sales-transcriber/infrastructure
sam build
ACCOUNT_ID=697807134024
aws s3 mb s3://sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1
sam deploy --stack-name sales-transcriber --s3-bucket sales-transcriber-sam-${ACCOUNT_ID} --region ap-northeast-1 --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name sales-transcriber --region ap-northeast-1 --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)
echo "API: $API_ENDPOINT"

# ---- ステップ 12-14: GitHub Secrets・デプロイ ----
cd ~/sales-transcriber
gh secret set VITE_API_ENDPOINT --body "$API_ENDPOINT"
gh secret set VITE_AWS_REGION --body "ap-northeast-1"
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
git add . && git commit -m "feat: deploy" && git push origin main

# ---- ステップ 15: アプリ URL 確認 ----
echo "URL: https://$(gh api /repos/:owner/:repo --jq .owner.login).github.io/sales-transcriber/"
```
