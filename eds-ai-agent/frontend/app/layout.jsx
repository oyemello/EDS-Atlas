'use client';

import './globals.scss';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Theme
} from '@carbon/react';
import {
  Analytics,
  Code,
  ColorPalette,
  Home,
  Moon,
  Sun,
  Add
} from '@carbon/icons-react';
import { useState } from 'react';
import { clearChatHistory } from '../lib/api';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/designer', label: 'Designer', icon: ColorPalette },
    { href: '/engineer', label: 'Engineer', icon: Code },
    { href: '/dashboard', label: 'Dashboard', icon: Analytics },
  ];

  return (
    <html lang="en" data-theme={isDarkMode ? 'dark' : 'light'}>
      <head>
        <title>EDS Atlas - AI Design System Inspector</title>
        <meta name="description" content="AI-powered Carbon Design System compliance analysis" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Theme theme={isDarkMode ? 'g100' : 'white'}>
          <Header aria-label="EDS Atlas">
            <HeaderName href="/" prefix="">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#0f62fe" strokeWidth="2" />
                  <circle cx="12" cy="12" r="6" fill="#0f62fe" />
                  <circle cx="12" cy="12" r="3" fill="white" />
                </svg>
                EDS Atlas
              </span>
            </HeaderName>
            <HeaderNavigation aria-label="Main navigation">
              {navItems.map(({ href, label }) => (
                <HeaderMenuItem
                  key={href}
                  href={href}
                  isCurrentPage={pathname === href}
                  element={Link}
                >
                  {label}
                </HeaderMenuItem>
              ))}
            </HeaderNavigation>
            <HeaderGlobalBar>
              <HeaderGlobalAction
                aria-label="New Session"
                onClick={async () => {
                  if (confirm('Start a new session? This will clear the current chat history.')) {
                    await clearChatHistory();
                    window.location.reload();
                  }
                }}
              >
                <Add size={20} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </HeaderGlobalAction>
            </HeaderGlobalBar>
          </Header>
          <main className="eds-main" style={pathname === '/' ? { height: '100vh', overflow: 'hidden' } : undefined}>
            {children}
          </main>
        </Theme>
      </body>
    </html>
  );
}
