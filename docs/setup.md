# Sales Transcriber セットアップ（Windows / PowerShell）

このドキュメントでは、Windows PC の PowerShell で `Sales Transcriber` を開発・実行するための手順をまとめます。

すべてのコマンドは PowerShell 形式で記載しているため、コピー＆ペーストして実行できます。

## 1. 前提条件

- Windows 10/11
- Git
- Node.js 20.x 以上
- npm
- AWS アカウント
- AWS CLI（v2 以上）
- GitHub アカウント
- GitHub CLI（`gh`）

## 2. 必要なソフトウェアのインストール

### 2.1 Node.js

公式サイトから Windows 用インストーラーをダウンロードしてインストールします。

- https://nodejs.org/

インストール後、PowerShell でバージョンを確認します。

```powershell
node -v
npm -v
```

### 2.1.1 `npm -v` が通らない場合

`npm -v` が実行できない場合は、次の点を確認してください。

1. Node.js をインストールし直す。
   - インストール時に「Add to PATH」オプションが有効になっていることを確認します。
2. PowerShell を再起動する。
   - 環境変数の変更は、新しいターミナルで有効になります。
3. パスを確認する。

```powershell
$env:PATH -split ';' | Select-String 'node'
```

4. `npm` の場所を確認する。

```powershell
Get-Command npm
```

5. それでも解決しない場合は、Node.js を完全にアンインストールして再インストールします。
### 2.2 Git

Git for Windows をインストールします。

- https://git-scm.com/download/win

インストール後、PowerShell で確認します。

```powershell
git --version
```

### 2.3 AWS CLI

AWS CLI をインストールし、AWS アカウントの認証情報を設定します。

- https://aws.amazon.com/cli/

インストール後、PowerShell で確認します。

```powershell
aws --version
```

### 2.4 GitHub CLI（任意）

GitHub CLI を使うとリポジトリの操作や GitHub Actions の管理が便利です。

- https://cli.github.com/

確認は次のとおりです。

```powershell
gh --version
```

## 3. リポジトリのクローン

PowerShell を開き、作業したいフォルダに移動してリポジトリをクローンします。

```powershell
Set-Location -Path "C:\path\to\workspace"
git clone https://github.com/masan-sato/sales-transcriber.git
Set-Location -Path .\sales-transcriber
```

## 4. 依存パッケージのインストール

リポジトリのルートでパッケージをインストールします。

```powershell
npm install
```

## 5. AWS CLI の設定

AWS CLI の認証情報を設定します。

```powershell
aws configure
```

入力例:

- AWS Access Key ID: `AKIA...`
- AWS Secret Access Key: `xxxxxxxxxx`
- Default region name: `ap-northeast-1`
- Default output format: `json`

プロファイルを使う場合は、次のように実行します。

```powershell
aws configure --profile sales-transcriber
```

## 6. AWS インフラのデプロイ

インフラ関連のコードに移動してデプロイします。

```powershell
Set-Location -Path .\infrastructure
npm install
npm run deploy
```

デプロイ完了後、表示される API Gateway のエンドポイント URL をメモしてください。

## 7. 環境変数の設定

プロジェクトルートに戻り、`.env.example` から `.env.local` を作成します。

```powershell
Set-Location -Path ..
Copy-Item .env.example .env.local
notepad .env.local
```

`.env.local` の例:

```env
VITE_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_AWS_REGION=ap-northeast-1
```

`VITE_API_ENDPOINT` には、デプロイ時に発行された API Gateway エンドポイントを設定します。

## 8. ローカル開発サーバーの起動

プロジェクトルートで開発サーバーを起動します。

```powershell
npm run dev
```

起動後、表示される URL をブラウザで開いて動作を確認してください。

## 9. GitHub Pages へのデプロイ

GitHub リポジトリの `main` ブランチにプッシュすると、GitHub Actions によって自動でビルドおよびデプロイされます。

GitHub リポジトリの Settings → Pages で、**Source: GitHub Actions** を選択してください。

## 10. 参考

このセットアップ手順は、リポジトリの `README.md` に記載された内容を基に、Windows PC の PowerShell で実行できるよう整理したものです。
