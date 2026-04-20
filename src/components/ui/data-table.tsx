"use client";

import {
  forwardRef,
  useMemo,
  useRef,
  type ForwardedRef,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  flexRender,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type RowEventHandler<TData> = (
  row: Row<TData>,
  event: MouseEvent<HTMLTableRowElement>
) => void;

export interface DataTableLayoutProps<TData> {
  table: TanstackTable<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  tableContainerClassName?: string;
  maxTableHeightClassName?: string;
  virtualized?: boolean;
  estimateRowHeight?: number;
  overscan?: number;
  rowClassName?: (row: Row<TData>) => string | undefined;
  onRowClick?: RowEventHandler<TData>;
  disabledRowClick?: (row: Row<TData>) => boolean;
  /** "design2" applies rounded-xl border bg-card shadow-xs, thead bg-muted/40, row hover/selected styles */
  variant?: "default" | "design2";
}

const DEFAULT_ESTIMATE_SIZE = 68;
const DEFAULT_OVERSCAN = 10;

function DataTableComponent<TData>(
  {
    table,
    isLoading = false,
    emptyMessage = "Aucun résultat.",
    toolbar,
    footer,
    className,
    tableContainerClassName,
    maxTableHeightClassName,
    virtualized = false,
    estimateRowHeight = DEFAULT_ESTIMATE_SIZE,
    overscan = DEFAULT_OVERSCAN,
    rowClassName,
    onRowClick,
    disabledRowClick,
    variant = "default",
  }: DataTableLayoutProps<TData>,
  ref: ForwardedRef<HTMLDivElement>
) {
  const isDesign2 = variant === "design2";
  const effectiveRowClassName = useMemo(() => {
    if (isDesign2) {
      return (row: Row<TData>) =>
        cn(
          row.getIsSelected() ? "bg-primary/5" : "hover:bg-muted/30",
          rowClassName?.(row)
        );
    }
    return rowClassName;
  }, [isDesign2, rowClassName]);
  const rows = table.getRowModel().rows;
  const visibleColumns = useMemo(
    () => table.getVisibleLeafColumns(),
    [table]
  );

  const scrollRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: virtualized ? rows.length : 0,
      getScrollElement: () => scrollRef.current,
      estimateSize: () => estimateRowHeight,
      overscan,
      enabled: virtualized,
    });

    const virtualItems = virtualizer.getVirtualItems();
    const paddingTop =
      virtualItems.length > 0 ? virtualItems[0]?.start ?? 0 : 0;
    const paddingBottom =
      virtualItems.length > 0
        ? virtualizer.getTotalSize() -
          (virtualItems[virtualItems.length - 1]?.end ?? 0)
        : 0;

    const showEmptyState = !isLoading && rows.length === 0;

    const renderRow = (row: Row<TData>) => {
      const disabledClick = disabledRowClick?.(row) ?? false;
      return (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() && "selected"}
          className={cn(effectiveRowClassName?.(row))}
          onClick={
            disabledClick
              ? undefined
              : (event) => {
                  // Ignore clicks on interactive children
                  const target = event.target as HTMLElement;
                  const interactive = target.closest(
                    "button, [role='button'], a, input, label, textarea, [role='checkbox'], [role='menuitem']"
                  );
                  if (!interactive) {
                    onRowClick?.(row, event);
                  }
                }
          }
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      );
    };

    const renderVirtualizedRows = () => (
      <>
        {paddingTop > 0 && (
          <TableRow style={{ height: paddingTop }}>
            <TableCell colSpan={visibleColumns.length} />
          </TableRow>
        )}
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <TableRow
              key={row.id}
              data-index={virtualRow.index}
              data-state={row.getIsSelected() && "selected"}
              className={cn(effectiveRowClassName?.(row))}
              style={{ height: `${virtualRow.size}px` }}
              onClick={(event) => {
                const disabledClick = disabledRowClick?.(row) ?? false;
                if (disabledClick) {
                  return;
                }

                const target = event.target as HTMLElement;
                const interactive = target.closest(
                  "button, [role='button'], a, input, label, textarea, [role='checkbox'], [role='menuitem']"
                );
                if (!interactive) {
                  onRowClick?.(row, event);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
        {paddingBottom > 0 && (
          <TableRow style={{ height: paddingBottom }}>
            <TableCell colSpan={visibleColumns.length} />
          </TableRow>
        )}
      </>
    );

    const renderStandardRows = () => rows.map((row) => renderRow(row));

    return (
      <div
        ref={ref}
        className={cn("flex w-full min-w-0 max-w-full flex-col gap-4", className)}
      >
        {toolbar}

        <div
          className={cn(
            "relative min-w-0 overflow-clip",
            isDesign2 ? "rounded-xl border bg-card shadow-xs" : "rounded-md border"
          )}
        >
          <div
            ref={scrollRef}
            className={cn(
              "w-full min-w-0 overflow-y-auto overflow-x-auto",
              maxTableHeightClassName,
              tableContainerClassName
            )}
          >
            <Table
              className={cn(
                "min-w-full",
                isDesign2 && "[&_td]:px-4 [&_td]:py-3"
              )}
            >
              <TableHeader
                className={cn(
                  "sticky top-0 z-30",
                  isDesign2 ? "bg-muted/40 border-b-2 border-border" : "bg-background border-b border-border"
                )}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b-0">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "sticky top-0 z-30 px-4 py-3",
                            isDesign2 ? "bg-muted/40" : "bg-background"
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {isLoading && rows.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell colSpan={visibleColumns.length}>
                        <Skeleton className="h-12 w-full rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : showEmptyState ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : virtualized ? (
                  renderVirtualizedRows()
                ) : (
                  renderStandardRows()
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {footer}
      </div>
    );
  }

export const DataTableLayout = forwardRef(DataTableComponent) as <TData>(
  props: DataTableLayoutProps<TData> & { ref?: Ref<HTMLDivElement> }
) => ReturnType<typeof DataTableComponent>;


