// 枠（App.tsx の frame）の寸法（DESIGN §8）。App.tsx と ClearOverlay で共有する。
// ぴよぴよさんすうの src/layout.ts と同じ名前にそろえる（ことばは背の低い横向き用の枠を持たない）。

import { space } from './theme';

// 枠の上下の余白。がんばりカードはこの余白まで使って中身を置く（ClearOverlay）。
export const FRAME_PAD_TOP = space.lg;
export const FRAME_PAD_BOTTOM = space.md;
