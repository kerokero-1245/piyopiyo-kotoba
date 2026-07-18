// 同梱音声クリップの登録表（tier1 の素材）。
// VOICEVOX ENGINE（ずんだもん・あまあま）で事前生成した m4a を assets/voice/ に同梱し、ここで登録する。
// クレジット表記: VOICEVOX:ずんだもん（VOICEVOX 利用規約）。生成手順は assets/voice/README.md 参照。
//
// key = クリップ基名（voice.ts の spec ビルダーと一致）。
//   単語:   単語の id（words.ts）。例 'banana'（🍌 ばなな）
//   出題文: 'ask_' + 単語id。例 'ask_banana'（「ばなな は どれ？」）
//   定型句: 'p_seikai'（せいかい！）
// value = 再生可能な URL（require の戻り値）。
//
// 登録した基名は clips.ts が tier1 として最優先で再生する（呼び出し側の変更は不要）。
// 外部送信ゼロ: クリップは端末内の同梱アセット。ネットワークは使わない。

// key = クリップ基名, value = 再生可能な URL（require の戻り値）。
export const CLIP_URLS: Record<string, string> = {
  // ── 単語（words.ts の並び）──
  ninjin: require('../../assets/voice/ninjin.m4a'),
  tomato: require('../../assets/voice/tomato.m4a'),
  nasu: require('../../assets/voice/nasu.m4a'),
  toumorokoshi: require('../../assets/voice/toumorokoshi.m4a'),
  piiman: require('../../assets/voice/piiman.m4a'),
  kyuuri: require('../../assets/voice/kyuuri.m4a'),
  jagaimo: require('../../assets/voice/jagaimo.m4a'),
  satsumaimo: require('../../assets/voice/satsumaimo.m4a'),
  tamanegi: require('../../assets/voice/tamanegi.m4a'),
  burokkorii: require('../../assets/voice/burokkorii.m4a'),
  banana: require('../../assets/voice/banana.m4a'),
  ringo: require('../../assets/voice/ringo.m4a'),
  ichigo: require('../../assets/voice/ichigo.m4a'),
  budou: require('../../assets/voice/budou.m4a'),
  mikan: require('../../assets/voice/mikan.m4a'),
  suika: require('../../assets/voice/suika.m4a'),
  momo: require('../../assets/voice/momo.m4a'),
  sakuranbo: require('../../assets/voice/sakuranbo.m4a'),
  meron: require('../../assets/voice/meron.m4a'),
  painappuru: require('../../assets/voice/painappuru.m4a'),
  inu: require('../../assets/voice/inu.m4a'),
  neko: require('../../assets/voice/neko.m4a'),
  usagi: require('../../assets/voice/usagi.m4a'),
  zou: require('../../assets/voice/zou.m4a'),
  raion: require('../../assets/voice/raion.m4a'),
  kirin: require('../../assets/voice/kirin.m4a'),
  panda: require('../../assets/voice/panda.m4a'),
  saru: require('../../assets/voice/saru.m4a'),
  kuma: require('../../assets/voice/kuma.m4a'),
  buta: require('../../assets/voice/buta.m4a'),
  kuruma: require('../../assets/voice/kuruma.m4a'),
  basu: require('../../assets/voice/basu.m4a'),
  densha: require('../../assets/voice/densha.m4a'),
  hikouki: require('../../assets/voice/hikouki.m4a'),
  fune: require('../../assets/voice/fune.m4a'),
  shoubousha: require('../../assets/voice/shoubousha.m4a'),
  kyuukyuusha: require('../../assets/voice/kyuukyuusha.m4a'),
  jitensha: require('../../assets/voice/jitensha.m4a'),
  herikoputaa: require('../../assets/voice/herikoputaa.m4a'),
  roketto: require('../../assets/voice/roketto.m4a'),

  // ── 出題文（ask_ + 単語id）──
  ask_ninjin: require('../../assets/voice/ask_ninjin.m4a'),
  ask_tomato: require('../../assets/voice/ask_tomato.m4a'),
  ask_nasu: require('../../assets/voice/ask_nasu.m4a'),
  ask_toumorokoshi: require('../../assets/voice/ask_toumorokoshi.m4a'),
  ask_piiman: require('../../assets/voice/ask_piiman.m4a'),
  ask_kyuuri: require('../../assets/voice/ask_kyuuri.m4a'),
  ask_jagaimo: require('../../assets/voice/ask_jagaimo.m4a'),
  ask_satsumaimo: require('../../assets/voice/ask_satsumaimo.m4a'),
  ask_tamanegi: require('../../assets/voice/ask_tamanegi.m4a'),
  ask_burokkorii: require('../../assets/voice/ask_burokkorii.m4a'),
  ask_banana: require('../../assets/voice/ask_banana.m4a'),
  ask_ringo: require('../../assets/voice/ask_ringo.m4a'),
  ask_ichigo: require('../../assets/voice/ask_ichigo.m4a'),
  ask_budou: require('../../assets/voice/ask_budou.m4a'),
  ask_mikan: require('../../assets/voice/ask_mikan.m4a'),
  ask_suika: require('../../assets/voice/ask_suika.m4a'),
  ask_momo: require('../../assets/voice/ask_momo.m4a'),
  ask_sakuranbo: require('../../assets/voice/ask_sakuranbo.m4a'),
  ask_meron: require('../../assets/voice/ask_meron.m4a'),
  ask_painappuru: require('../../assets/voice/ask_painappuru.m4a'),
  ask_inu: require('../../assets/voice/ask_inu.m4a'),
  ask_neko: require('../../assets/voice/ask_neko.m4a'),
  ask_usagi: require('../../assets/voice/ask_usagi.m4a'),
  ask_zou: require('../../assets/voice/ask_zou.m4a'),
  ask_raion: require('../../assets/voice/ask_raion.m4a'),
  ask_kirin: require('../../assets/voice/ask_kirin.m4a'),
  ask_panda: require('../../assets/voice/ask_panda.m4a'),
  ask_saru: require('../../assets/voice/ask_saru.m4a'),
  ask_kuma: require('../../assets/voice/ask_kuma.m4a'),
  ask_buta: require('../../assets/voice/ask_buta.m4a'),
  ask_kuruma: require('../../assets/voice/ask_kuruma.m4a'),
  ask_basu: require('../../assets/voice/ask_basu.m4a'),
  ask_densha: require('../../assets/voice/ask_densha.m4a'),
  ask_hikouki: require('../../assets/voice/ask_hikouki.m4a'),
  ask_fune: require('../../assets/voice/ask_fune.m4a'),
  ask_shoubousha: require('../../assets/voice/ask_shoubousha.m4a'),
  ask_kyuukyuusha: require('../../assets/voice/ask_kyuukyuusha.m4a'),
  ask_jitensha: require('../../assets/voice/ask_jitensha.m4a'),
  ask_herikoputaa: require('../../assets/voice/ask_herikoputaa.m4a'),
  ask_roketto: require('../../assets/voice/ask_roketto.m4a'),

  // ── 定型句 ──
  p_seikai: require('../../assets/voice/p_seikai.m4a'),
  // タイトル読み（t_kotoba「ぴよぴよことば」）。基名は PHRASE_VOICE.title に一致。
  p_title: require('../../assets/voice/p_title.m4a'),
  // 誤答タップのやさしい声かけ（否定語なし・WORLD 正典）。e_arere「あれれ？」/ e_oshii「おしい！」。
  p_arere: require('../../assets/voice/p_arere.m4a'),
  p_oshii: require('../../assets/voice/p_oshii.m4a'),
};

// 指定した基名のクリップが登録済みか。
export function hasClip(name: string | undefined): boolean {
  if (!name) return false;
  return Object.prototype.hasOwnProperty.call(CLIP_URLS, name) && !!CLIP_URLS[name];
}
