import { useEffect, useState } from 'react';

    export function useSystemTheme() {
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemTheme(media.matches ? 'dark' : 'light');

        const listener = (e: MediaQueryListEvent) =>
        setSystemTheme(e.matches ? 'dark' : 'light');

        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, []);

    return systemTheme;
    }