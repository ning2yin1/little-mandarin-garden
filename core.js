export const defaults = () => ({
  saveVersion: 1,
  settings: {
    script: "traditional",
    sfx: true,
    sfxVolume: 0.25,
    voiceRate: 1,
    voiceURI: "",
  },
  session: null,
  progress: {},
  favorites: [],
  history: [],
});
export function grade(q, ids) {
  if (
    ids.length !== q.tokens.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !q.tokens.some((t) => t.id === id))
  )
    return "incomplete";
  const text = (a) =>
    a
      .map((id) => q.tokens.find((t) => t.id === id).simplified)
      .join("")
      .replace(/[\s\p{P}]/gu, "");
  return q.accepted_orders.some((a) => text(a) === text(ids))
    ? "correct"
    : "incorrect";
}
export function shuffle(q) {
  let ids = q.tokens.map((t) => t.id);
  for (let n = 0; n < 30; n++) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    if (grade(q, ids) !== "correct") return ids;
  }
  return [...q.canonical_order].reverse();
}
export function move(session, id, to, index) {
  const a = session.answerTokenIds.filter((x) => x !== id),
    b = session.bankTokenIds.filter((x) => x !== id);
  (to === "answer" ? a : b).splice(Math.max(0, index), 0, id);
  return { ...session, answerTokenIds: a, bankTokenIds: b };
}
export function record(progress, id, result) {
  const old = progress[id];
  return {
    ...progress,
    [id]: {
      correctFirstTry: old?.correctFirstTry ?? result === "correct",
      attempts: (old?.attempts || 0) + 1,
      lastResult: result,
      mastered: result === "correct",
      lastStudied: new Date().toISOString(),
    },
  };
}
export function validateSave(input, lessons) {
  if (
    !input ||
    input.saveVersion !== 1 ||
    !input.settings ||
    !["traditional", "simplified"].includes(input.settings.script) ||
    typeof input.settings.sfx !== "boolean" ||
    !Number.isFinite(input.settings.sfxVolume) ||
    input.settings.sfxVolume < 0 ||
    input.settings.sfxVolume > 1 ||
    ![0.75, 1, 1.25].includes(input.settings.voiceRate) ||
    typeof input.settings.voiceURI !== "string" ||
    !input.progress ||
    typeof input.progress !== "object" ||
    Array.isArray(input.progress) ||
    !Array.isArray(input.favorites) ||
    !Array.isArray(input.history)
  )
    throw Error("記録の形式が正しくありません");
  const qs = new Map(lessons.flatMap((l) => l.questions).map((q) => [q.id, q]));
  const out = defaults();
  out.settings = { ...input.settings };
  out.contentVersion = input.contentVersion;
  for (const [id, p] of Object.entries(input.progress)) {
    if (!qs.has(id)) continue;
    if (
      !p ||
      typeof p.correctFirstTry !== "boolean" ||
      !Number.isInteger(p.attempts) ||
      p.attempts < 1 ||
      !["correct", "incorrect"].includes(p.lastResult) ||
      typeof p.mastered !== "boolean" ||
      !Number.isFinite(Date.parse(p.lastStudied))
    )
      throw Error("学習記録が壊れています");
    out.progress[id] = { ...p };
  }
  out.favorites = input.favorites.filter((id) => qs.has(id));
  out.history = input.history
    .filter(
      (h) =>
        h &&
        typeof h.lessonId === "string" &&
        Number.isFinite(Date.parse(h.date)) &&
        Number.isInteger(h.correct) &&
        Number.isInteger(h.total) &&
        h.correct >= 0 &&
        h.correct <= h.total,
    )
    .slice(-100);
  if (input.session) {
    const s = input.session,
      q = qs.get(s.questionId);
    if (q) {
      if (
        !lessons.some(
          (l) =>
            l.id === s.lessonId &&
            l.questions.some((q) => q.id === s.questionId),
        ) ||
        !Array.isArray(s.queue) ||
        !s.queue.length ||
        s.queue.some((id) => !qs.has(id)) ||
        !Number.isInteger(s.index) ||
        s.index < 0 ||
        s.index >= s.queue.length ||
        s.queue[s.index] !== s.questionId ||
        !Array.isArray(s.answerTokenIds) ||
        !Array.isArray(s.bankTokenIds) ||
        !Number.isInteger(s.score) ||
        s.score < 0 ||
        s.score > s.queue.length ||
        !Array.isArray(s.mistakes) ||
        s.mistakes.some((id) => !qs.has(id))
      )
        throw Error("途中の記録が壊れています");
      const ids = [...s.answerTokenIds, ...s.bankTokenIds];
      if (
        ids.length !== q.tokens.length ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !q.tokens.some((t) => t.id === id)) ||
        (s.result != null && !["correct", "incorrect"].includes(s.result))
      )
        throw Error("語順の記録が壊れています");
      out.session = structuredClone(s);
    }
  }
  return out;
}
