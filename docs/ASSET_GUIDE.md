# 素材の使い方

完成素材は `data/asset-manifest.json` にパス・容量・画像サイズを記載しています。

|用途|素材|扱い|
|---|---|---|
|全体背景|assets/backgrounds/garden-paper.webp|縦長の庭。画面全体、中央に本文。PNG原本も同梱|
|ホーム|bear-welcome.png|歓迎するクマ。見出しと重ならない大きさ|
|文法紹介|bear-reading.png|本を読むクマ|
|正解・10問完了|bear-celebrate.png|喜ぶクマ|
|文法を考える|bear-thinking.png|考えるクマ。不正解で責める表情にしない|
|不正解・復習|bear-encourage.png|ハートを持って励ますクマ|
|記録の空状態|bear-sleep.png|眠るクマ|
|設定・記録の装飾|bunny.png / sparrow.png|花を持つウサギ・本を持つ小鳥|
|主要ボタン|assets/ui/button-*.svg|ラベルはHTML。cream/primary/selected/correct/incorrect/disabled|
|単語ブロック|assets/ui/token-*.svg|ラベル・ピンインはHTML。意味のある語単位で伸縮|
|パネル・見出し|paper-panel.svg / title-ribbon.svg|控えめな紙とリボン|
|下部ナビ|navigation-gingham.svg|淡い黄色チェック|
|補助装飾|check-pattern.svg / divider.svg|チェック柄・ハートの区切り|
|選択・進捗|answer-slot.svg / progress-track.svg / progress-fill.svg|進捗の幅はデータに応じて変える|
|機能アイコン|assets/icons/*.svg|SVGは温かい茶色の線。選択時はinline/maskで色を変える|
|アプリアイコン|app-180/192/512.png|180はApple touch icon。通常アイコンとして利用|
|効果音|assets/audio/*.wav|tap/remove/insert/correct/incorrect/complete|
|BGM後付け枠|assets/audio/bgm-slot.json|音源なし・無効で開始|

## 画像の仕様
キャラクター8枚は640×640のRGBA PNG。周囲の透明余白を保持。アトラスを分割し、元画像の透明度を保持して書き出しています。背景は1024×1536。SVGは拡大しても輪郭が崩れません。
タイトル文字、ブロック文字、数字、切替スイッチ、動く進捗の値は画像に焼き込まずHTML/CSSで描画します。SVGは完成した背景装飾として使用でき、可変幅のタイルや大きな解説パネルは同じ配色・線のCSSで再現しても構いません。文字を画像にして読みづらくしたり、角の装飾ごと過度に引き伸ばしたりしないこと。

## 動き
別のアニメーション動画を読み込む必要はありません。歓迎のクマは1回だけ小さく上下、正解は喜ぶ絵へ切替えて小さなハートを3つ、誤答は励ます絵を静かに表示。PNGを用いたtransform/opacityで実装できます。常時跳ねさせない。`prefers-reduced-motion` では動きを抑制。
タイルはタップで1px沈み、移動は180ms前後。ドラッグ中は少し浮き、挿入位置を細い赤線で示す。色だけで採点結果を示さない。

## 由来
クマ、仲間、庭は今回の制作キット用に画像生成で作成。UIの簡単な形・アイコンはSVGで作成。効果音は波形合成で新規作成し、外部録音素材は使っていません。生成プロンプトは `IMAGE_PROMPTS.md`。
`references/target-layout.png` はユーザー提供の画面イメージ。配置・配色の参考専用であり、その中の既存キャラクターや文字を切り抜いてアプリへ載せないこと。
