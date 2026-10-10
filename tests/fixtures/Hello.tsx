// tests/loader.test.ts が、.tsx の読み込み（JSX の変換）を確かめるための最小の部品。
export function Hello({ name }: { name: string }) {
  return <p>こんにちは、{name}</p>;
}
