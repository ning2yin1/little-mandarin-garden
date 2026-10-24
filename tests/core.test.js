import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  defaults,
  grade,
  shuffle,
  move,
  record,
  validateSave,
} from "../core.js";
const data = JSON.parse(
    fs.readFileSync(new URL("../data/curriculum.json", import.meta.url)),
  ),
  qs = data.lessons.flatMap((l) => l.questions),
  fixtures = JSON.parse(
    fs.readFileSync(
      new URL("../data/acceptance-fixtures.json", import.meta.url),
    ),
  );
test("72 lessons, 720 questions, categories and every supplied alternative", () => {
  assert.equal(data.lessons.length, 72);
  assert.equal(qs.length, 720);
  for (const l of data.lessons) {
    assert.deepEqual(
      l.questions.map((q) => q.category),
      [
        "daily",
        "daily",
        "daily",
        "daily",
        "anime",
        "anime",
        "anime",
        "gag",
        "gag",
        "gag",
      ],
    );
    for (const q of l.questions) {
      for (const ids of q.accepted_orders)
        assert.equal(grade(q, ids), "correct", q.id);
      for (let i = 0; i < 5; i++) {
        const ids = shuffle(q);
        assert.equal(new Set(ids).size, q.tokens.length);
        assert.equal(grade(q, ids), "incorrect", q.id);
      }
    }
  }
});
for (const f of fixtures.grading_cases)
  test(f.id, () => {
    const q = qs.find((q) => q.id === f.question_id),
      unused = [...q.tokens];
    const ids = f.submitted_words.map((w) => {
      const i = unused.findIndex((t) => t[f.script] === w);
      return i < 0 ? "unknown" : unused.splice(i, 1)[0].id;
    });
    assert.equal(grade(q, ids), f.expected);
  });
test("duplicate IDs cannot count as a complete answer", () => {
  const q = qs[0];
  assert.equal(
    grade(q, [q.tokens[0].id, q.tokens[0].id, q.tokens[1].id]),
    "incomplete",
  );
});
test("insertion, reorder, return conserve IDs", () => {
  let s = { answerTokenIds: ["a", "c"], bankTokenIds: ["b", "d"] };
  s = move(s, "b", "answer", 1);
  assert.deepEqual(s.answerTokenIds, ["a", "b", "c"]);
  s = move(s, "c", "answer", 0);
  assert.deepEqual(s.answerTokenIds, ["c", "a", "b"]);
  s = move(s, "a", "bank", 1);
  assert.deepEqual(s, { answerTokenIds: ["c", "b"], bankTokenIds: ["d", "a"] });
});
test("a wrong first attempt stays wrong after a correct review", () => {
  let p = record({}, "q", "incorrect");
  p = record(p, "q", "correct");
  assert.equal(p.q.correctFirstTry, false);
  assert.equal(p.q.mastered, true);
  assert.equal(p.q.attempts, 2);
});
test("backup roundtrip and invalid import rejection", () => {
  const d = defaults();
  assert.deepEqual(validateSave(d, data.lessons), {
    ...d,
    contentVersion: undefined,
  });
  assert.throws(() => validateSave({ ...d, saveVersion: 9 }, data.lessons));
  assert.throws(() =>
    validateSave(
      { ...d, settings: { ...d.settings, sfxVolume: 99 } },
      data.lessons,
    ),
  );
  assert.throws(() =>
    validateSave(
      { ...d, progress: { [qs[0].id]: { attempts: -2 } } },
      data.lessons,
    ),
  );
  d.session = {
    lessonId: "g001",
    questionId: qs[0].id,
    queue: ["g001-q01"],
    index: 0,
    score: 0,
    mistakes: [],
    answerTokenIds: [],
    bankTokenIds: qs[0].tokens.map((t) => t.id),
    result: null,
  };
  assert.deepEqual(validateSave(d, data.lessons).session, d.session);
  d.session.bankTokenIds.push(d.session.bankTokenIds[0]);
  assert.throws(() => validateSave(d, data.lessons));
});
