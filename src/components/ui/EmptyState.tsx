import type { ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="p-3 bg-gray-100 dark:bg-dark-input rounded-full mb-4">
          <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
