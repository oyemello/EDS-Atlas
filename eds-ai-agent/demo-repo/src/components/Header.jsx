import React from 'react';
import { Link } from '@carbon/react';

// Component with minor Carbon violations

function Header() {
  return (
    <header style={{
      background: '#1a1a1a',  // Close to Carbon but should use background.inverse token
      padding: '0 24px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{
        color: '#ffffff',
        fontWeight: '600',
        fontSize: '14px'
      }}>
        My App
      </div>

      <nav style={{ display: 'flex', gap: '24px' }}>
        {/* Using Carbon Link component - good! */}
        <Link href="/" style={{ color: '#78a9ff' }}>  {/* Should use link.inverse token */}
          Home
        </Link>
        <Link href="/products" style={{ color: '#78a9ff' }}>
          Products
        </Link>
        <Link href="/about" style={{ color: '#78a9ff' }}>
          About
        </Link>
      </nav>

      {/* Custom icon button - should use Carbon HeaderGlobalAction */}
      <button
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '8px'
        }}
        aria-label="User menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="6" r="4" />
          <path d="M2 18c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      </button>
    </header>
  );
}

export default Header;
