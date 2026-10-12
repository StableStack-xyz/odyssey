import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  moduleName?: string;
}

export function AccessDenied({
  title = 'Access Restricted',
  message,
  moduleName,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-paper border border-graphite-hairline rounded-2xl p-8 text-center shadow-xl-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="font-display text-xl font-semibold text-ink mb-2">
          {title}
        </h2>

        <p className="text-xs text-slate mb-6 leading-relaxed">
          {message || (
            <>
              You do not have permission to access {moduleName ? <span className="font-semibold text-ink">{moduleName}</span> : 'this feature'}.
              Only administrators with full access or explicit permissions for this module can view and manage these records.
            </>
          )}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate({ to: '..' })}
            className="btn-secondary flex items-center gap-2 text-xs py-2 px-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Back
          </button>
          <Link
            to="/"
            className="btn-primary flex items-center gap-2 text-xs py-2 px-4 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
