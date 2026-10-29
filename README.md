# 親のこと、家族のこと。

https://oyatokazoku.com/ の静的サイト。既存80ページのURLを維持し、相談・家族・費用メモ `/tools/` を追加しています。

```sh
npm run build
npm run check
```

- `content/pages.json`: 本文と編集日時。制度の確認日は本文内に個別記載。
- `content/actions.json`: 75ガイドの最初の行動、質問例、行き詰まった場合の対応。
- `scripts/generate.mjs`: 共通ヘッダー・本文・サイトマップ・検索索引を生成。
- `static/site.js`: メモの入力、費用計算、テキスト保存、印刷、記事検索。入力値は送信・永続保存しません。
- `npm run check`: URL・ページ内アンカー・一意なタイトル・全ガイドの行動案内・共通モデルの一致・費用計算・保存処理を確認。実ブラウザの表示検査は別途必要です。

出力は `dist`。Cloudflare Workers の既存ビルドは `npm run build`、公開コマンドは `npx wrangler deploy`。本番用リポジトリは `born2coder/oyatokazoku-cloudflare`、編集元は `born2coder/oyatokazoku-static` です。公開用リポジトリの main 更新で既存のビルドが開始します。

費用比較は説明用の架空例です。実家の比較・賃貸・解体ページは同じ試算ブロックを掲載し、検証で一致を確認します。金額変更時は3ページを同時に更新してください。
