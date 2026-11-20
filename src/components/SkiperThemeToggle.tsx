'use client';

import React, { useCallback, useEffect, useState } from 'react';

export function SkiperThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setIsDark(currentTheme !== 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    const nextDark = !isDark;
    setIsDark(nextDark);

    const styleId = 'theme-transition-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      ::view-transition-group(root) {
        animation-duration: 0.75s;
        animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
      }
      ::view-transition-new(root) {
        animation-name: reveal-theme-expand;
      }
      ::view-transition-old(root) {
        animation: none;
        z-index: -1;
      }
      @keyframes reveal-theme-expand {
        from {
          clip-path: circle(0% at 50% 50%);
        }
        to {
          clip-path: circle(150% at 50% 50%);
        }
      }
    `;

    const switchTheme = () => {
      const mode = nextDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem('domino-sky-theme', mode);
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  }, [isDark]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={toggleTheme}
        className="focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] active:scale-95 disabled:opacity-50"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid var(--color-rule-2)',
          background: 'var(--color-paper-3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'transform 0.2s ease',
        }}
        aria-label="Toggle dark and light theme"
      >
        <svg
          viewBox="0 0 240 240"
          style={{
            width: '20px',
            height: '20px',
            transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.5s ease',
          }}
          aria-hidden="true"
        >
          <g>
            <path
              d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5"
              fill={isDark ? '#ffffff' : '#0c0d0e'}
            />
            <path
              d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5"
              fill="var(--color-accent)"
            />
          </g>
          <path
            d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
            fill={isDark ? '#ffffff' : '#0c0d0e'}
          />
        </svg>
      </button>
      <span className="mono" style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
        {isDark ? 'Dark' : 'Light'}
      </span>
    </div>
  );
}

