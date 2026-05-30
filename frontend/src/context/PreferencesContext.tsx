import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeColor = 'yellow' | 'blue' | 'green' | 'purple';
export type FontStyle = 'inter' | 'outfit' | 'roboto' | 'opensans';
export type TextSize = 'small' | 'medium' | 'large';

interface PreferencesContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  fontStyle: FontStyle;
  setFontStyle: (font: FontStyle) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  triggerHaptic: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('keep-in-mind-color') as ThemeColor) || 'yellow';
  });
  
  const [fontStyle, setFontStyleState] = useState<FontStyle>(() => {
    return (localStorage.getItem('keep-in-mind-font') as FontStyle) || 'inter';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    return (localStorage.getItem('keep-in-mind-text-size') as TextSize) || 'medium';
  });

  const [hapticFeedback, setHapticFeedbackState] = useState<boolean>(() => {
    const saved = localStorage.getItem('keep-in-mind-haptic');
    return saved !== null ? saved === 'true' : true;
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem('keep-in-mind-color', color);
  };

  const setFontStyle = (font: FontStyle) => {
    setFontStyleState(font);
    localStorage.setItem('keep-in-mind-font', font);
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    localStorage.setItem('keep-in-mind-text-size', size);
  };

  const setHapticFeedback = (enabled: boolean) => {
    setHapticFeedbackState(enabled);
    localStorage.setItem('keep-in-mind-haptic', String(enabled));
  };

  const triggerHaptic = () => {
    if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme-color', themeColor);
    root.setAttribute('data-font', fontStyle);
    root.setAttribute('data-text-size', textSize);
  }, [themeColor, fontStyle, textSize]);

  return (
    <PreferencesContext.Provider
      value={{
        themeColor, setThemeColor,
        fontStyle, setFontStyle,
        textSize, setTextSize,
        hapticFeedback, setHapticFeedback,
        triggerHaptic
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
