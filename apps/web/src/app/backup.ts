// Export and Import of nms_state.json, the only way user data leaves this device (ADR-0002). Shared by More and
// the main page's header.
import { isPlainObject } from '@atlas/core/util';
import { buildState, migrateLegacyState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { appState, setAppState, saveAppState } from './store.ts';
import { showToast } from './ui.ts';

export function exportState(): void {
  const blob = new Blob([JSON.stringify(appState, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'nms_state.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Exported nms_state.json for your Git repo!');
}

// Nothing is replaced unless the whole file is valid; the message names the first problems so they can be fixed.
export async function importState(file: File | undefined): Promise<void> {
  if (!file) return;
  let imported: unknown;
  try {
    imported = JSON.parse(await file.text());
  } catch {
    showToast('That file isn’t valid JSON, so nothing was imported.');
    return;
  }
  const candidate = isPlainObject(imported) ? migrateLegacyState(imported) : imported;
  const { ok, errors } = validateState(candidate);
  if (!ok) {
    showToast(`Not imported: ${describeErrors(errors.slice(0, 2))}.`);
    return;
  }
  setAppState(buildState(candidate));
  saveAppState();
  showToast('Imported nms_state.json successfully!');
}
