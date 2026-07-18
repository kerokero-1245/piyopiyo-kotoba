// タイトル画面。文字ゼロでも進める大ボタン「あそぶ」＋概念の絵（ことばの もの が並ぶ）。
// 隅の歯車を3秒長押しでおとなモードへ（4〜5歳が偶発しにくい親ゲート／DESIGN §7）。
// 「あそぶ」タップで TTS を1回アンロックする（iOS Safari 対策・DESIGN §4）。

import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '../theme';
import BigButton from '../components/BigButton';
import { playSound } from '../audio/sounds';
import { sayPhrase, warmUpVoice } from '../audio/voice';
import { getTtsOn } from '../settings';

interface Props {
  onPlay: () => void;
  onOtona: () => void;
}

const HOLD_MS = 3000;

export default function TitleScreen({ onPlay, onOtona }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const startHold = () => {
    clearHold();
    timer.current = setTimeout(() => {
      timer.current = null;
      onOtona();
    }, HOLD_MS);
  };

  // タイトルをタップすると「ぴよぴよことば」を読み上げる（ジェスチャ起点＝自動再生制限を守る）。
  // 最初のタップでもあるので warmUpVoice() で読み上げをアンロックしてから読む。読み上げオフなら黙る。
  const sayTitle = () => {
    playSound('tap');
    warmUpVoice();
    sayPhrase('title', { enabled: getTtsOn() });
  };

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Pressable
          onPress={sayTitle}
          accessibilityRole="button"
          accessibilityLabel="ぴよぴよことば（きく）"
          hitSlop={12}
          testID="title-say"
        >
          <Text style={styles.title}>ぴよぴよことば</Text>
        </Pressable>
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
              playSound('tap');
              warmUpVoice(); // 最初のタップで読み上げ（クリップ＋TTS）をアンロック
              onPlay();
            }}
          />
        </View>
      </View>

      {/* 親ゲート: 3秒長押しでおとなモード */}
      <Pressable
        onPressIn={startHold}
        onPressOut={clearHold}
        accessibilityLabel="おとなモード（長押し）"
        hitSlop={12}
        style={styles.gear}
        testID="gear"
      >
        <Text style={styles.gearGlyph}>⚙️</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  concept: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: space.sm,
    marginVertical: space.md,
  },
  conceptEmoji: {
    fontSize: 46,
  },
  playWrap: {
    width: '100%',
    maxWidth: 320,
    marginTop: space.xl,
  },
  gear: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    padding: space.sm,
    opacity: 0.35,
  },
  gearGlyph: {
    fontSize: 30,
  },
});