import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'w-screen h-screen max-w-none max-h-none rounded-none m-0',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFull = size === 'full';

  return (
    <div
      ref={overlayRef}
      className={`modal-overlay open fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${isFull ? 'p-0' : ''}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`modal-content ${sizeClasses[size]} ${
          isFull
            ? 'w-full h-full flex flex-col bg-paper rounded-none shadow-2xl overflow-hidden'
            : 'w-full mx-4 max-h-[calc(100vh-2rem)] overflow-y-auto bg-paper rounded-xl shadow-xl'
        }`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-graphite-hairline sticky top-0 bg-paper z-10 shrink-0">
            <h2 className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate hover:text-ink hover:bg-vellum transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={`p-6 ${isFull ? 'flex-1 overflow-y-auto' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
