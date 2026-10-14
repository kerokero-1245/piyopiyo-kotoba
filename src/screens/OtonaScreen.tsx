// おとなモード（親ゲートの奥・DESIGN §7）。
//   ・カテゴリ: やさい🥕 / くだもの🍓 / どうぶつ🐰 / のりもの🚗 を1つずつオン/オフ（最低1つは残す）
//   ・よみあげ: する / しない
//   ・あつめた ほし: ⭐×N ＋「0に もどす」（2段階確認）
// 変更は次のもんだいから反映される（PlayScreen がマウント時に設定を読む）。
// 項目が増えても背の低い画面で「もどる」が隠れないよう、内容は ScrollView に入れる（DESIGN §8）。
// 選択肢の文字は枠の幅から大きさを決め、✓ は文字の横ではなく右上に重ねて、狭い画面でも1行に収める
// （ぴよぴよさんすうと同じ直し方）。
// 「0に もどす」は ことばの中の表示だけを 0 にする。街へ渡す累計 kotoba.totalStars は残す（settings.ts）。

import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BigButton } from "@kerokero-1245/piyo-assets/ui";
import { colors, font, radius, space } from "../theme";
import {
  ALL_CATEGORIES,
  getBgmOn,
  getCategories,
  getMoji,
  getShownStars,
  getTtsOn,
  resetShownStars,
  setMoji,
  setTtsOn,
  toggleCategory,
} from "../settings";
import { CATEGORY_LABELS } from "../game/words";
import { CategoryId, MojiMode } from "../types";
import { playSound } from "../audio/sounds";
import { setKotobaBgmOn } from "../audio/bgm";

// もじ 3択トグルの並び（ラベルは各モードの文字体系で自己説明的にする）。
const MOJI_OPTIONS: { id: MojiMode; label: string }[] = [
  { id: "hiragana", label: "ひらがな" },
  { id: "katakana", label: "カタカナ" },
  { id: "mazegaki", label: "まぜがき" },
];

interface Props {
  onBack: () => void;
}

const CARD_PAD = space.md; // カードの内側の余白
const OPTION_GAP = space.sm; // 選択肢どうしの間
const OPTION_PAD = 4; // 選択肢の内側の左右の余白
const OPTION_BORDER = 3;
const CAT_EMOJI_W = 38; // カテゴリの絵文字（30px）の幅＋ゆとり

// 選択肢の内側の幅（列数 n）。枠（最大幅 480・左右 space.md）→ カード（枠線1・余白 CARD_PAD）→
// 選択肢（枠線3・余白 OPTION_PAD）の順に引く。
function optionInnerW(windowW: number, n: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  const cardInner = frameW - CARD_PAD * 2 - 2;
  return (
    (cardInner - OPTION_GAP * (n - 1)) / n - OPTION_BORDER * 2 - OPTION_PAD * 2
  );
}

// 2つ並びの選択肢（する/しない・ながす/ながさない）の文字の大きさ。最長の「ながさない」（5字）が1行に収まる大きさ。
function optionFontSize(windowW: number): number {
  return Math.min(font.big, Math.floor(optionInnerW(windowW, 2) / 5.2));
}

// カテゴリ（絵文字＋4字まで）の文字の大きさ。n 列の内側から絵文字と間（space.xs）を引いた幅に「くだもの」等の4字を収める。
function catFontSizeFor(windowW: number, n: number): number {
  return Math.min(
    font.body,
    Math.floor((optionInnerW(windowW, n) - CAT_EMOJI_W - space.xs) / 4.2),
  );
}

// カテゴリの並び。2つ並び（2×2）で文字が CAT_MIN_FONT 以上になる幅ならそのまま、ならない狭い画面（320 幅など）は
// 1列に並べて文字を小さくしない（従来は 320 幅で 13px まで縮んでいた）。360 幅以上は従来どおり 2×2。
const CAT_MIN_FONT = 16;
function catLayout(windowW: number): { cols: 1 | 2; fontSize: number } {
  const two = catFontSizeFor(windowW, 2);
  if (two >= CAT_MIN_FONT) return { cols: 2, fontSize: two };
  return { cols: 1, fontSize: catFontSizeFor(windowW, 1) };
}

// もじ 3択（ひらがな/カタカナ/まぜがき＝どれも4字）の文字の大きさ。3つ並びの選択肢（枠線3・左右の余白なし）の内側に
// 4字が1行で収まる大きさ。1字 = 1em で見積もる（保守的。題字と同じ考え方）。上限は従来の 18。
// 390・360 幅では従来どおり 18、320 幅で 16（従来は 18 のまま「ひら…」と省略されていた）。
const MOJI_FONT = 18;
const MOJI_CHARS = 4;
const MOJI_GAP = space.sm;
function mojiFontSize(windowW: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  const cardInner = frameW - CARD_PAD * 2 - 2;
  const inner = (cardInner - MOJI_GAP * 2) / 3 - OPTION_BORDER * 2;
  return Math.min(MOJI_FONT, Math.floor(inner / MOJI_CHARS));
}

export default function OtonaScreen({ onBack }: Props) {
  const { width: windowW } = useWindowDimensions();
  const optionFont = { fontSize: optionFontSize(windowW) };
  const cat = catLayout(windowW);
  const catFont = { fontSize: cat.fontSize };
  const catWidth = cat.cols === 1 ? styles.catOneCol : null;
  const mojiFont = { fontSize: mojiFontSize(windowW) };
  const [cats, setCats] = useState<CategoryId[]>(getCategories());
  const [moji, setMojiState] = useState<MojiMode>(getMoji());
  const [tts, setTts] = useState<boolean>(getTtsOn());
  const [bgm, setBgm] = useState<boolean>(getBgmOn());
  const [stars, setStars] = useState<number>(getShownStars());
  const [confirmReset, setConfirmReset] = useState(false); // 誤操作防止の2段階確認

  const onToggleCat = (id: CategoryId) => {
    playSound("tap");
    setCats(toggleCategory(id));
  };

  // もじ表示の切替（ひらがな/カタカナ/まぜがき）。次のもんだいから反映（PlayScreen がマウント時に読む）。
  const onSetMoji = (mode: MojiMode) => {
    playSound("tap");
    setMoji(mode); // 保存（kotoba.moji）
    setMojiState(mode);
  };

  const onToggleTts = (on: boolean) => {
    playSound("tap");
    setTtsOn(on);
    setTts(on);
  };

  // BGM ながす/ながさない。タップ（ジェスチャ起点）なので ON で即再開できる。
  const onToggleBgm = (on: boolean) => {
    playSound("tap");
    setKotobaBgmOn(on); // 保存（kotoba.bgm）＋エンジン ON/OFF（OFFは即フェード停止・ONは即再開）
    setBgm(on);
  };

  const onResetPress = () => {
    playSound("tap");
    if (!confirmReset) {
      setConfirmReset(true); // 1回目は確認へ
      return;
    }
    resetShownStars(); // 表示だけ 0 に。街へ渡す累計（kotoba.totalStars）は残す
    setStars(0);
    setConfirmReset(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>おとなモード</Text>

        {/* カテゴリ オン/オフ（最低1つは残す） */}
        <View style={styles.card}>
          <Text style={styles.label}>だす ことば</Text>
          <View style={styles.catGrid}>
            {ALL_CATEGORIES.map((id) => {
              const active = cats.includes(id);
              const lastOne = active && cats.length === 1;
              const meta = CATEGORY_LABELS[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => onToggleCat(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  disabled={lastOne}
                  style={[
                    styles.cat,
                    catWidth,
                    active ? styles.catActive : styles.catIdle,
                    lastOne && styles.catLocked,
                  ]}
                >
                  <Text style={styles.catEmoji}>{meta.emoji}</Text>
                  <Text
                    style={[
                      styles.catText,
                      catFont,
                      active && styles.catTextActive,
                    ]}
                  >
                    {meta.label}
                  </Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>
            オンにした なかまだけ でます。すくなくとも 1つは
            のこります。つぎのもんだいから かわります。
          </Text>
        </View>

        {/* もじ ひらがな/カタカナ/まぜがき（表示ラベルだけ・読み上げ/絵/ベルトは不変） */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>もじ</Text>
          <View style={styles.mojiOptions}>
            {MOJI_OPTIONS.map((o) => {
              const active = moji === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => onSetMoji(o.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.mojiOption,
                    active ? styles.optionActive : styles.optionIdle,
                  ]}
                  testID={`moji-${o.id}`}
                >
                  <Text
                    style={[
                      styles.mojiOptionText,
                      mojiFont,
                      active && styles.optionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {o.label}
                  </Text>
                  {active ? <Text style={styles.mojiCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>
            みために だけ かわります。よみあげの こえは そのまま。「まぜがき」は
            バナナ・パンダ など いつも カタカナで かく ことばだけ カタカナに
            します。つぎのもんだいから かわります。
          </Text>
        </View>

        {/* 読み上げ する/しない */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>よみあげ</Text>
          <View style={styles.options}>
            <Pressable
              onPress={() => onToggleTts(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: tts }}
              style={[
                styles.option,
                tts ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  tts && styles.optionTextActive,
                ]}
              >
                する
              </Text>
              {tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleTts(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !tts }}
              style={[
                styles.option,
                !tts ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  !tts && styles.optionTextActive,
                ]}
              >
                しない
              </Text>
              {!tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            「する」だと ことばを こえで よみます。おとが つかえない ときも
            あそべます。
          </Text>
        </View>

        {/* BGM ながす/ながさない（オルゴール風の背景曲・控えめ音量）。よみあげとは別設定。 */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>BGM</Text>
          <View style={styles.options}>
            <Pressable
              onPress={() => onToggleBgm(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: bgm }}
              style={[
                styles.option,
                bgm ? styles.optionActive : styles.optionIdle,
              ]}
              testID="bgm-on"
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  bgm && styles.optionTextActive,
                ]}
              >
                ながす
              </Text>
              {bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleBgm(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !bgm }}
              style={[
                styles.option,
                !bgm ? styles.optionActive : styles.optionIdle,
              ]}
              testID="bgm-off"
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  !bgm && styles.optionTextActive,
                ]}
              >
                ながさない
              </Text>
              {!bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            やさしい オルゴールの きょくが ながれます。こえの あいだは そっと
            ちいさくなります。
          </Text>
        </View>

        {/* あつめた ほし（累計スタンプ）。リセットはここだけ・2段階確認。 */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>あつめた ほし</Text>
          <Text style={styles.starTotal}>⭐ × {stars}</Text>
          <View style={styles.resetRow}>
            {confirmReset ? (
              <Pressable
                onPress={() => {
                  playSound("tap");
                  setConfirmReset(false);
                }}
                accessibilityRole="button"
                style={[
                  styles.resetBtn,
                  styles.resetBtnGrow,
                  styles.resetCancel,
                ]}
              >
                <Text style={styles.resetCancelText}>やめる</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onResetPress}
              accessibilityRole="button"
              disabled={stars === 0 && !confirmReset}
              style={[
                styles.resetBtn,
                confirmReset
                  ? [styles.resetBtnGrow, styles.resetConfirm]
                  : styles.resetIdle,
                stars === 0 && !confirmReset ? styles.resetDisabled : null,
              ]}
            >
              <Text
                style={
                  confirmReset ? styles.resetConfirmText : styles.resetIdleText
                }
              >
                {confirmReset ? "ほんとうに 0に する" : "0に もどす"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            あつめた ほし は へりません。ここでだけ 0に もどせます。0に
            しても、まち（ぴよぴよランド）の ⭐ は へりません。
          </Text>
        </View>

        {/* 音声クレジット（VOICEVOX 利用規約）。同梱の読み上げクリップの出所を小さく明記する。 */}
        <Text style={styles.credit}>よみあげのこえ: VOICEVOX:ずんだもん</Text>
      </ScrollView>

      {/* 「もどる」はスクロールの外に固定し、背の低い画面でも常に押せるようにする（DESIGN §8）。 */}
      <View style={styles.backWrap}>
        <BigButton
          emoji="◀️"
          label="もどる"
          onPress={onBack}
          color={colors.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  backWrap: {
    marginTop: space.md,
  },
  title: {
    fontSize: font.title,
    fontWeight: "800",
    color: colors.text,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: CARD_PAD,
    borderWidth: 1,
    borderColor: colors.beltBorder,
  },
  cardGap: {
    marginTop: space.md,
  },
  label: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.text,
    marginBottom: space.md,
  },
  // カテゴリは2×2グリッド（狭い画面では1列＝catOneCol）
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: OPTION_GAP,
    rowGap: OPTION_GAP,
  },
  cat: {
    width: "46%",
    flexGrow: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: OPTION_BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: space.xs,
    paddingHorizontal: OPTION_PAD,
  },
  catOneCol: {
    width: "100%",
  },
  catIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  catActive: {
    backgroundColor: colors.play,
    borderColor: colors.playPressed,
  },
  catLocked: {
    opacity: 0.9, // 最後の1つ（消せない）
  },
  catEmoji: {
    fontSize: 30,
  },
  catText: {
    fontWeight: "900",
    color: colors.text,
  },
  catTextActive: {
    color: colors.white,
  },
  // もじは3択なので幅がきつい。列を詰め、各ボタンは縦積み（ラベル＋✓）で狭くても収める。
  mojiOptions: {
    flexDirection: "row",
    columnGap: MOJI_GAP,
  },
  mojiOption: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: OPTION_BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    rowGap: space.xs,
    // 左右の余白は取らない（4字ぶんの幅を文字に回す。文字は中央そろえなので見た目の余白は残る）。
    paddingHorizontal: 0,
  },
  mojiOptionText: {
    // 3択で幅がきついので font.body(20) より一段小さく。枠の幅から mojiFontSize で決め、狭い画面でも
    // 4文字（ひらがな/カタカナ/まぜがき）を省略せず表示する。
    fontSize: MOJI_FONT,
    fontWeight: "900",
    color: colors.text,
  },
  mojiCheck: {
    fontSize: font.small,
    color: colors.white,
    fontWeight: "900",
  },
  options: {
    flexDirection: "row",
    columnGap: OPTION_GAP,
  },
  option: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: OPTION_BORDER,
    paddingHorizontal: OPTION_PAD,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  optionActive: {
    backgroundColor: colors.play,
    borderColor: colors.playPressed,
  },
  optionText: {
    fontWeight: "900",
    color: colors.text,
  },
  optionTextActive: {
    color: colors.white,
  },
  check: {
    // 選択中の印。文字の横に並べると狭い画面で文字が折り返すので、右上に重ねる。
    position: "absolute",
    top: 2,
    right: 8,
    fontSize: font.small,
    color: colors.white,
    fontWeight: "900",
  },
  note: {
    fontSize: font.small,
    color: colors.subtext,
    marginTop: space.md,
    lineHeight: 24,
  },
  credit: {
    fontSize: font.small,
    color: colors.subtext,
    textAlign: "center",
    marginTop: space.lg,
  },
  starTotal: {
    fontSize: font.huge,
    fontWeight: "900",
    color: colors.text,
  },
  resetRow: {
    // 確認中は「やめる」「ほんとうに 0に する」が横に入りきらない幅で2段に折り返す（はみ出さない）。
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space.sm,
    rowGap: space.sm,
    marginTop: space.md,
  },
  resetBtnGrow: {
    flexGrow: 1,
  },
  resetBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  resetIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  resetIdleText: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.subtext,
  },
  resetConfirm: {
    backgroundColor: colors.button,
    borderColor: colors.buttonPressed,
  },
  resetConfirmText: {
    fontSize: font.body,
    fontWeight: "900",
    color: colors.white,
  },
  resetCancel: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  resetCancelText: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.text,
  },
  resetDisabled: {
    opacity: 0.4,
  },
});
