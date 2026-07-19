// 正解演出のリビールカード（DESIGN §8）。正しいものをタップした瞬間に、その絵を中央に
// 大きく「ぽんっ」と出す（spring）＋「◯◯！」。座標計算を避け、どのビューポートでも中央に確実に
// 大きく見せる。読み上げ・紙吹雪・⭐は PlayScreen 側で同時に鳴らす（ここは見た目だけ）。

import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { WordItem } from '../types';

// label = 表示用ラベル（もじ設定で ひらがな/カタカナ/まぜがき に変換済み）。
// 省略時は word（ひらがな）を表示。読み上げ・SVG・同一性は item.word のままで、見た目だけを差し替える。
export default function RevealCard({ item, label }: { item: WordItem; label?: string }) {
  const shown = label ?? item.word;
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: false }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={styles.root} pointerEvents="none" testID="reveal">
      <View style={styles.backdrop} />
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <Image source={item.svg} resizeMode="contain" accessibilityLabel={item.word} style={styles.emoji} />
        <Text style={styles.word}>{shown}！</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    borderWidth: 5,
    borderColor: colors.white,
    shadowColor: '#00000066',
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
    fontWeight: '900',
    color: colors.text,
    marginTop: space.sm,
    textAlign: 'center',
  },
});