// Types for the parts of the vanilla Systems screen (systems.js) that React screens call, until it moves to React.
export function openSystem(id: string): void;
export function openSystemEditor(id?: string | null, preset?: { tags?: string[]; conflict?: string }): void;
export function logPacketRun(id: string): void;
export function copyGlyphs(glyphs: string): void;
