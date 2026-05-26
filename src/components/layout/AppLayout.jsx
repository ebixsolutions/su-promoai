import React from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutProvider, useLayout } from '@/lib/LayoutContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function AppShell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f6f8' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, padding: 24, background: '#ffffff', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <LanguageProvider>
      <LayoutProvider>
        <AppShell />
      </LayoutProvider>
    </LanguageProvider>
  );
}