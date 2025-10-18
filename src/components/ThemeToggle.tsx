'use client';

export function ThemeToggle() {
    const toggle = () => {
        try {
            const isDark = document.documentElement.classList.contains('dark');
            if (isDark) {
                document.documentElement.classList.remove('dark');
                try { localStorage.setItem('theme', 'light'); } catch (e) { }
                try { document.cookie = 'theme=light; path=/; max-age=31536000; samesite=lax'; } catch (e) { }
            } else {
                document.documentElement.classList.add('dark');
                try { localStorage.setItem('theme', 'dark'); } catch (e) { }
                try { document.cookie = 'theme=dark; path=/; max-age=31536000; samesite=lax'; } catch (e) { }
            }
        } catch (e) {
            console.warn('Theme toggle failed:', e);
        }
    };

    return (
        <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 dark:bg-black/30 text-gray-800 dark:text-white"
        aria-label="Cambiar tema"
        type="button"
        >
            <span className="dark:hidden">☀️</span>
            <span className="hidden dark:inline">🌙</span>
        </button>
    );
}


