# Sales Transcriber 🎙️

営業同行時のお客さんとの会話を録音・文字起こしし、Markdown形式で整理するWebアプリです。

## 概要

商談・訪問時の会話をリアルタイムで録音し、AWS Transcribeを使って自動で文字起こし。
そのままMarkdown形式の議事録・商談メモとして出力できます。

## 主な機能

- 🎤 **録音** — ブラウザから直接マイク録音
- 📁 **ファイルアップロード** — 既存の音声ファイル（MP3・WAV・M4A）をアップロード
- 🤖 **自動文字起こし** — Amazon Transcribeによる高精度な日本語認識
- 📝 **Markdown出力** — 商談メモ・議事録テンプレートに自動整形
- 📋 **コピー＆ダウンロード** — Markdownをそのままコピーまたは `.md` ファイルとして保存

## システム構成

```
ブラウザ (GitHub Pages)
    │
    ├── 録音 / ファイルアップロード
    │
    ▼
Amazon API Gateway
    │
    ├── POST /transcribe  → AWS Lambda → Amazon Transcribe
    │                                         │
    │                                         └── Amazon S3（音声ファイル保管）
    │
    └── GET  /result/{id} → AWS Lambda → Amazon Transcribe（結果取得）
```

### 使用AWSサービス

| サービス | 用途 |
|---|---|
| **Amazon Transcribe** | 音声→テキスト変換（日本語対応） |
| **Amazon S3** | 音声ファイルの一時保管 |
| **AWS Lambda** | バックエンド処理 |
| **Amazon API Gateway** | フロントエンドとのREST API |
| **AWS IAM** | アクセス権限管理 |

## 技術スタック

### フロントエンド
- React + TypeScript
- Vite（ビルドツール）
- GitHub Pages（ホスティング）
- GitHub Actions（CI/CD）

### バックエンド（AWS）
- Node.js 20.x (Lambda)
- AWS SDK v3
- Amazon Transcribe Streaming API

## セットアップ

### 前提条件

- Node.js 20以上
- AWS アカウント
- AWS CLI（設定済み）
- GitHub CLI（`gh`）

### 1. リポジトリのクローン

```bash
git clone https://github.com/masan-sato/sales-transcriber.git
cd sales-transcriber
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. AWS インフラのデプロイ

```bash
cd infrastructure
npm install
npm run deploy
```

デプロイ後に表示される API Gateway のエンドポイントURLをメモします。

### 4. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```env
VITE_API_ENDPOINT=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_AWS_REGION=ap-northeast-1
```

### 5. ローカル開発サーバー起動

```bash
npm run dev
```

### 6. GitHub Pages へのデプロイ

`main` ブランチにプッシュすると GitHub Actions が自動でビルド＆デプロイします。

GitHub リポジトリの Settings → Pages で **Source: GitHub Actions** を選択してください。

## ディレクトリ構成

```
sales-transcriber/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 自動デプロイ
├── src/
│   ├── components/
│   │   ├── AudioRecorder.tsx   # 録音コンポーネント
│   │   ├── FileUploader.tsx    # ファイルアップロード
│   │   ├── TranscriptViewer.tsx # 文字起こし結果表示
│   │   └── MarkdownExporter.tsx # Markdown出力
│   ├── hooks/
│   │   └── useTranscribe.ts    # 文字起こしロジック
│   ├── services/
│   │   └── transcribeService.ts # API呼び出し
│   ├── App.tsx
│   └── main.tsx
├── infrastructure/
│   ├── lambda/                 # Lambda関数コード
│   └── template.yaml           # AWS SAM テンプレート
├── docs/
│   └── architecture.md         # 詳細アーキテクチャ図
├── .env.example
├── package.json
└── README.md
```

## Markdown 出力フォーマット

文字起こし結果は以下のテンプレートで整形されます：

```markdown
# 商談メモ

**日時**: 2026-06-29  
**場所**:   
**参加者**:   

---

## 会話内容

（文字起こしテキスト）

---

## アクションアイテム

- [ ] 

## 次回アポ

-  
```

## ライセンス

MIT
