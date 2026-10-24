# Little Mandarin Garden

iPhone向け中国語並び替えPWA。付属教材の72文法・720問をそのまま使用します。アカウント・外部API・外部フォントは不要です。

## 開発と検証

Node.js 24、npm、Python 3を使用します。アプリ自体はビルド不要のHTML/CSS/ES Modulesです。

```sh
npm ci --cache /workspace/.npm
npm start
npm test
npm run test:browser
node tests/update.mjs
```

ブラウザテストは起動済みの開発サーバー（4173番）を使います。既定のChromiumは `/usr/bin/chromium`。別のインストール先には `CHROMIUM_PATH`、別URLには `TEST_URL` を指定できます。Playwrightのブラウザダウンロードは不要です。

配布ファイルを変更したら、コミット前に `python3 tools/build_sw.py` でService Workerのファイル一覧と内容ハッシュを更新してください。新しいキャッシュの全ファイルを取得してから待機し、「更新する」の操作で適用します。学習中には更新できません。学習記録はキャッシュから独立したlocalStorageに保存します。

## 公開

リポジトリのルートをHTTPSで静的配信できます。GitHub Pagesでは `main` の `/ (root)` を選びます。`index.html` が入口です。すべて相対パスで、`/little-mandarin-garden/` の配置にも対応します。GitHubへのpush後、Settings → Pagesで公開元ブランチを `main`、フォルダーを `/ (root)` に設定してください。

## データと拡張

`data/curriculum.json` は添付キットの原本で、ID・並び順・720問・67件の追加正解候補を維持しています。採点はトークンの多重集合を確認し、簡体字文字列で比較します。`core.js` が採点、語順操作、保存データ検証を担当します。レベルに依存した固定配列はなく、HSK4〜6は教材の安定IDを維持して追加できます。今は教材が単一ファイルで、将来はレベル別ファイルへ分割して読み込めます。

字体・音量・音声・現在の問題・語順・初回正答・最終結果・復習状態・履歴・お気に入りを端末保存します。設定からJSONバックアップを作成できます。読み込みはバージョン・設定・既知ID・語順の分割を検証し、確認後に置換します。未知の将来IDは無視します。壊れた既存記録は自動上書きしません。

素材は `assets/` のオリジナル画像・SVG・WAVを使用しています。BGMは `assets/audio/bgm-slot.json` に将来枠がありますが初期状態は無音で、存在しない音源を読み込みません。

## 検証範囲

[実装検証記録](docs/IMPLEMENTATION_REPORT.md) を参照。iPhone実機のSafari・ホーム画面PWA・VoiceOver・中国語音声とサイレントモードは別途実機確認が必要です。
