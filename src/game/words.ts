// 単語辞書（DESIGN §3）。1件 = { emoji, word(ひらがな), category }。
// 4カテゴリ × 10語 = 40語。word は全語ユニーク・emoji も全語ユニーク（重複なし）。
// 読み上げ文字列はそのまま word を使う（連濁・表記ゆれを避ける）。
//
// カテゴリをまたぐ「見た目が紛らわしい」組み合わせ（例 🍎りんご と 🍅とまと）は quiz.ts の
// CONFUSABLE で1問に同居しないようにする。同カテゴリ内は1問に最大1語しか出ないので同居しない。

import { CategoryId, WordItem } from '../types';

// カテゴリの表示ラベルと絵文字（おとなモードのオン/オフ表示に使う）。
export const CATEGORY_LABELS: Record<CategoryId, { label: string; emoji: string }> = {
  yasai: { label: 'やさい', emoji: '🥕' },
  kudamono: { label: 'くだもの', emoji: '🍓' },
  doubutsu: { label: 'どうぶつ', emoji: '🐰' },
  norimono: { label: 'のりもの', emoji: '🚗' },
};

export const WORDS: WordItem[] = [
  // やさい（10）
  { id: 'ninjin', emoji: '🥕', word: 'にんじん', category: 'yasai' },
  { id: 'tomato', emoji: '🍅', word: 'とまと', category: 'yasai' },
  { id: 'nasu', emoji: '🍆', word: 'なす', category: 'yasai' },
  { id: 'toumorokoshi', emoji: '🌽', word: 'とうもろこし', category: 'yasai' },
  { id: 'piiman', emoji: '🫑', word: 'ぴーまん', category: 'yasai' },
  { id: 'kyuuri', emoji: '🥒', word: 'きゅうり', category: 'yasai' },
  { id: 'jagaimo', emoji: '🥔', word: 'じゃがいも', category: 'yasai' },
  { id: 'satsumaimo', emoji: '🍠', word: 'さつまいも', category: 'yasai' },
  { id: 'tamanegi', emoji: '🧅', word: 'たまねぎ', category: 'yasai' },
  { id: 'burokkorii', emoji: '🥦', word: 'ぶろっこりー', category: 'yasai' },

  // くだもの（10）
  { id: 'banana', emoji: '🍌', word: 'ばなな', category: 'kudamono' },
  { id: 'ringo', emoji: '🍎', word: 'りんご', category: 'kudamono' },
  { id: 'ichigo', emoji: '🍓', word: 'いちご', category: 'kudamono' },
  { id: 'budou', emoji: '🍇', word: 'ぶどう', category: 'kudamono' },
  { id: 'mikan', emoji: '🍊', word: 'みかん', category: 'kudamono' },
  { id: 'suika', emoji: '🍉', word: 'すいか', category: 'kudamono' },
  { id: 'momo', emoji: '🍑', word: 'もも', category: 'kudamono' },
  { id: 'sakuranbo', emoji: '🍒', word: 'さくらんぼ', category: 'kudamono' },
  { id: 'meron', emoji: '🍈', word: 'めろん', category: 'kudamono' },
  { id: 'painappuru', emoji: '🍍', word: 'ぱいなっぷる', category: 'kudamono' },

  // どうぶつ（10）
  { id: 'inu', emoji: '🐶', word: 'いぬ', category: 'doubutsu' },
  { id: 'neko', emoji: '🐱', word: 'ねこ', category: 'doubutsu' },
  { id: 'usagi', emoji: '🐰', word: 'うさぎ', category: 'doubutsu' },
  { id: 'zou', emoji: '🐘', word: 'ぞう', category: 'doubutsu' },
  { id: 'raion', emoji: '🦁', word: 'らいおん', category: 'doubutsu' },
  { id: 'kirin', emoji: '🦒', word: 'きりん', category: 'doubutsu' },
  { id: 'panda', emoji: '🐼', word: 'ぱんだ', category: 'doubutsu' },
  { id: 'saru', emoji: '🐵', word: 'さる', category: 'doubutsu' },
  { id: 'kuma', emoji: '🐻', word: 'くま', category: 'doubutsu' },
  { id: 'buta', emoji: '🐷', word: 'ぶた', category: 'doubutsu' },

  // のりもの（10）
  { id: 'kuruma', emoji: '🚗', word: 'くるま', category: 'norimono' },
  { id: 'basu', emoji: '🚌', word: 'ばす', category: 'norimono' },
  { id: 'densha', emoji: '🚃', word: 'でんしゃ', category: 'norimono' },
  { id: 'hikouki', emoji: '✈️', word: 'ひこうき', category: 'norimono' },
  { id: 'fune', emoji: '🚢', word: 'ふね', category: 'norimono' },
  { id: 'shoubousha', emoji: '🚒', word: 'しょうぼうしゃ', category: 'norimono' },
  { id: 'kyuukyuusha', emoji: '🚑', word: 'きゅうきゅうしゃ', category: 'norimono' },
  { id: 'jitensha', emoji: '🚲', word: 'じてんしゃ', category: 'norimono' },
  { id: 'herikoputaa', emoji: '🚁', word: 'へりこぷたー', category: 'norimono' },
  { id: 'roketto', emoji: '🚀', word: 'ろけっと', category: 'norimono' },
];

// カテゴリ id → その語リスト（quiz が使う）。
export function wordsByCategory(id: CategoryId): WordItem[] {
  return WORDS.filter((w) => w.category === id);
}