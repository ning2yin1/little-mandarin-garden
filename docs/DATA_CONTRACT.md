# データ接続ガイド

教材の原本は `data/curriculum.json`。実装時にPythonは不要です。`curriculum.schema.json` は構造、`lesson-index.json` は一覧用の軽量索引です。

## IDとフィールド
- lesson `id`: g001〜g072。表示順や級を変えてもこのIDを保持。
- `level`: 1〜3（スキーマは将来6まで許容）。公式の厳密な所属ではなく、目安。
- `pattern` / `explanation_ja`: 文法紹介と解説に表示。
- question `id`: g027-q01等。`category` は daily / anime / gag。
- `prompt_ja`: 日本語のお題。
- `sentence`: 簡体字、繁体字、全文ピンイン。
- `tokens`: 出題の全ブロック。それぞれ固有ID、両字体、ピンイン、品詞、日本語の意味、役割ラベル。
- `canonical_order`: 模範のtoken ID順。
- `accepted_orders`: 正しいID順の候補。採点時はIDそのものではなく、そこから復元した**簡体字文字列**を比較。
- `segments`: 模範文のトークンと読点の並び。読点は並べ替えブロックとして出さない。末尾は `terminal_punctuation` を付ける。
- `answer_note_ja`: この文の語順と型の確認文。`explanation_ja` と語句テーブルを組み合わせて表示。

## 採点の擬似コード
1. answerTokenIdsが、その問題のtokensのIDを過不足なく1回ずつ持つか確認。
2. 各IDからsimplifiedを取り出して連結。これがsubmission。
3. accepted_ordersの各候補について同じ文字列を作り、submissionと比較。
4. 一致なら正解。別の同一語のIDが入れ替わっていても正解。

重複語を辞書キーにして一つへつぶさないでください。g066-q01には「看」が二つあります。字体やピンインをIDにしないこと。
読点と句点を解答中の並びの評価に入れません。正解画面は `sentence` の完成済み表記を表示できます。別解では模範文も併記してよいですが、別解を不正解扱いしないこと。

## 保存の例（形式提案）
```json
{
  "saveVersion":1,
  "contentVersion":"2026.10.24",
  "settings":{"script":"traditional","sfx":true,"sfxVolume":0.25,"voiceRate":1,"voiceURI":null},
  "session":{"lessonId":"g027","questionId":"g027-q01","answerTokenIds":[],"bankTokenIds":[]},
  "progress":{},
  "favorites":[]
}
```
上記bankTokenIdsは形式を示す空配列です。実際の新規問題では全token IDsをシャッフルして入れてください。保存復元時に欠損や重複を検証します。
`progress` は問題IDをキーとして初回正解、試行数、最終結果、最終学習日時等を保存。日付表示は利用者のローカル時間で扱います。

## 再生成・検証
配布JSONは完成済みなので、実装のために再生成する必要はありません。教材編集時だけ `tools/lessons.txt` と `tools/lexicon.txt` を編集してから `python tools/build_data.py`。
再生成にはPythonのpypinyinとopencc-python-reimplementedが必要。教材の言葉の区切り・日本語訳・語義は著者入力で、ピンインと字体は変換後に文脈に合わせて補正しています。
`python tools/validate_kit.py` で720問の構造と素材を確認できます（Pillowが必要）。これは未来のPWAの動作確認の代わりにはなりません。
`tools/build_assets.py` は制作時の記録です。元の生成画像は references/production-originals に同梱しています。再書き出しは可能ですが、実装には配布済みassetsを直接使用してください。
