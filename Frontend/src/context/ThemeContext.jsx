import { createContext, useState, useEffect, useCallback } from "react";

export const ThemeContext = createContext(null);

const STORAGE_KEY = "displayMode";

const getInitialTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
};

const applyThemeClass = (mode) => {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark-theme");
  } else if (mode === "light") {
    root.classList.remove("dark-theme");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark-theme", prefersDark);
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}
    applyThemeClass(newTheme);
  }, []);

  useEffect(() => {
    applyThemeClass(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || stored === "auto") {
        applyThemeClass("auto");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const resolvedTheme =
    theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
