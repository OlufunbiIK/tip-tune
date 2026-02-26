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
    <header className="bg-white sticky top-0 z-30 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 rounded-md"
            onClick={closeMenu}
            aria-label="TipTune home"
          >
            <img
              src="/assets/logo.svg"
              alt=""
              className="h-8 w-auto"
              aria-hidden="true"
            />
            <span className="text-lg sm:text-xl text-deep-slate font-semibold tracking-tight">
              TipTune
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-4 text-sm sm:text-base"
            aria-label="Main navigation"
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-deep-slate text-white'
                      : 'text-primary-blue hover:text-white hover:bg-primary-blue'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-deep-slate hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {isOpen && (
          <nav
            id="mobile-navigation"
            className="md:hidden pb-3 border-t border-gray-100 animate-slide-down"
            aria-label="Mobile navigation"
          >
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
                      aria-current={isActive ? 'page' : undefined}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 ${
                        isActive
                          ? 'bg-deep-slate text-white'
                          : 'text-deep-slate hover:bg-gray-100'
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
