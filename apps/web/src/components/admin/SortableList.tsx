import { DndContext, type DragEndEvent, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export function SortableRow({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="admin-sortable"
    >
      <button type="button" className="admin-grip" {...attributes} {...listeners} aria-label="Drag to sort">
        <GripVertical size={16} />
      </button>
      <div className="admin-sortable__content">{children}</div>
    </div>
  );
}

export function SortableList({
  items,
  onReorder,
  children,
}: {
  items: string[];
  onReorder(next: string[]): void;
  children: (id: string, index: number) => ReactNode;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="admin-sortable-list">
          {items.map((id, index) => children(id, index))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
