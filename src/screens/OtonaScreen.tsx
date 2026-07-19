// おとなモード（親ゲートの奥・DESIGN §7）。
//   ・カテゴリ: やさい🥕 / くだもの🍓 / どうぶつ🐰 / のりもの🚗 を1つずつオン/オフ（最低1つは残す）
//   ・よみあげ: する / しない
//   ・あつめた ほし: ⭐×N ＋「0に もどす」（2段階確認）
// 変更は次のもんだいから反映される（PlayScreen がマウント時に設定を読む）。
// 項目が増えても背の低い画面で「もどる」が隠れないよう、内容は ScrollView に入れる（DESIGN §8）。

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import BigButton from '../components/BigButton';
import {
  ALL_CATEGORIES,
  getBgmOn,
  getCategories,
  getTotalStars,
  getTtsOn,
  resetStars,
  setTtsOn,
  toggleCategory,
} from '../settings';
import { CATEGORY_LABELS } from '../game/words';
import { CategoryId } from '../types';
import { playSound } from '../audio/sounds';
import { setKotobaBgmOn } from '../audio/bgm';

interface Props {
  onBack: () => void;
}

export default function OtonaScreen({ onBack }: Props) {
  const [cats, setCats] = useState<CategoryId[]>(getCategories());
  const [tts, setTts] = useState<boolean>(getTtsOn());
  const [bgm, setBgm] = useState<boolean>(getBgmOn());
  const [stars, setStars] = useState<number>(getTotalStars());
  const [confirmReset, setConfirmReset] = useState(false); // 誤操作防止の2段階確認

  const onToggleCat = (id: CategoryId) => {
    playSound('tap');
    setCats(toggleCategory(id));
  };

  const onToggleTts = (on: boolean) => {
    playSound('tap');
    setTtsOn(on);
    setTts(on);
  };

  // BGM ながす/ながさない。タップ（ジェスチャ起点）なので ON で即再開できる。
  const onToggleBgm = (on: boolean) => {
    playSound('tap');
    setKotobaBgmOn(on); // 保存（kotoba.bgm）＋エンジン ON/OFF（OFFは即フェード停止・ONは即再開）
    setBgm(on);
  };

  const onResetPress = () => {
    playSound('tap');
    if (!confirmReset) {
      setConfirmReset(true); // 1回目は確認へ
      return;
    }
    resetStars();
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
                  style={[styles.cat, active ? styles.catActive : styles.catIdle, lastOne && styles.catLocked]}
                >
                  <Text style={styles.catEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.catText, active && styles.catTextActive]}>{meta.label}</Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>
            オンにした なかまだけ でます。すくなくとも 1つは のこります。つぎのもんだいから かわります。
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
              style={[styles.option, tts ? styles.optionActive : styles.optionIdle]}
            >
              <Text style={[styles.optionText, tts && styles.optionTextActive]}>する</Text>
              {tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleTts(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !tts }}
              style={[styles.option, !tts ? styles.optionActive : styles.optionIdle]}
            >
              <Text style={[styles.optionText, !tts && styles.optionTextActive]}>しない</Text>
              {!tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            「する」だと ことばを こえで よみます。おとが つかえない ときも あそべます。
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
              style={[styles.option, bgm ? styles.optionActive : styles.optionIdle]}
              testID="bgm-on"
            >
              <Text style={[styles.optionText, bgm && styles.optionTextActive]}>ながす</Text>
              {bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleBgm(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !bgm }}
              style={[styles.option, !bgm ? styles.optionActive : styles.optionIdle]}
              testID="bgm-off"
            >
              <Text style={[styles.optionText, !bgm && styles.optionTextActive]}>ながさない</Text>
              {!bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            やさしい オルゴールの きょくが ながれます。こえの あいだは そっと ちいさくなります。
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
                  playSound('tap');
                  setConfirmReset(false);
                }}
                accessibilityRole="button"
                style={[styles.resetBtn, styles.resetCancel]}
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
                confirmReset ? styles.resetConfirm : styles.resetIdle,
                stars === 0 && !confirmReset ? styles.resetDisabled : null,
              ]}
            >
              <Text style={confirmReset ? styles.resetConfirmText : styles.resetIdleText}>
                {confirmReset ? 'ほんとうに 0に する' : '0に もどす'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>あつめた ほし は へりません。ここでだけ 0に もどせます。</Text>
        </View>

        {/* 音声クレジット（VOICEVOX 利用規約）。同梱の読み上げクリップの出所を小さく明記する。 */}
        <Text style={styles.credit}>よみあげのこえ: VOICEVOX:ずんだもん</Text>
      </ScrollView>

      {/* 「もどる」はスクロールの外に固定し、背の低い画面でも常に押せるようにする（DESIGN §8）。 */}
      <View style={styles.backWrap}>
        <BigButton emoji="◀️" label="もどる" onPress={onBack} color={colors.button} />
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
    fontWeight: '800',
    color: colors.text,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.beltBorder,
  },
  cardGap: {
    marginTop: space.md,
  },
  label: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
    marginBottom: space.md,
  },
  // カテゴリは2×2グリッド
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.md,
    rowGap: space.md,
  },
  cat: {
    width: '46%',
    flexGrow: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: space.xs,
    paddingHorizontal: space.sm,
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
    fontSize: font.body,
    fontWeight: '900',
    color: colors.text,
  },
  catTextActive: {
    color: colors.white,
  },
  options: {
    flexDirection: 'row',
    columnGap: space.md,
  },
  option: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: space.sm,
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
    fontSize: font.big,
    fontWeight: '900',
    color: colors.text,
  },
  optionTextActive: {
    color: colors.white,
  },
  check: {
    fontSize: font.big,
    color: colors.white,
    fontWeight: '900',
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
    textAlign: 'center',
    marginTop: space.lg,
  },
  starTotal: {
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.text,
  },
  resetRow: {
    flexDirection: 'row',
    columnGap: space.sm,
    marginTop: space.md,
  },
  resetBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  resetIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  resetIdleText: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.subtext,
  },
  resetConfirm: {
    backgroundColor: colors.button,
    borderColor: colors.buttonPressed,
  },
  resetConfirmText: {
    fontSize: font.body,
    fontWeight: '900',
    color: colors.white,
  },
  resetCancel: {
    backgroundColor: colors.surface,
    borderColor: colors.beltBorder,
  },
  resetCancelText: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
  },
  resetDisabled: {
    opacity: 0.4,
  },
});