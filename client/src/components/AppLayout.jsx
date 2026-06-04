import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// ─── Hook: track pointer position as CSS custom properties ───────────────────
function usePointerCSSVars() {
  useEffect(() => {
    const handleMouseMove = ({ clientX, clientY }) => {
      const root = document.documentElement.style;
      root.setProperty('--pointer-x', `${clientX}px`);
      root.setProperty('--pointer-y', `${clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
}

// ─── Hook: sidebar open/close state ─────────────────────────────────────────
function useSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close };
}

// ─── Sub-component: overlay behind sidebar ───────────────────────────────────
function ShellOverlay({ onClick }) {
  return (
    <div
      className="shell-overlay"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
const AppLayout = ({ children }) => {
  usePointerCSSVars();
  const sidebar = useSidebar();

  const handleMainClick = () => {
    if (sidebar.isOpen) sidebar.close();
  };

  return (
    <div className={`app-shell${sidebar.isOpen ? ' sidebar-open' : ''}`}>
      <Sidebar isOpen={sidebar.isOpen} onClose={sidebar.close} />
      <Topbar onOpenSidebar={sidebar.open} />

      <main className="main-content" onClick={handleMainClick}>
        {children}
      </main>

      {sidebar.isOpen && <ShellOverlay onClick={sidebar.close} />}
    </div>
  );
};

export default AppLayout;