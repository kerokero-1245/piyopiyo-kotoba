// ぴよぴよことば のルート。react-navigation は使わず、文字ヘッダの無い全画面遷移にするための
// 最小ステートルーター。縦持ち前提のレイアウト（中央寄せ・最大幅制限）で横画面・大画面でも
// 崩れにくくする（DESIGN §8）。ぴよぴよさんすうと同じ構成。

import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import {
  PiyoUiProvider,
  type PiyoUiTokens,
} from "@kerokero-1245/piyo-assets/ui";
import { Route } from "./src/types";
import { colors, font, radius, space } from "./src/theme";
import { FRAME_PAD_BOTTOM, FRAME_PAD_TOP } from "./src/layout";
import TitleScreen from "./src/screens/TitleScreen";
import PlayScreen from "./src/screens/PlayScreen";
import OtonaScreen from "./src/screens/OtonaScreen";

// piyo-assets の ui/ の部品（紙吹雪など）に渡す見た目の値。値の正本は src/theme.ts。
// 街へのリンクの枠と押下の色は、流れてくるカードの枠（itemBorder）と押下（itemPressed）の色。
// 白い大ボタンの押下色は theme に無く、元の部品の直書きの値をそのまま渡す。
// モジュールの定数にして、描画のたびに作り直さない（作り直すと紙吹雪の配置まで変わる）。
const UI_TOKENS: PiyoUiTokens = {
  colors: {
    surface: colors.surface,
    text: colors.text,
    white: colors.white,
    townBorder: colors.itemBorder,
    townPressed: colors.itemPressed,
    buttonPressed: colors.buttonPressed,
    cardButtonPressed: "#F0EADD",
    progressNow: colors.progressNow,
    progressOff: colors.progressOff,
    confetti: colors.confetti,
  },
  font,
  space,
  radius,
};

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "title" });
  const go = useCallback((r: Route) => setRoute(r), []);

  let screen: React.ReactNode = null;
  switch (route.name) {
    case "title":
      screen = (
        <TitleScreen
          onPlay={() => go({ name: "play" })}
          onOtona={() => go({ name: "otona" })}
        />
      );
      break;
    case "play":
      // 入るたびに新しい5問で始める（PlayScreen が生成）。
      screen = <PlayScreen onHome={() => go({ name: "title" })} />;
      break;
    case "otona":
      screen = <OtonaScreen onBack={() => go({ name: "title" })} />;
      break;
  }

  return (
    <PiyoUiProvider tokens={UI_TOKENS}>
      <View style={styles.root}>
        <View style={styles.frame}>{screen}</View>
        <StatusBar style="dark" />
      </View>
    </PiyoUiProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    paddingTop: FRAME_PAD_TOP,
    paddingBottom: FRAME_PAD_BOTTOM,
    paddingHorizontal: space.md,
  },
});
