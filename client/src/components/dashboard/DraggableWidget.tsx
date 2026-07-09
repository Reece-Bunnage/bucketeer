import { useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  id: string;
  dragging: string | null;
  setDragging: (id: string | null) => void;
  /** Called with this widget's id when another widget is dropped onto it. */
  onDropOn: (targetId: string) => void;
  className?: string;
  children: ReactNode;
}

/**
 * Native HTML5 drag-and-drop wrapper for dashboard widgets. Dragging only
 * arms from the grip handle (shown on hover) so chart tooltips and text
 * selection inside the widget keep working normally.
 */
export function DraggableWidget({ id, dragging, setDragging, onDropOn, className, children }: DraggableWidgetProps) {
  const [armed, setArmed] = useState(false);
  const [over, setOver] = useState(false);

  return (
    <div
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        setDragging(id);
      }}
      onDragEnd={() => {
        setDragging(null);
        setArmed(false);
      }}
      onDragOver={(e) => {
        if (!dragging || dragging === id) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropOn(id);
      }}
      className={cn(
        'group/widget relative rounded-lg transition-shadow',
        over && 'ring-2 ring-primary',
        dragging === id && 'opacity-50',
        className
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder this widget"
        title="Drag to reorder"
        onMouseDown={() => setArmed(true)}
        onMouseUp={() => setArmed(false)}
        className="absolute -left-1 top-3 z-10 cursor-grab rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/widget:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
