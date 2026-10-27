// Shared Tailwind CDN config for every ATLAS // MASTER OS page (load right after the Tailwind CDN script).
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                atlas: {
                    bg: '#050811',
                    panel: '#0b1325',
                    border: '#1e293b',
                    cyan: '#06b6d4',
                    amber: '#f59e0b',
                    purple: '#a855f7',
                    emerald: '#10b981',
                    crimson: '#ef4444'
                }
            }
        }
    }
}
