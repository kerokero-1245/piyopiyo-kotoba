// タイトル画面。文字ゼロでも進める大ボタン「あそぶ」＋概念の絵（ことばの もの が並ぶ）。
// 隅の歯車を3秒長押しでおとなモードへ（4〜5歳が偶発しにくい親ゲート／DESIGN §7）。
// 「あそぶ」タップで TTS を1回アンロックする（iOS Safari 対策・DESIGN §4）。
// 左上の「まちへ もどる」（TownLink）で ぴよぴよランド（街）へ帰る。あそんでいる途中の画面には置かない。
//
// 並びは上から「まちへ もどる の行 → 題字〜あそぶ（残りの高さの中央）→ 歯車の行」。要素を重ねず流すので、
// 横向き（844x390・568x320 など）でも「まちへ もどる」が題字に、歯車が「あそぶ」に重ならない。高さが足りない
// ときは全体をスクロールして全部に届く。並びの順がそのまま Tab の順（まちへ もどる → 題字 → あそぶ → 歯車）になる。
// おつかいめいろ・ぴよぴよさんすうのタイトルと同じ作り。

import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BigButton } from "@kerokero-1245/piyo-assets/ui/BigButton";
import {
  SHOW_TOWN,
  TOWN_LINK_HEIGHT,
  TownLink,
} from "@kerokero-1245/piyo-assets/ui/TownLink";
import { useLongPress } from "@kerokero-1245/piyo-assets/ui/useLongPress";
import { colors, font, space } from "../theme";
import { playSound } from "../audio/sounds";
import { sayPhrase, warmUpVoice } from "../audio/voice";
import { initKotobaBgm } from "../audio/bgm";
import { getTtsOn } from "../settings";

interface Props {
  onPlay: () => void;
  onOtona: () => void;
}

// 題字を1行に収める文字の大きさ。題字は枠の左右の余白（space.md）まで使い、画面の端から TITLE_EDGE だけ離す。
// 1字 = 1em（7字）＋字間 2×7 で見積もる（保守的。ぴよぴよさんすうと同じ係数）。Mac のヒラギノの UI 用書体は
// かなが約 0.92em と狭いが、かなが全角（1em）の書体（Android の Noto Sans CJK JP など）でも2行に折り返さないよう、
// 狭い方には寄せない。390 幅・360 幅で 44（従来どおり）、320 幅で 41（従来は 44 のまま2行に折り返していた）。
const TITLE_CHARS = 7; // 「ぴよぴよことば」
const TITLE_LETTER_SPACING = 2;
const TITLE_EDGE = 8;
const FRAME_MAX_W = 480; // App.tsx の frame の最大幅
function titleFontSize(windowW: number): number {
  const avail = Math.min(windowW, FRAME_MAX_W) - TITLE_EDGE * 2;
  return Math.min(
    font.huge,
    Math.floor((avail - TITLE_LETTER_SPACING * TITLE_CHARS) / TITLE_CHARS),
  );
}

export default function TitleScreen({ onPlay, onOtona }: Props) {
  const { width: windowW } = useWindowDimensions();
  // 歯車の 3 秒長押し（既定の長さ）で おとなモードへ。画面を離れたときは残りのタイマーを止める。
  const gearHold = useLongPress(onOtona);

  // タイトルをタップすると「ぴよぴよことば」を読み上げる（ジェスチャ起点＝自動再生制限を守る）。
  // 最初のタップでもあるので warmUpVoice() で読み上げをアンロックしてから読む。読み上げオフなら黙る。
  const sayTitle = () => {
    playSound("tap");
    warmUpVoice();
    initKotobaBgm(); // 最初のタップ（ジェスチャ起点）で BGM を開始（設定 ON のとき）
    sayPhrase("title", { enabled: getTtsOn() });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 街へ戻る（タイトルにだけ置く）。上に専用の行を取り、題字以下はその下に流す。 */}
        {SHOW_TOWN ? (
          <View style={styles.townRow}>
            <TownLink onPress={() => playSound("tap")} />
          </View>
        ) : null}

        <View style={styles.center}>
          {/* 題字は枠の左右の余白まで使う（全角かなの書体でも1行に収めるため）。 */}
          <View style={styles.titleRow}>
            <Pressable
              onPress={sayTitle}
              accessibilityRole="button"
              accessibilityLabel="ぴよぴよことば（きく）"
              hitSlop={12}
              testID="title-say"
            >
              <Text
                style={[styles.title, { fontSize: titleFontSize(windowW) }]}
              >
                ぴよぴよことば
              </Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>きいて さがそう</Text>

          {/* 概念の絵: ことばと もの（やさい・くだもの・どうぶつ・のりもの） */}
          <View style={styles.concept}>
            <Text style={styles.conceptEmoji}>🍌</Text>
            <Text style={styles.conceptEmoji}>🥕</Text>
            <Text style={styles.conceptEmoji}>🐶</Text>
            <Text style={styles.conceptEmoji}>🚗</Text>
          </View>

          <View style={styles.playWrap}>
            <BigButton
              emoji="▶️"
              label="あそぶ"
              size="huge"
              color={colors.play}
              pressedColor={colors.playPressed}
              onPress={() => {
                playSound("tap");
                warmUpVoice(); // 最初のタップで読み上げ（クリップ＋TTS）をアンロック
                initKotobaBgm(); // 同じジェスチャで BGM を開始（設定 ON のとき）
                onPlay();
              }}
            />
          </View>
        </View>

        {/* 親ゲート: 3秒長押しでおとなモード（右下。ほかの要素と重ならないよう行として置く） */}
        <View style={styles.gearRow}>
          <Pressable
            onPressIn={gearHold.onPressIn}
            onPressOut={gearHold.onPressOut}
            accessibilityRole="button"
            accessibilityLabel="おとなモード（長押し）"
            hitSlop={12}
            style={styles.gear}
            testID="gear"
          >
            <Text style={styles.gearGlyph}>⚙️</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // スクロールの入れ物は枠の左右の余白（space.md）まで広げ、中身の側で同じ余白を取り直す
  // （題字だけがその余白まで使えるようにするため。ほかの要素の位置は従来と同じ）。
  scroll: {
    flex: 1,
    marginHorizontal: -space.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.md,
  },
  townRow: {
    height: TOWN_LINK_HEIGHT,
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    alignSelf: "stretch",
    marginHorizontal: -space.md,
    alignItems: "center",
  },
  title: {
    fontSize: font.huge,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: TITLE_LETTER_SPACING,
  },
  subtitle: {
    fontSize: font.body,
    fontWeight: "700",
    color: colors.subtext,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  concept: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: space.sm,
    marginVertical: space.md,
  },
  conceptEmoji: {
    fontSize: 46,
  },
  playWrap: {
    width: "100%",
    maxWidth: 320,
    marginTop: space.xl,
  },
  // 歯車の行（右下）。歯車の位置は従来（右 space.sm・下 space.sm）と同じ。
  gearRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: space.sm,
    paddingBottom: space.sm,
  },
  gear: {
    padding: space.sm,
    opacity: 0.35,
  },
  gearGlyph: {
    fontSize: 30,
  },
});
