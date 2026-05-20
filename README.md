# 疑義照会プロトコル管理アプリ

あじさい薬局（くろしお薬局グループ）における、各医療機関の **疑義照会簡素化プロトコル** と
**連絡方法（電話・FAX・トレース提出方法）** を分類別に検索・参照するための静的 Web アプリ。

## 構成

- フロントエンド: 素の HTML / CSS / JavaScript
- データ: `data.json`（リポジトリ内で管理）
- ホスティング: GitHub Pages（予定）
- データ更新: ユーザー（エリアマネージャー）が `data.json` を編集 → git commit → push → 全店反映

## ディレクトリ

```
疑義照会プロトコル_アプリ/
├── README.md      ← このファイル
├── data.json      ← プロトコル本体（institutions / categories / protocols）
├── index.html     ← 未作成
├── app.js         ← 未作成
├── style.css      ← 未作成
└── pdfs/          ← 元 PDF のコピー置き場（未作成）
```

## データ構造（data.json）

3 つのエンティティで構成:

| エンティティ | 内容 |
| --- | --- |
| `categories` | 疑義カテゴリのマスタ（銘柄変更/剤形変更/規格変更 など 12 種） |
| `institutions` | 医療機関マスタ（連絡先・受付時間・運用開始日等） |
| `protocols` | (institution × category) ごとの簡素化可否・連絡方法・条件・例外 |

### protocol オブジェクトの主要フィールド

| フィールド | 内容 |
| --- | --- |
| `simplification` | ○ / △ / × |
| `feedback` | 不要 / 必要 / 条件付必要 |
| `contactMethod` | FAX / 電話 / FAX+電話 など |
| `contactDest` | 送信先（部署名・番号） |
| `timing` | 報告タイミング（随時 / 翌営業日 9:00 まで など） |
| `requiredItems` | 報告書に記載が必要な項目 |
| `conditions` | 簡素化適用の条件 |
| `exceptions` | 除外（適用しないケース） |
| `notes` | 補足 |
| `sourcePdf` | 元 PDF への相対パス |

## 現在のステータス（v0.4.0）

- 7 施設 / 12 カテゴリ / 57 プロトコルを投入済み（全プロトコルを PDF 原文詳細版に整備）
  - 高知医療センター（医療C）
  - 高知赤十字病院（日赤）
  - **近森会グループ（近森会）** ※ 近森病院・近森リハ・近森オルソリハの3施設共通プロトコル
  - 高知県立あき総合病院（あき）
  - 医療法人 久会 図南病院（図南）
  - 高知大学医学部附属病院（医大）
  - 独立行政法人国立病院機構 高知病院（国立高知）
- `_meta.ajisaiDrJoy: false` … あじさい薬局は Dr.JOY 非連携（医大の運用分岐に影響）
- protocol に `sourceRef` フィールドあり（原本 PDF 内の該当項目記号、例: 「2.①」「5.(ア)」）
- institution の contacts に `label` フィールドあり（複数施設の連絡先を識別表示）

## 運用ルール

- **患者個人情報は data.json に含めない**（医療機関のルール文書のみ）
- 元 PDF の改訂が発生したら `protocolDate` / `revisedDate` を更新し、変更点を notes に追記
- 大幅な改訂はリポジトリのコミット履歴で追跡

## 未着手タスク

1. `index.html` / `app.js` / `style.css` 実装
2. PDF を `pdfs/` 配下にコピー
3. GitHub リポジトリ作成・GitHub Pages 公開
4. 各店舗からアクセス確認
