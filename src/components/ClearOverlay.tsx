// 1セット（5問）ぜんぶ終わったときの「きょうの がんばりカード」（DESIGN §14）。
// 集めた⭐を1つずつ順に出す（数え上げのトーン）→ 5つ揃って祝福。
// その下に「あつめた ほし ⭐×N」（累計）を控えめに表示。スコアも罰も出さない（DESIGN §5）。
// ⭐の累計は PlayScreen が1問クリアごとに settings へ加算済み。ここでは読むだけ（表示は getShownStars）。
// ぴよぴよさんすうから流用（累計は kotoba.totalStars を読む）。
//
// 中身（カード＋ボタン）はスクロールできる入れ物に入れる。背の低い画面（568x320 などの横向き）では
// 縦に積むと「おうちへ」が画面の外に出て押せなかったので、スクロールで必ず届くようにする。
// 縦持ちで高さが足りる画面では中身を枠の中央に置く（390×844・820×1180 ではボタンの位置は従来と同じ。
// 320×568 は見出しが1行になった分カードが低くなり、ボタンが 36.5px 上がる）。おつかいめいろと同じ作り
// （ぴよぴよさんすうは横向きでカードとボタンを左右に並べるが、ことばは枠が最大幅 480 のままで並べる幅が無いので
// スクロールだけにする）。

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { BigButton, Confetti } from "@kerokero-1245/piyo-assets/ui";
import { colors, font, space } from "../theme";
import { FRAME_PAD_BOTTOM, FRAME_PAD_TOP } from "../layout";
import { getShownStars } from "../settings";
import { playCountTone, playSound } from "../audio/sounds";

// 暗幕は画面全体に敷く。このオーバーレイは最大幅 480 の枠（App.tsx の frame）の内側に置かれるので、
// absolute のままだと広い画面では枠の中だけが暗くなる。web では position: fixed でビューポート全体を覆う
// （react-native-web は fixed をそのまま CSS に渡す。RN の型には無いので型だけ合わせる）。
const BACKDROP_FULL: ViewStyle | null =
  Platform.OS === "web"
    ? ({ position: "fixed" } as unknown as ViewStyle)
    : null;

// スクロールの入れ物は、枠（App.tsx の frame）の上下の余白（FRAME_PAD_TOP・FRAME_PAD_BOTTOM。src/layout.ts）まで
// 広げて画面の上端〜下端を使う。中央の位置（枠の中央＝画面の中央より (FRAME_PAD_TOP − FRAME_PAD_BOTTOM)/2 下）は
// 上下の余白の差で保つ（中身が画面に収まるときの位置は冒頭のとおり。390×844・820×1180 では従来と同じ、
// 320×568 はボタンが 36.5px 上がる）。収まらないときだけスクロールになる（おつかいめいろと同じ）。
const SCROLL_EDGE = 4; // スクロールになったときの上下の最小のすき間

// カードの⭐を1行に収める大きさ。枠（最大幅 480・左右 space.md）→ このオーバーレイ（余白 space.md）→
// カード（最大幅 380・枠線 4・余白 space.md）の内側の幅から決める。390 幅では従来どおり 44（文字 38）、
// 360 幅で 41、320 幅で 33 になる（従来は 360 幅で 4+1、320 幅で 3+2 に折り返していた）。
const STAR_SLOT = 44;
const STAR_FONT = 38;
const STAR_GAP = space.xs;
function starSlotSize(windowW: number, count: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  const cardInner = Math.min(frameW - space.md * 2, 380) - 4 * 2 - space.md * 2;
  return Math.min(
    STAR_SLOT,
    Math.floor((cardInner - STAR_GAP * (count - 1)) / count),
  );
}

// カードの見出し「きょうの がんばりカード」と「ぜんぶ できたね!」を語の途中で折らない文字の大きさ。
// 見出しはカードの左右の余白のうち TEXT_BLEED だけ食い込んで使い（中央そろえなので位置は変わらない）、
// 1字 = 1em（空白は 0.5 字）で見積もった幅に収まる大きさにする（題字と同じ考え方・保守的）。
// 360 幅以上は従来どおり 22 / 28、320 幅で 18 / 25（従来は語の途中で2行に折り返していた）。
const TITLE_FONT = 22;
const DONE_FONT = 28;
const TEXT_BLEED = space.sm;
function cardTextW(windowW: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  return (
    Math.min(frameW - space.md * 2, 380) - 4 * 2 - space.md * 2 + TEXT_BLEED * 2
  );
}
function fitFont(text: string, base: number, availW: number): number {
  let cols = 0;
  for (const ch of text) cols += ch === " " ? 0.5 : 1;
  return Math.min(base, Math.floor(availW / cols));
}
const TITLE_TEXT = "きょうの がんばりカード";
const DONE_TEXT = "ぜんぶ できたね!";

interface Props {
  starCount: number; // このセットで集めた⭐の数（=5）
  onReplay: () => void;
  onHome: () => void;
}

// カード上の⭐スロット1つ。まだ出ていないときは薄い☆、出た瞬間に⭐が「ぽんっ」と現れる。
function CardStar({ filled, size }: { filled: boolean; size: number }) {
  const pop = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const prev = useRef(filled);
  useEffect(() => {
    if (filled && !prev.current) {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        friction: 4,
        tension: 130,
        useNativeDriver: false,
      }).start();
    }
    prev.current = filled;
  }, [filled, pop]);

  // 枠の幅が足りないときだけ小さくする（44 のときは従来と同じ 44x50・文字 38）。
  const slot = { width: size, height: size + 6 };
  const glyph = {
    fontSize: Math.round((STAR_FONT * size) / STAR_SLOT),
    lineHeight: size,
  };
  if (!filled) {
    return (
      <View style={[styles.starSlot, slot]}>
        <Text style={[styles.starEmpty, glyph]}>☆</Text>
      </View>
    );
  }
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const opacity = pop.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 1, 1],
  });
  return (
    <View style={[styles.starSlot, slot]}>
      <Animated.Text
        style={[styles.starFull, glyph, { opacity, transform: [{ scale }] }]}
      >
        ⭐
      </Animated.Text>
    </View>
  );
}

export default function ClearOverlay({ starCount, onReplay, onHome }: Props) {
  // 累計は既に加算済み。マウント時に一度だけ読む（おとなモードで 0 に もどした後は、そこからの数）。
  const total = useRef(getShownStars()).current;
  const { width: windowW } = useWindowDimensions();
  const starSize = starSlotSize(windowW, starCount);
  const textW = cardTextW(windowW);
  const titleFont = { fontSize: fitFont(TITLE_TEXT, TITLE_FONT, textW) };
  const doneFont = { fontSize: fitFont(DONE_TEXT, DONE_FONT, textW) };

  const [shown, setShown] = useState(0); // いくつ⭐が現れたか（0..starCount）
  const [gathered, setGathered] = useState(false); // 5つ揃った（祝福）

  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    // カードがふわっと出る。
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    // ⭐を1つずつ順に出す（数え上げと同じトーンで音程を上げていく）→ 揃ったら祝福。
    const startDelay = 480;
    const stepMs = 460;
    for (let i = 0; i < starCount; i++) {
      later(
        () => {
          setShown(i + 1);
          playCountTone(i);
        },
        startDelay + i * stepMs,
      );
    }
    later(
      () => {
        setGathered(true);
        playSound("clear"); // 5つ揃ってファンファーレ＋紙吹雪
      },
      startDelay + starCount * stepMs + 140,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps -- timers.current は push するだけで差し替えない（常に同じ配列）。lint 導入では挙動を変えないので直さない
    return () => timers.current.forEach(clearTimeout);
    // マウント時のみ（done で1回だけ表示される）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={[styles.backdrop, BACKDROP_FULL]} pointerEvents="none" />
      {gathered ? <Confetti /> : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          <Text style={[styles.title, titleFont]}>{TITLE_TEXT}</Text>

          <View style={styles.stars}>
            {Array.from({ length: starCount }, (_, i) => (
              <CardStar key={i} filled={i < shown} size={starSize} />
            ))}
          </View>

          {/* 5つ揃ったら「できたね!」。揃うまでは高さを確保して見た目が跳ねないようにする。 */}
          <View style={styles.doneSlot}>
            {gathered ? (
              <Text style={[styles.doneText, doneFont]}>{DONE_TEXT}</Text>
            ) : null}
          </View>

          {/* 累計コレクション（控えめ・数字スコアではなく“集めた⭐の数”） */}
          <Text style={styles.total}>あつめた ほし ⭐ × {total}</Text>
        </Animated.View>

        <View style={styles.buttons}>
          <BigButton
            emoji="🔁"
            label="もういちど"
            onPress={onReplay}
            color={colors.play}
            pressedColor={colors.playPressed}
          />
          <BigButton emoji="🏠" label="おうちへ" onPress={onHome} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    position: "absolute",
    top: -FRAME_PAD_TOP,
    bottom: -FRAME_PAD_BOTTOM,
    left: 0,
    right: 0,
  },
  // 縦持ちでは従来の root と同じ中央寄せ（横の余白 space.md）。高さが足りないときはスクロールで届く。
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    paddingTop: FRAME_PAD_TOP - FRAME_PAD_BOTTOM + SCROLL_EDGE,
    paddingBottom: SCROLL_EDGE,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.lg,
    maxWidth: 380,
    width: "100%",
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: "#00000066",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: TITLE_FONT,
    fontWeight: "900",
    color: colors.text,
    marginBottom: space.sm,
    textAlign: "center",
    // カードの左右の余白に TEXT_BLEED だけ食い込む（cardTextW）。中央そろえなので位置は変わらない。
    alignSelf: "stretch",
    marginHorizontal: -TEXT_BLEED,
  },
  stars: {
    // 5つは必ず1行に並べる（大きさは starSlotSize で枠に合わせる）。
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    columnGap: STAR_GAP,
  },
  starSlot: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  starFull: {
    fontSize: 38,
    lineHeight: 44,
    textAlign: "center",
  },
  starEmpty: {
    fontSize: 38,
    lineHeight: 44,
    textAlign: "center",
    color: colors.progressOff,
  },
  doneSlot: {
    alignSelf: "stretch",
    marginHorizontal: -TEXT_BLEED,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
  },
  doneText: {
    fontSize: DONE_FONT,
    fontWeight: "900",
    color: colors.button,
  },
  total: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.subtext,
    marginTop: space.sm,
  },
  buttons: {
    width: "100%",
    maxWidth: 360,
    rowGap: space.sm,
  },
});
