import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import WalletBalanceWidget from '../wallet/WalletBalanceWidget';
import ThemeToggle from '../ThemeToggle';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Explore', to: '/explore' },
    { label: 'Leaderboards', to: '/leaderboards' },
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Settings', to: '/settings' },
    { label: 'Tip History', to: '/tips/history' },
    { label: 'Analytics', to: '/analytics' },
    { label: 'Live Mode', to: '/live-performance' },
  ];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-30 border-b border-app bg-surface/95 shadow-sm backdrop-blur theme-transition">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <img src="/assets/logo.svg" alt="TipTune" className="h-8 w-auto" />
            <span className="text-app text-lg font-semibold tracking-tight sm:text-xl">
              TipTune
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-4 text-sm sm:text-base md:flex">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                      isActive
                        ? 'bg-primary-blue text-white'
                        : 'text-app hover:bg-primary-blue hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <ThemeToggle compact className="hidden md:block" />

            <div className="hidden md:block">
              <WalletBalanceWidget />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-app hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary-blue md:hidden"
              onClick={toggleMenu}
              aria-label="Toggle navigation"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <nav className="animate-slide-down border-t border-app pb-3 md:hidden">
            <ul className="flex flex-col gap-1 pt-3">
              <li className="px-3 py-2">
                <ThemeToggle compact />
              </li>
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={closeMenu}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-blue text-white'
                          : 'text-app hover:bg-surface-muted'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
