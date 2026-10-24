import {
  defaults,
  grade,
  shuffle,
  move,
  record,
  validateSave,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let data,
  state = defaults(),
  page = "home",
  lessonId = "",
  filter = 0,
  search = "",
  cursor = null,
  drag = null,
  suppressClick = 0,
  voices = [],
  audioContext,
  storageBlocked = false;
const bgm = { enabled: false, src: null, volume: 0.2, loop: true };
const icon = (n) => `<img class="icon" alt="" src="./assets/icons/${n}.svg">`,
  art = (n, cls = "art") =>
    `<img class="${cls}" alt="" src="./assets/characters/${n}.png">`,
  btn = (label, action, cls = "", extra = "") =>
    `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function notify(text) {
  $("#notice").textContent = text;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#notice").textContent = ""), 4000);
}
function save() {
  if (storageBlocked) {
    notify(
      "元の記録を保護しています。新しい記録は書き出しで保存してください。",
    );
    return;
  }
  try {
    localStorage.setItem("mandarin-garden-v1", JSON.stringify(state));
  } catch {
    notify("記録を保存できませんでした。書き出しで保存できます。");
  }
}
function stop() {
  window.speechSynthesis?.cancel();
}
function sound(name) {
  if (!state.settings.sfx || window.speechSynthesis?.speaking) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    const a = new Audio(new URL(`./assets/audio/${name}.wav`, location.href));
    a.volume = state.settings.sfxVolume;
    a.play().catch(() => {});
  } catch {}
}
function go(p) {
  cancelDrag();
  stop();
  page = p;
  cursor = null;
  render();
}
const question = () =>
    data.lessons
      .flatMap((l) => l.questions)
      .find((q) => q.id === state.session?.questionId),
  lesson = () =>
    data.lessons.find((l) => l.id === (state.session?.lessonId || lessonId)),
  word = (t) => esc(t[state.settings.script]);
function nav() {
  return `<nav aria-label="メイン">${[
    ["home", "home", "ホーム"],
    ["lessons", "book", "文法"],
    ["records", "leaf", "きろく"],
    ["settings", "settings", "設定"],
  ]
    .map(([p, i, t]) => btn(icon(i) + t, `go:${p}`, page === p ? "active" : ""))
    .join("")}</nav>`;
}
function title(text) {
  return `<h1 class="ribbon">${text}</h1>`;
}
function home() {
  return `<header><div class="brand">little mandarin<br><span>garden</span><small>ことばの、ちいさな庭。</small></div>${btn(icon("settings"), "go:settings", "round", 'aria-label="設定"')}</header><section class="hero"><span class="eyebrow">A LITTLE EVERY DAY</span><h1>ことばを並べて、<br>今日もちいさな<br>一歩。</h1>${art("bear-welcome", "hero-bear")}</section><section class="panel"><span class="eyebrow">YOUR LITTLE NOTE</span><h2>今日のことばを、ひとつ。</h2>${btn("文法を選ぶ " + icon("arrow"), "go:lessons", "primary wide")}</section><div class="two">${state.session ? btn(`${icon("play")}続きから<small>${esc(lesson()?.title_ja)} · ${state.session.index + 1}問目</small>`, "resume", "paper") : ""}${btn(`${icon("leaf")}わたしの記録<small>${Object.keys(state.progress).length}のことばを学習</small>`, "go:records", "paper")}${btn(`${icon("heart")}苦手を復習<small>${Object.values(state.progress).filter((p) => !p.mastered).length}問</small>`, "review", "paper")}</div><div class="friends">${art("bunny")}${art("sparrow")}</div>`;
}
function lessons() {
  return (
    title("文法を見つける ♡") +
    `<label class="search">${icon("search")}<input id="search" type="search" placeholder="文法をさがす" aria-label="文法をさがす" value="${esc(search)}"></label><div class="filters">${[0, 1, 2, 3].map((n) => btn(n ? `HSK${n}目安` : "すべて", `filter:${n}`, filter === n ? "selected" : "", 'aria-pressed="' + (filter === n) + '"')).join("")}</div><div id="lesson-list">${lessonCards()}</div>`
  );
}
function lessonCards() {
  return (
    data.lessons
      .filter(
        (l) =>
          (!filter || l.level === filter) &&
          JSON.stringify([
            l.title_ja,
            l.pattern,
            l.explanation_ja,
            l.questions.map((q) => q.sentence),
          ])
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .map((l) => {
        let done = l.questions.filter((q) => state.progress[q.id]).length,
          weak = l.questions.filter(
            (q) => state.progress[q.id] && !state.progress[q.id].mastered,
          ).length;
        return btn(
          `<i>${l.id.slice(1)}</i><span><b>${esc(l.title_ja)}</b><small>HSK${l.level}目安 · 10問 · ${done}/10${weak ? ` · 苦手${weak}` : ""}</small></span>${icon("next")}`,
          `intro:${l.id}`,
          "lesson-card",
        );
      })
      .join("") || '<p class="empty">見つかりませんでした。</p>'
  );
}
function intro() {
  const l = data.lessons.find((l) => l.id === lessonId),
    q = l.questions[0];
  return (
    btn(icon("back") + "文法一覧", "go:lessons", "quiet") +
    `<p class="eyebrow">GRAMMAR ${l.id.slice(1)} / HSK${l.level}目安</p><h1>${esc(l.title_ja)}</h1><section class="panel"><h2 class="pattern">${esc(l.pattern)}</h2><p>${esc(l.explanation_ja)}</p><p class="sentence" lang="zh">${esc(q.sentence[state.settings.script])}</p><p class="pinyin">${esc(q.sentence.pinyin)}</p><p class="center">${esc(q.prompt_ja)}</p></section>${btn("10問をはじめる " + icon("arrow"), `start:${l.id}`, "primary wide")}${art("bear-reading")}`
  );
}
function token(id) {
  const t = question().tokens.find((t) => t.id === id);
  return `<button class="token" data-token="${id}" aria-label="${word(t)}、${esc(t.pinyin)}" aria-pressed="${state.session.answerTokenIds.includes(id)}"><span>${esc(t.pinyin)}</span><b lang="zh">${word(t)}</b></button>`;
}
function exercise() {
  const s = state.session,
    q = question(),
    l = lesson();
  return `<div class="exercise-head">${btn(icon("close"), "go:home", "round", 'aria-label="閉じる"')}<span>${esc(l.title_ja)}</span>${btn(icon("settings"), "go:settings", "round", 'aria-label="設定"')}${btn(icon(state.favorites.includes(q.id) ? "star" : "bookmark"), "favorite", "round", 'aria-label="お気に入り" aria-pressed="' + state.favorites.includes(q.id) + '"')}</div><progress max="${s.queue.length}" value="${s.index + 1}" aria-label="進捗"></progress><div class="line small"><span>${{ daily: "日常のひとこと", anime: "アニメと、ことば", gag: "くすっと、ひとこと" }[q.category]}</span><span>${s.index + 1} / ${s.queue.length}</span></div><h1 class="prompt">${esc(q.prompt_ja)}</h1><div id="answer" class="answer" aria-label="回答欄">${s.answerTokenIds.map((id, i) => `<span class="slot ${cursor === i ? "caret" : ""}" data-slot="${i}">${token(id)}</span>`).join("")}<button class="end-slot ${cursor === s.answerTokenIds.length ? "caret" : ""}" data-slot="${s.answerTokenIds.length}" aria-label="末尾に挿入">${q.terminal_punctuation === "？" ? "？" : "。"}</button></div><div class="line">${btn(icon("reset") + "やり直す", "reset", "quiet")}<span id="remaining" role="status" class="small"></span></div><div id="bank" class="bank" aria-label="未選択の語">${s.bankTokenIds.map(token).join("")}</div><div class="exercise-footer">${btn("答え合わせ", "check", "primary wide")}</div><div id="token-actions" class="sr-only" aria-label="選択語の操作">${s.answerTokenIds
    .map((id) => {
      const t = q.tokens.find((t) => t.id === id);
      return `<span>${word(t)} ${btn("左へ", `left:${id}`)}${btn("右へ", `right:${id}`)}${btn("戻す", `return:${id}`)}</span>`;
    })
    .join("")}</div>`;
}
function rate() {
  return `<select id="rate" aria-label="読み上げ速度">${[0.75, 1, 1.25].map((n) => `<option ${state.settings.voiceRate === n ? "selected" : ""} value="${n}">${n}×</option>`).join("")}</select>`;
}
function answer() {
  const q = question(),
    s = state.session,
    ok = s.result === "correct";
  return `<div class="line">${btn(icon("close"), "go:home", "round", 'aria-label="閉じる"')}<span class="small">${esc(lesson().title_ja)} · ${s.index + 1}/${s.queue.length}</span></div>${title(ok ? "✓ できた！" : "× おしい、もう一歩。")}<div class="answer-summary">${art(ok ? "bear-celebrate" : "bear-encourage", "reward")}<p class="sentence" lang="zh">${esc(q.sentence[state.settings.script])}</p><p class="pinyin">${esc(q.sentence.pinyin)}</p><p>${esc(q.prompt_ja)}</p></div>${!ok ? `<div class="panel"><b>あなたの解答 ×</b><p lang="zh">${s.answerTokenIds.map((id) => word(q.tokens.find((t) => t.id === id))).join(" · ")}</p><b>正しい語順 ✓</b><p lang="zh">${q.canonical_order.map((id) => word(q.tokens.find((t) => t.id === id))).join(" · ")}</p></div>` : ""}<div class="line">${btn(icon("sound") + "音声を聞く", "speak")}${btn(icon("pause"), "stop", "round", 'aria-label="読み上げ停止"')}${rate()}</div><section class="panel"><h2>${esc(lesson().pattern)}</h2><p>${esc(q.explanation_ja)}</p><p>${esc(q.answer_note_ja)}</p><table><caption>ことばの役割</caption><thead><tr><th>語・ピンイン</th><th>品詞・役割</th><th>意味</th></tr></thead><tbody>${q.canonical_order
    .map((id) => {
      const t = q.tokens.find((t) => t.id === id);
      return `<tr><td lang="zh"><b>${word(t)}</b><small>${esc(t.pinyin)}</small></td><td>${esc(t.pos)}<small>${esc(t.role_ja)}</small></td><td>${esc(t.meaning_ja)}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></section>${btn(s.index + 1 === s.queue.length ? "結果を見る" : "次の問題へ " + icon("arrow"), "next", "primary wide")}`;
}
function results() {
  const s = state.session;
  return (
    title("今日のじぶんに、はなまるを。") +
    art("bear-celebrate") +
    `<p class="score">${s.score}<small> / ${s.queue.length}</small></p><p class="center">${esc(lesson().title_ja)}</p>${s.mistakes.length ? btn("苦手だけ復習", "session-review", "primary wide") : ""}${btn("同じ文法をもう一度", `start:${s.lessonId}`, "wide")}${btn("文法一覧へ", "finish", "wide")}`
  );
}
function records() {
  const weak = Object.entries(state.progress)
    .filter(([, p]) => !p.mastered)
    .map(([id]) => id);
  return (
    title("わたしの記録 ♡") +
    `<div class="stats"><b>${Object.keys(state.progress).length}<small>学んだことば</small></b><b>${Object.values(state.progress).filter((p) => p.correctFirstTry).length}<small>初回正解</small></b><b>${state.favorites.length}<small>お気に入り</small></b></div><div class="two">${btn("苦手 " + weak.length + "問", "review", "paper")}${btn("お気に入り " + state.favorites.length + "問", "favorites", "paper")}</div>${
      Object.keys(state.progress).length
        ? data.lessons
            .filter((l) => l.questions.some((q) => state.progress[q.id]))
            .map((l) =>
              btn(
                `<span>${esc(l.title_ja)}<small>${l.questions.filter((q) => state.progress[q.id]).length}/10 · 苦手 ${l.questions.filter((q) => state.progress[q.id] && !state.progress[q.id].mastered).length}</small></span>${icon("next")}`,
                `intro:${l.id}`,
                "lesson-card",
              ),
            )
            .join("")
        : art("bear-sleep") + '<p class="center">ちいさな一歩が、ここに。</p>'
    }<h2>直近の学習</h2>${state.history
      .slice(-10)
      .reverse()
      .map(
        (h) =>
          `<div class="history">${esc(data.lessons.find((l) => l.id === h.lessonId)?.title_ja || "復習")}<small>${esc(new Date(h.date).toLocaleString("ja-JP"))} · ${h.correct}/${h.total}</small></div>`,
      )
      .join("")}${art("sparrow")}`
  );
}
function settings() {
  return (
    title("わたしの設定 ♡") +
    (state.session ? btn(icon("back") + "問題へ戻る", "resume", "wide") : "") +
    `<section class="panel"><h2>中国語の文字</h2><div class="two">${btn("繁體字", "script:traditional", state.settings.script === "traditional" ? "selected" : "", 'aria-pressed="' + (state.settings.script === "traditional") + '"')}${btn("简体字", "script:simplified", state.settings.script === "simplified" ? "selected" : "", 'aria-pressed="' + (state.settings.script === "simplified") + '"')}</div></section><section class="panel"><label class="setting">効果音<input id="sfx" type="checkbox" role="switch" ${state.settings.sfx ? "checked" : ""}></label><label class="setting">効果音量<input id="volume" type="range" min="0" max="1" step="0.05" value="${state.settings.sfxVolume}"></label><label class="setting">読み上げ速度${rate()}</label><label class="setting">中国語の音声<select id="voice"><option value="">普通話（自動）</option>${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${state.settings.voiceURI === v.voiceURI ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}</select></label><div class="setting">${btn(icon("download") + "記録を書き出す", "export", "wide")}</div><label class="import">${icon("upload")}記録を読み込む<input type="file" id="import" accept="application/json,.json"></label></section>${art("bunny")}`
  );
}
function render() {
  cancelDrag();
  $("#app").className = ["exercise"].includes(page) ? "shell playing" : "shell";
  $("#app").innerHTML =
    `<main id="main">${{ home, lessons, intro, exercise, answer, results, records, settings }[page]()}</main>${["exercise", "answer", "intro"].includes(page) ? "" : nav()}`;
  $("#main").scrollTop = 0;
}
function begin(lid, queue) {
  stop();
  const l = data.lessons.find((l) => l.id === lid);
  queue ??= l.questions.map((q) => q.id);
  state.session = {
    lessonId: lid,
    queue,
    index: 0,
    questionId: queue[0],
    answerTokenIds: [],
    bankTokenIds: [],
    score: 0,
    mistakes: [],
    result: null,
  };
  fresh();
  go("exercise");
}
function fresh() {
  const q = question();
  state.session.answerTokenIds = [];
  state.session.bankTokenIds = shuffle(q);
  state.session.result = null;
  cursor = null;
  save();
}
function resume() {
  go(
    state.session?.result
      ? state.session.completed
        ? "results"
        : "answer"
      : "exercise",
  );
}
function transfer(id, to, index) {
  state.session = move(state.session, id, to, index);
  save();
}
function check() {
  const s = state.session,
    q = question(),
    result = grade(q, s.answerTokenIds);
  if (result === "incomplete") {
    $("#remaining").textContent =
      `あと${q.tokens.length - s.answerTokenIds.length}語`;
    return;
  }
  s.result = result;
  state.progress = record(state.progress, q.id, result);
  if (result === "correct") s.score++;
  else s.mistakes.push(q.id);
  save();
  sound(result);
  go("answer");
}
function next() {
  const s = state.session;
  if (s.index + 1 === s.queue.length) {
    if (!s.completed) {
      s.completed = true;
      state.history.push({
        lessonId: s.lessonId,
        date: new Date().toISOString(),
        correct: s.score,
        total: s.queue.length,
      });
      state.history = state.history.slice(-100);
    }
    save();
    sound("complete");
    go("results");
  } else {
    s.index++;
    s.questionId = s.queue[s.index];
    s.lessonId = data.lessons.find((l) =>
      l.questions.some((q) => q.id === s.questionId),
    ).id;
    fresh();
    go("exercise");
  }
}
function speak() {
  stop();
  voices =
    window.speechSynthesis?.getVoices().filter((v) => /^zh/i.test(v.lang)) ||
    [];
  const voice =
    voices.find((v) => v.voiceURI === state.settings.voiceURI) ||
    voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ||
    voices[0];
  if (!voice) {
    notify("中国語の音声が見つかりません");
    return;
  }
  const u = new SpeechSynthesisUtterance(
    question().sentence[state.settings.script],
  );
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = state.settings.voiceRate;
  window.speechSynthesis.speak(u);
}
$("#app").addEventListener("click", (e) => {
  if (Date.now() < suppressClick) return;
  const t = e.target.closest("[data-token]");
  if (t && page === "exercise") {
    const id = t.dataset.token,
      s = state.session,
      inAnswer = s.answerTokenIds.includes(id);
    transfer(
      id,
      inAnswer ? "bank" : "answer",
      inAnswer ? s.bankTokenIds.length : (cursor ?? s.answerTokenIds.length),
    );
    if (!inAnswer && cursor !== null) cursor++;
    sound(inAnswer ? "remove" : "tap");
    render();
    return;
  }
  const slot = e.target.closest("[data-slot]");
  if (slot) {
    cursor = Number(slot.dataset.slot);
    render();
    return;
  }
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const [a, v] = action.split(":");
  if (a === "go") go(v);
  else if (a === "intro") {
    lessonId = v;
    go("intro");
  } else if (a === "filter") {
    filter = Number(v);
    render();
  } else if (a === "start") begin(v);
  else if (a === "resume" && state.session) resume();
  else if (a === "reset") {
    fresh();
    sound("remove");
    render();
  } else if (a === "check") check();
  else if (a === "next") next();
  else if (a === "favorite") {
    const id = question().id;
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((x) => x !== id)
      : [...state.favorites, id];
    save();
    render();
  } else if (a === "script") {
    state.settings.script = v;
    save();
    render();
  } else if (a === "speak") speak();
  else if (a === "stop") stop();
  else if (a === "finish") {
    state.session = null;
    save();
    go("lessons");
  } else if (["review", "favorites", "session-review"].includes(a)) {
    const ids =
      a === "review"
        ? Object.entries(state.progress)
            .filter(([, p]) => !p.mastered)
            .map(([id]) => id)
        : a === "favorites"
          ? state.favorites
          : state.session.mistakes;
    if (!ids.length) {
      notify("復習する問題はまだありません");
      return;
    }
    begin(
      data.lessons.find((l) => l.questions.some((q) => q.id === ids[0])).id,
      [...ids],
    );
  } else if (a === "export") {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "mandarin-garden-records.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (["left", "right", "return"].includes(a)) {
    const s = state.session,
      i = s.answerTokenIds.indexOf(v);
    transfer(
      v,
      a === "return" ? "bank" : "answer",
      a === "return"
        ? s.bankTokenIds.length
        : Math.min(
            s.answerTokenIds.length - 1,
            Math.max(0, i + (a === "left" ? -1 : 1)),
          ),
    );
    render();
  }
});
$("#app").addEventListener("input", (e) => {
  if (e.target.id === "search") {
    search = e.target.value;
    $("#lesson-list").innerHTML = lessonCards();
  } else if (e.target.id === "volume") {
    state.settings.sfxVolume = Number(e.target.value);
    save();
  }
});
$("#app").addEventListener("change", async (e) => {
  const el = e.target;
  if (el.id === "sfx") state.settings.sfx = el.checked;
  else if (el.id === "rate") state.settings.voiceRate = Number(el.value);
  else if (el.id === "voice") state.settings.voiceURI = el.value;
  else if (el.id === "import") {
    try {
      const file = el.files[0];
      if (!file) return;
      if (file.size > 5e6) throw Error();
      const restored = validateSave(
        JSON.parse(await file.text()),
        data.lessons,
      );
      if (!confirm("現在の記録を、読み込んだ記録に置き換えますか？")) return;
      state = restored;
      storageBlocked = false;
      save();
      render();
      notify("記録を読み込みました");
    } catch {
      notify("読み込めませんでした。記録の形式を確認してください。");
    }
    return;
  }
  save();
});
function cancelDrag() {
  if (!drag) return;
  if (drag.active) suppressClick = Date.now() + 500;
  clearTimeout(drag.timer);
  try {
    drag.el.releasePointerCapture(drag.pointer);
  } catch {}
  drag.preview?.remove();
  document
    .querySelectorAll(".drop-line")
    .forEach((x) => x.classList.remove("drop-line"));
  drag.el.classList.remove("held");
  drag = null;
}
$("#app").addEventListener("pointerdown", (e) => {
  const el = e.target.closest("[data-token]");
  if (!el || page !== "exercise" || e.button !== 0) return;
  cancelDrag();
  drag = {
    id: el.dataset.token,
    el,
    pointer: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    active: false,
    target: null,
  };
  drag.timer = setTimeout(() => {
    if (!drag) return;
    drag.active = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add("held");
    const p = el.cloneNode(true);
    p.className = "token drag-preview";
    p.removeAttribute("data-token");
    document.body.append(p);
    drag.preview = p;
    p.style.left = drag.x + "px";
    p.style.top = drag.y - 75 + "px";
  }, 300);
});
$("#app").addEventListener(
  "pointermove",
  (e) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) cancelDrag();
      return;
    }
    e.preventDefault();
    drag.preview.style.left = e.clientX + "px";
    drag.preview.style.top = e.clientY - 75 + "px";
    document
      .querySelectorAll(".drop-line")
      .forEach((x) => x.classList.remove("drop-line"));
    const box = $("#answer"),
      r = box.getBoundingClientRect();
    drag.target = null;
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      return;
    const els = [...box.querySelectorAll("[data-token]")].filter(
      (el) => el.dataset.token !== drag.id,
    );
    let best = null,
      dist = Infinity;
    els.forEach((el, i) => {
      const b = el.getBoundingClientRect(),
        dy = Math.max(b.top - e.clientY, 0, e.clientY - b.bottom);
      const before = e.clientX < (b.left + b.right) / 2;
      const d = dy * 1000 + Math.abs(e.clientX - (before ? b.left : b.right));
      if (d < dist) {
        dist = d;
        best = { index: i + (before ? 0 : 1), el: before ? el : els[i + 1] };
      }
    });
    drag.target = best?.index ?? 0;
    (best?.el || box.querySelector(".end-slot")).classList.add("drop-line");
  },
  { passive: false },
);
$("#app").addEventListener("pointerup", (e) => {
  if (!drag || drag.pointer !== e.pointerId) return;
  const { active, id, target } = drag;
  if (active) {
    suppressClick = Date.now() + 500;
    if (target !== null) {
      transfer(id, "answer", target);
      sound("insert");
    }
  }
  cancelDrag();
  if (active) render();
});
$("#app").addEventListener("pointercancel", cancelDrag);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelDrag();
    stop();
  }
});
window.addEventListener("pagehide", () => {
  cancelDrag();
  stop();
});
function loadVoices() {
  voices =
    window.speechSynthesis?.getVoices().filter((v) => /^zh/i.test(v.lang)) ||
    [];
  if (page === "settings") render();
}
window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
async function boot() {
  try {
    const response = await fetch("./data/curriculum.json");
    if (!response.ok) throw Error();
    data = await response.json();
    try {
      const raw = localStorage.getItem("mandarin-garden-v1");
      if (raw) state = validateSave(JSON.parse(raw), data.lessons);
    } catch {
      storageBlocked = true;
      notify("保存記録を読み込めませんでした。元の記録は保持しています。");
    }
    state.contentVersion = data.content_version;
    loadVoices();
    render();
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.register("./sw.js");
        function waiting() {
          if (reg.active && reg.waiting && reg.active !== reg.waiting)
            $("#update").innerHTML = btn("更新する", "update");
        }
        waiting();
        reg.addEventListener("updatefound", () => {
          reg.installing?.addEventListener("statechange", waiting);
        });
        $("#update").addEventListener("click", () => {
          if (page === "exercise" || page === "answer") {
            notify("学習を閉じてから更新できます");
            return;
          }
          save();
          window.gardenUpdateRequested = true;
          reg.waiting?.postMessage("activate");
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (window.gardenUpdateRequested) location.reload();
        });
      } catch {
        notify(
          "オフラインの準備ができませんでした。オンラインで学習できます。",
        );
      }
    }
  } catch (e) {
    $("#app").innerHTML =
      '<p>庭を読み込めませんでした。</p><button onclick="location.reload()">もう一度</button>';
    console.error(e);
  }
}
boot();
