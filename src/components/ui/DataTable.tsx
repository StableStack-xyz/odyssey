import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  width?: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No data found',
  emptyIcon,
  page = 1,
  totalPages = 1,
  total,
  limit = 10,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const handleMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const thElement = (e.currentTarget.parentElement as HTMLElement);
    const startWidth = columnWidths[colKey] || thElement?.getBoundingClientRect().width || 120;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    if (sortBy !== column.key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-ash shrink-0" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-ink shrink-0" />
      : <ArrowDown className="w-3.5 h-3.5 text-ink shrink-0" />;
  };

  return (
    <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-graphite-hairline bg-vellum">
              {columns.map((column) => {
                const widthPx = columnWidths[column.key] || column.width;
                const colStyle = widthPx
                  ? { width: `${widthPx}px`, minWidth: `${widthPx}px`, maxWidth: `${widthPx}px` }
                  : undefined;

                return (
                  <th
                    key={column.key}
                    style={colStyle}
                    className={`relative group px-4 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider border-r border-graphite-hairline last:border-r-0 ${
                      column.sortable ? 'cursor-pointer select-none hover:text-ink' : ''
                    } ${column.className || ''}`}
                    onClick={() => column.sortable && onSort?.(column.key)}
                  >
                    <div className="flex items-center justify-between gap-1.5 pr-2 truncate">
                      <span className="truncate">{column.header}</span>
                      {renderSortIcon(column)}
                    </div>
                    {/* Drag-to-Resize Column Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDown(column.key, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-3 -mr-1.5 cursor-col-resize flex items-center justify-center group/resizer z-10"
                      title="Drag to resize column width"
                    >
                      <div className="w-[2px] h-4 bg-slate/30 group-hover/resizer:bg-brand group-hover/resizer:h-full group-hover/resizer:w-[3px] transition-all rounded-full" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite-hairline">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <LoadingSpinner className="mx-auto" />
                  <p className="text-sm text-slate mt-2">Loading...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
                  <p className="text-sm text-slate">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors hover:bg-vellum ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((column) => {
                    const widthPx = columnWidths[column.key] || column.width;
                    const colStyle = widthPx
                      ? { width: `${widthPx}px`, minWidth: `${widthPx}px`, maxWidth: `${widthPx}px` }
                      : undefined;

                    return (
                      <td
                        key={column.key}
                        style={colStyle}
                        className={`px-4 py-4 text-sm text-ink truncate border-r border-graphite-hairline/40 last:border-r-0 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(row, index)
                          : ((row as Record<string, unknown>)[column.key] as ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-graphite-hairline">
          <div className="text-sm text-slate">
            {total !== undefined && (
              <>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results</>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="p-2 rounded-lg text-slate hover:bg-vellum disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg text-slate hover:bg-vellum disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm text-ink">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-slate hover:bg-vellum disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-slate hover:bg-vellum disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
