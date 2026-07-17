// 出題ロジック（DESIGN §3）。シード無しランダム。
//
// 1問の作り方:
//   1. 有効カテゴリ（おとなモードでオンのもの）から出題対象カテゴリを1つ選び、正解語を1つ選ぶ。
//   2. 誤答は「別カテゴリから1語ずつ」選ぶ（1問の選択肢は各カテゴリ最大1語）。これで見た目が
//      必ずはっきり違う組み合わせになり、紛らわしさを構造的に排除する。
//   3. 選択肢数 K = min(4, 有効カテゴリ数)。有効2→2択 / 3→3択 / 4→4択。誤答は K-1 個。
//   4. 有効カテゴリが1つだけのときのみ、例外的に同カテゴリ内から誤答を選ぶ（§13 仮置き）。
//   5. 選択肢をシャッフルしてベルトに載せる。5問で1セット（generateSet(5)）。

import { CategoryId, Question, WordItem } from '../types';
import { wordsByCategory } from './words';
import { ALL_CATEGORIES } from '../settings';

// 見た目が紛らわしい絵文字ペア（1問に同居させない）。emoji の組で持つ。
// 現状は 🍎りんご(くだもの) と 🍅とまと(やさい) の赤丸ペアのみ。増やすときはここに足す。
const CONFUSABLE: ReadonlyArray<readonly [string, string]> = [['🍎', '🍅']];

function confusable(a: string, b: string): boolean {
  return CONFUSABLE.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 有効カテゴリを正規化（既知idのみ・重複除去・最低1つ・順序を ALL に揃える）。
function normalizeCats(cats: CategoryId[]): CategoryId[] {
  const set = new Set(cats);
  const list = ALL_CATEGORIES.filter((c) => set.has(c));
  return list.length >= 1 ? list : [...ALL_CATEGORIES];
}

// 選択肢集合が既存のどれかと紛らわしいなら true。
function anyConfusable(chosen: WordItem[], cand: WordItem): boolean {
  return chosen.some((w) => confusable(w.emoji, cand.emoji));
}

// 1問を作る。activeCats は有効カテゴリ（空なら全カテゴリ扱い）。
// avoidWord を渡すと、その語が正解に連続しないように軽く避ける。
export function generateQuestion(activeCats: CategoryId[], avoidWord?: string): Question {
  const cats = normalizeCats(activeCats);

  // 正解カテゴリと正解語。avoidWord と同じ語は軽く避ける。
  const answerCat = pick(cats);
  let answer = pick(wordsByCategory(answerCat));
  if (avoidWord) {
    let guard = 0;
    while (answer.word === avoidWord && guard < 8) {
      answer = pick(wordsByCategory(answerCat));
      guard++;
    }
  }

  const choices: WordItem[] = [answer];

  if (cats.length === 1) {
    // §13: 有効カテゴリが1つだけ → 同カテゴリ内から誤答（見た目が似る可能性を許容）。
    const K = Math.min(4, wordsByCategory(answerCat).length);
    const pool = shuffle(wordsByCategory(answerCat).filter((w) => w.word !== answer.word));
    for (const cand of pool) {
      if (choices.length >= K) break;
      if (anyConfusable(choices, cand)) continue; // 紛らわしいペアは避ける
      choices.push(cand);
    }
    // 紛らわしさ回避で足りない時の安全網（同カテゴリから素直に埋める）。
    for (const cand of pool) {
      if (choices.length >= K) break;
      if (!choices.includes(cand)) choices.push(cand);
    }
  } else {
    // 複数カテゴリ: K = min(4, 有効カテゴリ数)。誤答は正解カテゴリ以外の各カテゴリから1語ずつ。
    const K = Math.min(4, cats.length);
    const otherCats = shuffle(cats.filter((c) => c !== answerCat));
    for (const c of otherCats) {
      if (choices.length >= K) break;
      // このカテゴリから、既存の選択肢と紛らわしくない語を1つ選ぶ。
      const pool = shuffle(wordsByCategory(c));
      const cand = pool.find((w) => !anyConfusable(choices, w)) ?? pool[0];
      choices.push(cand);
    }
  }

  return { answer, choices: shuffle(choices) };
}

// 1セット（既定5問）。前問と正解語が連続で被らない程度に分散する（シード固定はしない）。
export function generateSet(activeCats: CategoryId[], count = 5): Question[] {
  const out: Question[] = [];
  let prevWord: string | undefined;
  for (let i = 0; i < count; i++) {
    const q = generateQuestion(activeCats, prevWord);
    out.push(q);
    prevWord = q.answer.word;
  }
  return out;
}