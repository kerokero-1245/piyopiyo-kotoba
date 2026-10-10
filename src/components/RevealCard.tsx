// 正解演出のリビールカード（DESIGN §8）。正しいものをタップした瞬間に、その絵を中央に
// 大きく「ぽんっ」と出す（spring）＋「◯◯！」。座標計算を避け、どのビューポートでも中央に確実に
// 大きく見せる。読み上げ・紙吹雪・⭐は PlayScreen 側で同時に鳴らす（ここは見た目だけ）。
// 「◯◯！」は必ず1行で見せる。44 のまま収まる語は従来どおり（左右の余白 space.xl）。収まらない長い語
// （きゅうきゅうしゃ・とうもろこし 等）だけ、左右の余白を space.md に詰め、それでも足りなければ枠の幅と
// 文字数から文字を小さくする（従来は 44 のまま2行に折り返していた）。
// 暗幕は画面全体に敷く（がんばりカードの ClearOverlay と同じ BACKDROP_FULL）。

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { colors, font, radius, space } from "../theme";
import { WordItem } from "../types";

const CARD_PAD_WIDE = space.xl; // 従来のカードの左右の余白（44 で収まる語はこのまま）
const CARD_PAD_NARROW = space.md; // 長い語だけ、文字を大きく保つために詰める
const CARD_BORDER = 5;
const CARD_MIN_W = 152 + CARD_PAD_WIDE * 2 + CARD_BORDER * 2; // カードの最小幅は従来と同じ（絵 152＋余白 40×2＋枠 5×2）

// 暗幕は画面全体に敷く。このカードは最大幅 480 の枠（App.tsx の frame）の内側に置かれるので、
// absolute のままだと広い画面では枠の中だけが暗くなる。web では position: fixed でビューポート全体を覆う
// （ClearOverlay と同じ。react-native-web は fixed をそのまま CSS に渡す。RN の型には無いので型だけ合わせる）。
const BACKDROP_FULL: ViewStyle | null =
  Platform.OS === "web"
    ? ({ position: "fixed" } as unknown as ViewStyle)
    : null;

// 「◯◯！」を1行に収める文字の大きさ（左右の余白 padH のとき）。枠（最大幅 480・左右 space.md）→ カード（枠線・
// 左右の余白）の内側の幅を、文字数（ひらがな・カタカナ・ー・！はどれも全角1字ぶん）で割って決める。上限は従来の font.huge（44）。
function wordFontSize(text: string, windowW: number, padH: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  const avail = frameW - padH * 2 - CARD_BORDER * 2;
  let cols = 0;
  for (const ch of text) cols += ch === " " ? 0.5 : 1;
  if (cols <= 0) return font.huge;
  // 太字(900)の字送りぶんの安全係数（出題バーの computeAskFontSize と同じ考え方）。
  return Math.max(16, Math.min(font.huge, Math.floor((avail * 0.96) / cols)));
}

// 余白と文字の大きさを決める。従来の余白（space.xl）で 44 のまま収まる語は従来と同じカード（幅も同じ）、
// 収まらない語だけ余白を詰めて大きさを決め直す。
function wordLayout(
  text: string,
  windowW: number,
): { padH: number; fontSize: number } {
  const wide = wordFontSize(text, windowW, CARD_PAD_WIDE);
  if (wide >= font.huge) return { padH: CARD_PAD_WIDE, fontSize: wide };
  return {
    padH: CARD_PAD_NARROW,
    fontSize: wordFontSize(text, windowW, CARD_PAD_NARROW),
  };
}

// label = 表示用ラベル（もじ設定で ひらがな/カタカナ/まぜがき に変換済み）。
// 省略時は word（ひらがな）を表示。読み上げ・SVG・同一性は item.word のままで、見た目だけを差し替える。
export default function RevealCard({
  item,
  label,
}: {
  item: WordItem;
  label?: string;
}) {
  const shown = label ?? item.word;
  const { width: windowW } = useWindowDimensions();
  const wordText = `${shown}！`;
  const layout = wordLayout(wordText, windowW);
  const cardPad = { paddingHorizontal: layout.padH };
  const wordFont = { fontSize: layout.fontSize };
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={styles.root} pointerEvents="none" testID="reveal">
      <View style={[styles.backdrop, BACKDROP_FULL]} />
      <Animated.View
        style={[styles.card, cardPad, { opacity, transform: [{ scale }] }]}
      >
        <Image
          source={item.svg}
          resizeMode="contain"
          accessibilityLabel={item.word}
          style={styles.emoji}
        />
        <Text style={[styles.word, wordFont]}>{wordText}</Text>
      </Animated.View>
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
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: CARD_PAD_WIDE,
    minWidth: CARD_MIN_W,
    borderWidth: CARD_BORDER,
    borderColor: colors.white,
    shadowColor: "#00000066",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  emoji: {
    width: 152,
    height: 152,
  },
  word: {
    fontSize: font.huge,
    fontWeight: "900",
    color: colors.text,
    marginTop: space.sm,
    textAlign: "center",
  },
});
