// Small shared UI helpers.

export function showToast(msg: string): void {
  const banner = document.getElementById('toastBanner');
  const message = document.getElementById('toastMessage');
  if (!banner || !message) return;
  message.textContent = msg;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
  setTimeout(() => {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }, 3000);
}

export function haptic(pattern: number | number[] = 12): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern); // Android; iOS Safari has no vibrate()
}
