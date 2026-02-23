import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X} from 'lucide-react';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Explore', to: '/explore' },
    { label: 'Leaderboards', to: '/leaderboards' },
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Settings', to: '/settings'},
    { label: 'Tip History', to: '/tips/history' },
    { label: 'Analytics', to: '/analytics' },
  ];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="bg-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <img
              src="/assets/logo.svg"
              alt="TipTune"
              className="h-8 w-auto"
            />
            <span className="text-lg sm:text-xl text-deep-slate font-semibold tracking-tight">
              TipTune
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4 text-sm sm:text-base">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${isActive
                      ? 'bg-deep-slate text-white'
                      : 'text-primary-blue hover:text-white hover:bg-primary-blue'
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-deep-slate hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            onClick={toggleMenu}
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {isOpen && (
          <nav className="md:hidden pb-3 border-t border-gray-100 animate-slide-down">
            <ul className="flex flex-col gap-1 pt-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={closeMenu}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
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

