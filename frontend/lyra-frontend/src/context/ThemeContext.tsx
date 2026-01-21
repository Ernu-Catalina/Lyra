// src/context/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light-modern" | "dark-minimal" | "sepia-classic"; // add more later

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "lyra-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme;
    return saved && ["light-modern", "dark-minimal", "sepia-classic"].includes(saved)
      ? saved
      : "light-modern"; // default
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);

    // Apply root class for Tailwind dark mode + custom themes
    document.documentElement.classList.remove("light-modern", "dark-minimal", "sepia-classic");
    document.documentElement.classList.add(theme);

    // Optional: apply body class if needed for non-Tailwind elements
    document.body.classList.remove("light-modern", "dark-minimal", "sepia-classic");
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}