// ベルトコンベア（表現の核・DESIGN §8）。
// 選択肢の絵文字を並べたトラックを標準 Animated の loop で右→左にゆっくり無限スクロールさせる。
// トラックは選択肢1組を必要数コピーして敷き詰め、translateX が1組ぶん（unitWidth）進むたびに
// 見た目が同一になる＝継ぎ目のないループ。画面外に出た絵はループで右から戻る（失敗状態を作らない）。
//
// - 速度は一定・ゆっくり（約 55px/秒）。速く追わせない。
// - 各コピーは Pressable。正解のコピーをタップすると勝ち（複数コピーでも同一語なのでどれでも可）。
// - 誤答はその語のコピーだけ ぷるぷる（shakeNonce パターン）。ベルトは止めずに流れ続ける。
// - itemSize はベルトの実測サイズ（beltW/beltH）から算出し、可視領域を絶対にはみ出さない。

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { WordItem } from '../types';

const SPEED = 55; // px/秒（DESIGN §8）

interface Props {
  choices: WordItem[]; // 1組（シャッフル済み）
  answerWord: string; // 正解語（testID 付与とタップ判定の補助に使う）
  beltW: number; // ベルト領域の実測幅
  beltH: number; // ベルト領域の実測高さ
  paused: boolean; // 正解演出中は止める
  onPick: (item: WordItem) => void;
  shakeWord: string | null; // 直近にまちがえた語（この語のコピーだけ震える）
  shakeNonce: number; // 単調増加（震えの再トリガ）
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ベルト上の1個（絵文字カード）。誤答時はこの語のコピーだけ ぷるぷる震える。
function BeltItem({
  item,
  cellW,
  beltH,
  itemSize,
  isAnswer,
  shakeActive,
  shakeNonce,
  onPick,
}: {
  item: WordItem;
  cellW: number;
  beltH: number;
  itemSize: number;
  isAnswer: boolean;
  shakeActive: boolean;
  shakeNonce: number;
  onPick: (item: WordItem) => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const prevNonce = useRef(0);

  useEffect(() => {
    if (shakeActive && shakeNonce > 0 && shakeNonce !== prevNonce.current) {
      prevNonce.current = shakeNonce;
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 0, duration: 60, easing: Easing.linear, useNativeDriver: false }),
      ]).start();
    }
  }, [shakeActive, shakeNonce, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });

  return (
    <Pressable
      onPress={() => onPick(item)}
      accessibilityRole="button"
      accessibilityLabel={item.word}
      testID={isAnswer ? 'belt-correct' : undefined}
      style={{ width: cellW, height: beltH, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          styles.card,
          { width: itemSize, height: itemSize, transform: [{ translateX }] },
        ]}
      >
        <Text style={{ fontSize: Math.round(itemSize * 0.6), lineHeight: Math.round(itemSize * 0.78) }}>
          {item.emoji}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Belt({
  choices,
  answerWord,
  beltW,
  beltH,
  paused,
  onPick,
  shakeWord,
  shakeNonce,
}: Props) {
  // 絵の1辺と1セルの幅（実測から算出。指1本で押せる大きさを確保しつつ、常時3〜4個が見える密度に）。
  const itemSize = clamp(Math.min(beltH * 0.5, beltW * 0.22), 56, 104);
  const cellW = Math.round(itemSize + Math.max(24, itemSize * 0.4));
  // コンベアの帯は絵のちょうど下に敷く（絵が帯の上に乗っているように見せる）。
  const railTop = Math.round(beltH / 2 + itemSize / 2 + 8);
  const unitWidth = cellW * choices.length;
  // 可視領域を覆うのに必要なコピー数（継ぎ目なくループさせるため +1）。
  const copies = Math.max(2, Math.ceil(beltW / Math.max(unitWidth, 1)) + 1);

  // 敷き詰めたセル列（copies × choices）。
  const cells = useMemo(() => {
    const out: WordItem[] = [];
    for (let c = 0; c < copies; c++) {
      for (const w of choices) out.push(w);
    }
    return out;
  }, [copies, choices]);

  const tx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused || unitWidth <= 0) return;
    tx.setValue(0);
    const anim = Animated.loop(
      Animated.timing(tx, {
        toValue: -unitWidth,
        duration: (unitWidth / SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [paused, unitWidth, tx]);

  const trackWidth = cellW * cells.length;

  return (
    <View style={styles.viewport} pointerEvents="box-none">
      {/* コンベアらしい下の帯（飾り）。絵のすぐ下に敷く。 */}
      <View style={[styles.rail, { top: railTop }]} pointerEvents="none" />

      <Animated.View
        style={{
          flexDirection: 'row',
          width: trackWidth,
          height: beltH,
          transform: [{ translateX: tx }],
        }}
      >
        {cells.map((item, i) => (
          <BeltItem
            key={i}
            item={item}
            cellW={cellW}
            beltH={beltH}
            itemSize={itemSize}
            isAnswer={item.word === answerWord}
            shakeActive={shakeWord === item.word}
            shakeNonce={shakeNonce}
            onPick={onPick}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.beltRail,
  },
  card: {
    backgroundColor: colors.item,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.itemBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00000040',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
});