// Small shared UI helpers.

export function showToast(msg) {
    const banner = document.getElementById('toastBanner');
    document.getElementById('toastMessage').textContent = msg;
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    setTimeout(() => {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
    }, 3000);
}

export function haptic(pattern = 12) {
    navigator.vibrate?.(pattern); // Android; iOS ignores it
}
