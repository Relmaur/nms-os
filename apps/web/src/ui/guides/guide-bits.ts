// Shared by Guides (17) and a book (18).
export const TOP_BUTTON =
  'w-11 h-11 rounded-control bg-slate-ground border border-control-edge grid place-items-center text-ink hover:border-control-edge-hover';
// A book's numeral, lit once something in it is ticked.
export const BOOK_TILE = (started: boolean) =>
  `w-[46px] h-[60px] shrink-0 rounded-[8px] grid place-items-center font-display font-extrabold text-[15px] bg-[linear-gradient(180deg,#0f1b33,#0b1325)] border ${
    started ? 'border-scanner-cyan-edge-strong text-scanner-cyan-text' : 'border-control-edge text-ink-muted'
  }`;
