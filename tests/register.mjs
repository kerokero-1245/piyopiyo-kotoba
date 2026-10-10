// node --test の読み込み設定。`node --import ./tests/register.mjs` で先に読む（package.json の test）。
//
// src は Metro / Babel で動く書き方をしていて、そのままでは node で読めない。ここで次の 4 つを受け持つ:
//   1. import に拡張子が無い（`./words`）→ .ts / .tsx（と index.ts / index.tsx）を探して解決する。
//   2. 型だけの import（`import { WordItem } from "../types"`）が残る。node の型剥がしは import を消さないので、
//      typescript の transpileModule で変換する（値として使われない import はここで消える）。JSX もここで変換する。
//   3. react-native / expo / expo-* は node で読めない。tests/stubs の代用品に差し替える。
//   4. svg・画像・音声は `require("../../assets/x.svg")` で読んでいる。Metro は資産 ID を返すが、
//      ここでは「その資産ファイルの絶対パス」の文字列に置き換える（ファイルが実在するかを検査できる）。
//
// 新しい依存は使わない（typescript は devDependencies にある）。node 標準の module.registerHooks（22.15 以上）を使う。
// 変換はテストの中だけで効く（src の見た目や挙動には関わらない）。

import { existsSync, readFileSync, statSync } from "node:fs";
import * as nodeModule from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (typeof nodeModule.registerHooks !== "function") {
  throw new Error(
    "module.registerHooks が無い。Node 22.15 以上で実行する（.nvmrc は 22.23.3）",
  );
}
const require = nodeModule.createRequire(import.meta.url);
const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_RE = /\.tsx?$/;
const ASSET_RE = /\.(svg|png|jpe?g|gif|webp|m4a|mp3|wav|ogg|mp4|ttf|otf)$/i;

// 差し替える外部パッケージ。左の正規表現に合う import は、右の代用品を読む。
const STUBS = [
  [/^react-native$/, path.join(TESTS_DIR, "stubs/react-native.ts")],
  [/^expo(-[\w-]+)?(\/.*)?$/, path.join(TESTS_DIR, "stubs/expo.ts")],
];

// 失敗したときの行番号を .ts のものにする（変換側の inlineSourceMap と対）。
process.setSourceMapsEnabled(true);

// typescript は最初の変換で初めて読む（`node --test` の親プロセスは .ts を読まないので読み込みを省ける）。
let compiler;
function getCompiler() {
  if (compiler === undefined) {
    const ts = require("typescript");
    compiler = {
      ts,
      options: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        inlineSourceMap: true,
        inlineSources: true,
      },
    };
  }
  return compiler;
}

const isFile = (p) => existsSync(p) && statSync(p).isFile();

// ファイルのパス → 変換後の JS。`?fresh=N` で同じファイルを何度も読み直しても、変換は 1 回で済ませる。
const transpiled = new Map();

// `./words` のような拡張子なしの指定から、実在する .ts / .tsx を探す。
function findSource(base) {
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ].find((candidate) => SOURCE_RE.test(candidate) && isFile(candidate));
}

// `require("../../assets/x.svg")` を、その資産ファイルの絶対パスの文字列リテラルに置き換える。
// 正規表現ではなく構文木で見るので、コメントや文字列の中の "require(" には触れない。
function assetRequireToPath(ts) {
  return (context) => (sourceFile) => {
    const dir = path.dirname(sourceFile.fileName);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        ASSET_RE.test(node.arguments[0].text)
      ) {
        return ts.factory.createStringLiteral(
          path.resolve(dir, node.arguments[0].text),
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(sourceFile, visit);
  };
}

nodeModule.registerHooks({
  resolve(specifier, context, nextResolve) {
    for (const [pattern, stub] of STUBS) {
      if (pattern.test(specifier)) {
        return { url: pathToFileURL(stub).href, shortCircuit: true };
      }
    }
    if (
      /^\.{1,2}\//.test(specifier) &&
      context.parentURL?.startsWith("file:")
    ) {
      // `?fresh=1` のような末尾は URL に残す（同じファイルを別のインスタンスとして読み直すのに使う）。
      const [, request, suffix] = /^([^?#]*)(.*)$/.exec(specifier);
      const found = findSource(
        path.resolve(path.dirname(fileURLToPath(context.parentURL)), request),
      );
      if (found) {
        return { url: pathToFileURL(found).href + suffix, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },

  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !SOURCE_RE.test(new URL(url).pathname)) {
      return nextLoad(url, context);
    }
    const file = fileURLToPath(url);
    if (!transpiled.has(file)) {
      const { ts, options } = getCompiler();
      const { outputText, diagnostics } = ts.transpileModule(
        readFileSync(file, "utf8"),
        {
          fileName: file,
          reportDiagnostics: true,
          compilerOptions: options,
          transformers: { before: [assetRequireToPath(ts)] },
        },
      );
      const errors = diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Error,
      );
      if (errors.length > 0) {
        const lines = errors.map(
          (d) =>
            `${file}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
        );
        throw new SyntaxError(lines.join("\n"));
      }
      transpiled.set(file, outputText);
    }
    return {
      format: "module",
      source: transpiled.get(file),
      shortCircuit: true,
    };
  },
});
