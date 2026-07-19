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
  { id: 'ninjin', emoji: '🥕', word: 'にんじん', svg: require('../../assets/svg/ninjin.svg'), category: 'yasai' },
  { id: 'tomato', emoji: '🍅', word: 'とまと', svg: require('../../assets/svg/tomato.svg'), category: 'yasai' },
  { id: 'nasu', emoji: '🍆', word: 'なす', svg: require('../../assets/svg/nasu.svg'), category: 'yasai' },
  { id: 'toumorokoshi', emoji: '🌽', word: 'とうもろこし', svg: require('../../assets/svg/toumorokoshi.svg'), category: 'yasai' },
  { id: 'piiman', emoji: '🫑', word: 'ぴーまん', svg: require('../../assets/svg/piiman.svg'), category: 'yasai' },
  { id: 'kyuuri', emoji: '🥒', word: 'きゅうり', svg: require('../../assets/svg/kyuuri.svg'), category: 'yasai' },
  { id: 'jagaimo', emoji: '🥔', word: 'じゃがいも', svg: require('../../assets/svg/jagaimo.svg'), category: 'yasai' },
  { id: 'satsumaimo', emoji: '🍠', word: 'さつまいも', svg: require('../../assets/svg/satsumaimo.svg'), category: 'yasai' },
  { id: 'tamanegi', emoji: '🧅', word: 'たまねぎ', svg: require('../../assets/svg/tamanegi.svg'), category: 'yasai' },
  { id: 'burokkorii', emoji: '🥦', word: 'ぶろっこりー', svg: require('../../assets/svg/burokkorii.svg'), category: 'yasai' },

  // くだもの（10）
  { id: 'banana', emoji: '🍌', word: 'ばなな', svg: require('../../assets/svg/banana.svg'), category: 'kudamono' },
  { id: 'ringo', emoji: '🍎', word: 'りんご', svg: require('../../assets/svg/ringo.svg'), category: 'kudamono' },
  { id: 'ichigo', emoji: '🍓', word: 'いちご', svg: require('../../assets/svg/ichigo.svg'), category: 'kudamono' },
  { id: 'budou', emoji: '🍇', word: 'ぶどう', svg: require('../../assets/svg/budou.svg'), category: 'kudamono' },
  { id: 'mikan', emoji: '🍊', word: 'みかん', svg: require('../../assets/svg/mikan.svg'), category: 'kudamono' },
  { id: 'suika', emoji: '🍉', word: 'すいか', svg: require('../../assets/svg/suika.svg'), category: 'kudamono' },
  { id: 'momo', emoji: '🍑', word: 'もも', svg: require('../../assets/svg/momo.svg'), category: 'kudamono' },
  { id: 'sakuranbo', emoji: '🍒', word: 'さくらんぼ', svg: require('../../assets/svg/sakuranbo.svg'), category: 'kudamono' },
  { id: 'meron', emoji: '🍈', word: 'めろん', svg: require('../../assets/svg/meron.svg'), category: 'kudamono' },
  { id: 'painappuru', emoji: '🍍', word: 'ぱいなっぷる', svg: require('../../assets/svg/painappuru.svg'), category: 'kudamono' },

  // どうぶつ（10）
  { id: 'inu', emoji: '🐶', word: 'いぬ', svg: require('../../assets/svg/inu.svg'), category: 'doubutsu' },
  { id: 'neko', emoji: '🐱', word: 'ねこ', svg: require('../../assets/svg/neko.svg'), category: 'doubutsu' },
  { id: 'usagi', emoji: '🐰', word: 'うさぎ', svg: require('../../assets/svg/usagi.svg'), category: 'doubutsu' },
  { id: 'zou', emoji: '🐘', word: 'ぞう', svg: require('../../assets/svg/zou.svg'), category: 'doubutsu' },
  { id: 'raion', emoji: '🦁', word: 'らいおん', svg: require('../../assets/svg/raion.svg'), category: 'doubutsu' },
  { id: 'kirin', emoji: '🦒', word: 'きりん', svg: require('../../assets/svg/kirin.svg'), category: 'doubutsu' },
  { id: 'panda', emoji: '🐼', word: 'ぱんだ', svg: require('../../assets/svg/panda.svg'), category: 'doubutsu' },
  { id: 'saru', emoji: '🐵', word: 'さる', svg: require('../../assets/svg/saru.svg'), category: 'doubutsu' },
  { id: 'kuma', emoji: '🐻', word: 'くま', svg: require('../../assets/svg/kuma.svg'), category: 'doubutsu' },
  { id: 'buta', emoji: '🐷', word: 'ぶた', svg: require('../../assets/svg/buta.svg'), category: 'doubutsu' },

  // のりもの（10）
  { id: 'kuruma', emoji: '🚗', word: 'くるま', svg: require('../../assets/svg/kuruma.svg'), category: 'norimono' },
  { id: 'basu', emoji: '🚌', word: 'ばす', svg: require('../../assets/svg/basu.svg'), category: 'norimono' },
  { id: 'densha', emoji: '🚃', word: 'でんしゃ', svg: require('../../assets/svg/densha.svg'), category: 'norimono' },
  { id: 'hikouki', emoji: '✈️', word: 'ひこうき', svg: require('../../assets/svg/hikouki.svg'), category: 'norimono' },
  { id: 'fune', emoji: '🚢', word: 'ふね', svg: require('../../assets/svg/fune.svg'), category: 'norimono' },
  { id: 'shoubousha', emoji: '🚒', word: 'しょうぼうしゃ', svg: require('../../assets/svg/shoubousha.svg'), category: 'norimono' },
  { id: 'kyuukyuusha', emoji: '🚑', word: 'きゅうきゅうしゃ', svg: require('../../assets/svg/kyuukyuusha.svg'), category: 'norimono' },
  { id: 'jitensha', emoji: '🚲', word: 'じてんしゃ', svg: require('../../assets/svg/jitensha.svg'), category: 'norimono' },
  { id: 'herikoputaa', emoji: '🚁', word: 'へりこぷたー', svg: require('../../assets/svg/herikoputaa.svg'), category: 'norimono' },
  { id: 'roketto', emoji: '🚀', word: 'ろけっと', svg: require('../../assets/svg/roketto.svg'), category: 'norimono' },
];

// カテゴリ id → その語リスト（quiz が使う）。
export function wordsByCategory(id: CategoryId): WordItem[] {
  return WORDS.filter((w) => w.category === id);
}