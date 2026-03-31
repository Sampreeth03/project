import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    return (
        <button
            type="button"
            className="global-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
        >
            <span className="global-theme-toggle__icon" aria-hidden="true">
                {theme === 'dark' ? '☀' : '🌙'}
            </span>
            <span className="global-theme-toggle__label">
                {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
        </button>
    );
};

export default ThemeToggle;
