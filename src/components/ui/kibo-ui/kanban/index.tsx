'use client';

import type {
  Announcements,
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import tunnel from 'tunnel-rat';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const t = tunnel();

export type { DragEndEvent } from '@dnd-kit/core';

type KanbanItemProps = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

type KanbanColumnProps = {
  id: string;
  name: string;
} & Record<string, unknown>;

type KanbanContextProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = {
  columns: C[];
  data: T[];
  activeCardId: string | null;
};

const KanbanContext = createContext<KanbanContextProps>({
  columns: [],
  data: [],
  activeCardId: null,
});

export type KanbanBoardProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      className={cn(
        'flex min-h-40 flex-col overflow-hidden rounded-xl border bg-muted/30 text-xs transition-all',
        isOver ? 'ring-2 ring-primary/50' : 'ring-2 ring-transparent',
        className
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
};

export type KanbanCardProps<T extends KanbanItemProps = KanbanItemProps> = T & {
  children?: ReactNode;
  className?: string;
};

export const KanbanCard = <T extends KanbanItemProps = KanbanItemProps>({
  id,
  name,
  children,
  className,
}: KanbanCardProps<T>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({
    id,
  });
  const { activeCardId } = useContext(KanbanContext) as KanbanContextProps;

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <>
      <div style={style} {...listeners} {...attributes} ref={setNodeRef}>
        <Card
          className={cn(
            'cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-xs transition-shadow hover:shadow-sm',
            isDragging && 'pointer-events-none cursor-grabbing opacity-30',
            className
          )}
        >
          {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
        </Card>
      </div>
      {activeCardId === id && (
        <t.In>
          <Card
            className={cn(
              'cursor-grabbing rounded-lg border bg-card p-3 shadow-sm ring-2 ring-primary/50',
              className
            )}
          >
            {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
          </Card>
        </t.In>
      )}
    </>
  );
};

export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> =
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'id'> & {
    children: (item: T) => ReactNode;
    id: string;
    /** Number of items to load initially */
    initialLoadCount?: number;
    /** Number of items to load when scrolling */
    loadMoreCount?: number;
    /** Max height for the scroll container */
    maxHeight?: string;
  };

// Lazy loading KanbanCards with virtual scrolling behavior
export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  children,
  className,
  initialLoadCount = 15,
  loadMoreCount = 10,
  maxHeight = "calc(100vh - 300px)",
  ...props
}: KanbanCardsProps<T>) => {
  const { data } = useContext(KanbanContext) as KanbanContextProps<T>;
  const filteredData = data.filter((item) => item.column === props.id);

  // Track how many items to show
  const [visibleCount, setVisibleCount] = useState(initialLoadCount);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset visible count when data changes significantly
  useEffect(() => {
    setVisibleCount(Math.min(initialLoadCount, filteredData.length));
  }, [filteredData.length, initialLoadCount]);

  // Items currently visible
  const visibleData = filteredData.slice(0, visibleCount);
  const hasMore = visibleCount < filteredData.length;
  const items = visibleData.map((item) => item.id);

  // Load more items when scrolling to bottom
  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount(prev => Math.min(prev + loadMoreCount, filteredData.length));
    }
  }, [hasMore, loadMoreCount, filteredData.length]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    observer.observe(loader);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden min-h-[120px]",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20",
        "hover:scrollbar-thumb-muted-foreground/40",
        "[&::-webkit-scrollbar]:w-1",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
      )}
      style={{ maxHeight }}
    >
      <SortableContext items={items}>
        <div
          className={cn('flex grow flex-col space-y-2 p-3', className)}
          {...props}
        >
          {visibleData.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground">Aucun prospect</p>
            </div>
          ) : (
            visibleData.map(children)
          )}

          {hasMore && visibleData.length > 0 && (
            <div
              ref={loaderRef}
              className="flex items-center justify-center py-2 text-xs text-muted-foreground"
            >
              <span className="animate-pulse">
                +{filteredData.length - visibleCount} de plus...
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement>;

export const KanbanHeader = ({ className, ...props }: KanbanHeaderProps) => (
  <div className={cn('m-0 flex items-center gap-2 border-b px-4 py-3 font-semibold text-sm', className)} {...props} />
);

export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, 'children'> & {
  children: (column: C) => ReactNode;
  className?: string;
  columns: C[];
  data: T[];
  onDataChange?: (data: T[]) => void;
  /** Called only on drop (dragEnd) — use for persisting changes (API calls). */
  onDragComplete?: (data: T[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
  columns,
  data,
  onDataChange,
  onDragComplete,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = data.find((item) => item.id === event.active.id);
    if (card) {
      setActiveCardId(event.active.id as string);
    }
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeItem = data.find((item) => item.id === active.id);
    const overItem = data.find((item) => item.id === over.id);

    if (!(activeItem)) {
      return;
    }

    const activeColumn = activeItem.column;
    const overColumn =
      overItem?.column ||
      columns.find(col => col.id === over.id)?.id ||
      columns[0]?.id;

    if (activeColumn !== overColumn) {
      let newData = [...data];
      const activeIndex = newData.findIndex((item) => item.id === active.id);
      const overIndex = newData.findIndex((item) => item.id === over.id);

      newData[activeIndex] = { ...newData[activeIndex], column: overColumn };
      newData = arrayMove(newData, activeIndex, overIndex);

      onDataChange?.(newData);
    }

    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);

    onDragEnd?.(event);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      onDragComplete?.(data);
      return;
    }

    const activeItem = data.find((item) => item.id === active.id);
    const overItem = data.find((item) => item.id === over.id);
    const overColumn =
      overItem?.column ||
      columns.find(col => col.id === over.id)?.id ||
      columns[0]?.id;

    let newData = [...data];
    const oldIndex = newData.findIndex((item) => item.id === active.id);

    if (activeItem && activeItem.column !== overColumn) {
      newData[oldIndex] = { ...newData[oldIndex], column: overColumn };
    }

    const newIndex = newData.findIndex((item) => item.id === over.id);
    newData = arrayMove(newData, oldIndex, newIndex);

    onDataChange?.(newData);
    onDragComplete?.(newData);
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = data.find((item) => item.id === active.id) ?? {};

      return `Picked up the card "${name}" from the "${column}" column`;
    },
    onDragOver({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dragged the card "${name}" over the "${newColumn}" column`;
    },
    onDragEnd({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dropped the card "${name}" into the "${newColumn}" column`;
    },
    onDragCancel({ active }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};

      return `Cancelled dragging the card "${name}"`;
    },
  };

  return (
    <KanbanContext.Provider value={{ columns, data, activeCardId }}>
      <DndContext
        accessibility={{ announcements }}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        <div
          className={cn(
            'grid size-full auto-cols-fr grid-flow-col gap-4',
            className
          )}
        >
          {columns.map((column) => children(column))}
        </div>
        {typeof window !== 'undefined' &&
          createPortal(
            <DragOverlay>
              <t.Out />
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </KanbanContext.Provider>
  );
};
