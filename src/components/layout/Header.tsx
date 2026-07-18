import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = theme === 'dark' || (!theme && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-paper/80 backdrop-blur-xl border-b border-graphite-hairline">
      <div className="h-full px-8 flex items-center justify-between">
        <h1 className="font-display text-xl font-normal text-ink">
          {title}
        </h1>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-10 pr-4 py-2 text-sm bg-vellum border border-transparent rounded-lg focus:outline-none focus:border-ink focus:bg-paper transition-colors"
            />
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate hover:bg-vellum transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg text-slate hover:bg-vellum transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User avatar */}
          <div className="w-8 h-8 bg-vellum rounded-full flex items-center justify-center">
            <span className="text-ink text-sm">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
