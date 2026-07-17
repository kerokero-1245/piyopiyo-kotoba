// もんだい画面（本体・DESIGN §6〜§8）。有効カテゴリから正解語＋別カテゴリ誤答で選択肢を作り、
// ベルトコンベアに流す。出題バー「◯◯ は どれ？」＋🔊（表示と同時に読み上げ）。
//   ・正解 → ベルトを止めて中央に ぽんっと拡大＋「◯◯！」＋読み上げ＋⭐スタンプ＋紙吹雪 → 次へ。
//   ・不正解 → 押した絵が ぷるぷる → ベルトは流れ続ける → もう一度（罰なし・タイマーなし）。
// 5問おわると きょうの がんばりカード。
//
// レイアウト（さんすうの教訓 / DESIGN §8）: 縦を「ヘッダー＋出題バー＋ベルト」で構成し、ベルトを
// flex:1 で確保。ベルトの実測サイズ（onLayout）から絵の大きさを算出し、可視領域を絶対にはみ出さない。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { generateSet } from '../game/quiz';
import { addStars, getCategories, getTtsOn } from '../settings';
import { playSound } from '../audio/sounds';
import { cancelVoice, sayWord } from '../audio/voice';
import { WordItem } from '../types';
import Belt from '../components/Belt';
import RevealCard from '../components/RevealCard';
import ClearOverlay from '../components/ClearOverlay';
import Confetti from '../components/Confetti';
import ProgressStar from '../components/ProgressStar';

interface Props {
  onHome: () => void;
}

const SET_SIZE = 5;

export default function PlayScreen({ onHome }: Props) {
  // 設定はマウント時に固定（このセットの途中で変わらない）。
  const catsRef = useRef(getCategories());
  const ttsRef = useRef(getTtsOn());

  const [questions, setQuestions] = useState(() => generateSet(catsRef.current, SET_SIZE));
  const [index, setIndex] = useState(0);
  const [gameId, setGameId] = useState(0);
  // このセットで集めた⭐スタンプの数（=クリアした問題数）。進捗ドットが左から⭐に変わる。
  const [starsEarned, setStarsEarned] = useState(0);

  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const [locked, setLocked] = useState(false); // 正解演出のあいだは押せない
  const [celebrating, setCelebrating] = useState(false); // リビール＋紙吹雪
  const [done, setDone] = useState(false);
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [shakeNonce, setShakeNonce] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      cancelVoice();
    },
    []
  );

  const question = questions[index];
  const answer = question.answer;

  // 新しい問題を表示した瞬間に読み上げ（設定オンのときだけ）。
  useEffect(() => {
    if (ttsRef.current) sayWord(answer, { enabled: true });
    // 問題が変わるたび（index/gameId）に1回。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, gameId]);

  const onBeltLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured((m) => (m.w === width && m.h === height ? m : { w: width, h: height }));
  };

  const goNext = useCallback(() => {
    setShakeWord(null);
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }, [index, questions.length]);

  const newGame = useCallback(() => {
    setQuestions(generateSet(catsRef.current, SET_SIZE));
    setIndex(0);
    setGameId((g) => g + 1);
    setStarsEarned(0);
    setLocked(false);
    setCelebrating(false);
    setDone(false);
    setShakeWord(null);
  }, []);

  const onPick = useCallback(
    (item: WordItem) => {
      if (locked || celebrating || done) return;
      playSound('tap');
      if (item.word === answer.word) {
        // 正解: ベルトを止め、リビール ぽんっ → ⭐獲得（累計＋進捗ドット）→ 読み上げ「◯◯！」→ 次へ。
        // 再挑戦してからのクリアでも同じ⭐（獲得に条件差はつけない・DESIGN §14）。
        setLocked(true);
        setCelebrating(true);
        addStars(1);
        setStarsEarned((s) => s + 1);
        playSound('star');
        if (ttsRef.current) sayWord(answer, { enabled: true });
        later(() => {
          setCelebrating(false);
          setLocked(false);
          goNext();
        }, 1300);
      } else {
        // 不正解: 押した語だけ ぷるぷる → ベルトは流れ続ける → もう一度。罰なし。
        setShakeWord(item.word);
        setShakeNonce((n) => n + 1);
        playSound('wrong');
      }
    },
    [locked, celebrating, done, answer, goNext, later]
  );

  const speakAsk = () => {
    playSound('tap');
    if (ttsRef.current) sayWord(answer, { enabled: true });
  };

  return (
    <View style={styles.root}>
      {/* ヘッダー: おうち＋進捗ドット */}
      <View style={styles.header}>
        <Pressable onPress={onHome} hitSlop={10} style={styles.homeBtn} accessibilityLabel="おうちへ">
          <Text style={styles.homeGlyph}>🏠</Text>
        </Pressable>
        <View style={styles.progress} testID="progress">
          {questions.map((_, i) => (
            <ProgressStar key={i} state={i < starsEarned ? 'star' : i === index ? 'now' : 'off'} />
          ))}
        </View>
        <View style={styles.homeBtn} />
      </View>

      {/* 出題バー: 「◯◯ は どれ？」＋🔊 */}
      <View style={styles.askBar}>
        <Text style={styles.askText} numberOfLines={1} adjustsFontSizeToFit testID="ask-word">
          {answer.word} は どれ？
        </Text>
        <Pressable onPress={speakAsk} hitSlop={10} style={styles.speaker} accessibilityLabel="もういちど きく" testID="speak-btn">
          <Text style={styles.speakerGlyph}>🔊</Text>
        </Pressable>
      </View>

      {/* ベルト: 実測サイズに合わせて絵を描画（可視領域に必ず収める） */}
      <View style={styles.belt} onLayout={onBeltLayout}>
        {measured.w > 0 && measured.h > 0 ? (
          <Belt
            key={`${gameId}-${index}`}
            choices={question.choices}
            answerWord={answer.word}
            beltW={measured.w}
            beltH={measured.h}
            paused={celebrating || done}
            onPick={onPick}
            shakeWord={shakeWord}
            shakeNonce={shakeNonce}
          />
        ) : null}
      </View>

      {celebrating ? <Confetti /> : null}
      {celebrating ? <RevealCard item={answer} /> : null}
      {done ? <ClearOverlay starCount={SET_SIZE} onReplay={newGame} onHome={onHome} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGlyph: {
    fontSize: 28,
  },
  progress: {
    flexDirection: 'row',
    columnGap: space.sm,
    alignItems: 'center',
  },
  askBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.askBar,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.askBarBorder,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginTop: space.sm,
  },
  askText: {
    flex: 1,
    fontSize: font.title,
    fontWeight: '900',
    color: colors.text,
  },
  speaker: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    marginLeft: space.sm,
  },
  speakerGlyph: {
    fontSize: 30,
  },
  belt: {
    flex: 1,
    backgroundColor: colors.beltBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.beltBorder,
    marginVertical: space.sm,
    overflow: 'hidden',
  },
});