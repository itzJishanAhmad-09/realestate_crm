// Next.js generates `.next/types/global.d.ts` on `next build` / `next dev`,
// which normally declares CSS modules. TS 5.5+ (error 2882) rejects
// side-effect imports like `import './globals.css'` unless these are declared.
// This file guarantees they're always declared, regardless of `.next` state.
declare module '*.css' {}
declare module '*.scss' {}
declare module '*.sass' {}
