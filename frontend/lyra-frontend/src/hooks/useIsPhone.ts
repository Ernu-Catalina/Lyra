import { useState, useEffect } from 'react';

const PHONE_BREAKPOINT = 768;

export const useIsPhone = (): boolean => {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('desktop') === 'true') {
      setIsPhone(false);
      return; // ← important: early return
    }

    const mediaQuery = window.matchMedia(`(max-width: ${PHONE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      // Don't switch back to mobile if desktop flag is present
      if (new URLSearchParams(window.location.search).get('desktop') === 'true') return;
      setIsPhone(e.matches);
    };

    setIsPhone(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isPhone;
};