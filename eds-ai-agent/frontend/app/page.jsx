'use client';

import ChatInterface from './components/ChatInterface';

export default function Home() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatInterface />
      </div>
    </div>
  );
}
