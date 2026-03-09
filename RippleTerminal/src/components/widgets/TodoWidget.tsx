"use client";

import { useState, useRef, useMemo } from "react";
import { useTodoData } from "@/hooks/useTodoData";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Circle, CheckCircle2 } from "lucide-react";
import type { Todo } from "@/types/todo";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
};

type Priority = "low" | "medium" | "high";

const PRIORITY_CYCLE: (Priority | undefined)[] = [undefined, "low", "medium", "high"];

export default function TodoWidget() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodoData();
  const [inputValue, setInputValue] = useState("");
  const [inputPriority, setInputPriority] = useState<Priority | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sort: incomplete first (preserve order), completed at the bottom
  const sorted = useMemo(() => {
    const incomplete = todos.filter((t) => !t.completed);
    const completed = todos.filter((t) => t.completed);
    return [...incomplete, ...completed];
  }, [todos]);

  function handleAdd() {
    const text = inputValue.trim();
    if (!text) return;
    addTodo(text, inputPriority);
    setInputValue("");
    setInputPriority(undefined);
    inputRef.current?.focus();
  }

  function cyclePriority() {
    const currentIdx = PRIORITY_CYCLE.indexOf(inputPriority);
    const nextIdx = (currentIdx + 1) % PRIORITY_CYCLE.length;
    setInputPriority(PRIORITY_CYCLE[nextIdx]);
  }

  return (
    <div className="flex flex-col h-full gap-1.5">
      {/* Input area */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Priority toggle button */}
        <button
          onClick={cyclePriority}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[#252833]"
          title={inputPriority ? `Priority: ${PRIORITY_LABELS[inputPriority]}` : "No priority (click to cycle)"}
        >
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: inputPriority ? PRIORITY_COLORS[inputPriority] : "#4A4E5F",
              boxShadow: inputPriority ? `0 0 6px ${PRIORITY_COLORS[inputPriority]}40` : "none",
            }}
          />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a task..."
          className="flex-1 min-w-0 bg-[#1E2130] border border-[#252833] rounded px-2 py-1 text-[10px] text-[#E8EAED] placeholder-[#4A4E5F] outline-none focus:border-[#10B981]/50 transition-colors"
        />

        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[#10B981]/20 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Add task"
        >
          <Plus className="w-3 h-3 text-[#10B981]" />
        </button>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-px">
        <AnimatePresence initial={false}>
          {sorted.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </AnimatePresence>

        {sorted.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] text-[#4A4E5F]">
              No tasks yet. Add one above.
            </span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {todos.length > 0 && (
        <div className="shrink-0 flex items-center justify-between px-0.5 pt-1 border-t border-[#252833]">
          <span className="text-[8px] font-mono text-[#4A4E5F]">
            {todos.filter((t) => !t.completed).length} remaining
          </span>
          <span className="text-[8px] font-mono text-[#4A4E5F]">
            {todos.filter((t) => t.completed).length} done
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Individual todo item ──────────────────────────────────────────────── */

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className={`group flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors widget-accent-hover ${
          todo.completed ? "opacity-40" : ""
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id)}
          className="shrink-0 transition-colors"
          title={todo.completed ? "Mark incomplete" : "Mark complete"}
        >
          {todo.completed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-[#4A4E5F] hover:text-[#8B8FA3]" />
          )}
        </button>

        {/* Text */}
        <span
          className={`flex-1 text-[10px] min-w-0 truncate transition-all ${
            todo.completed
              ? "line-through text-[#5A5E6F]"
              : "text-[#E8EAED]"
          }`}
        >
          {todo.text}
        </span>

        {/* Priority dot */}
        {todo.priority && (
          <div
            className="shrink-0 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: PRIORITY_COLORS[todo.priority],
              boxShadow: `0 0 4px ${PRIORITY_COLORS[todo.priority]}30`,
            }}
            title={`Priority: ${PRIORITY_LABELS[todo.priority]}`}
          />
        )}

        {/* Delete button — visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo.id);
          }}
          className="shrink-0 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#EF4444]/20"
          title="Delete task"
        >
          <X className="w-2.5 h-2.5 text-[#EF4444]" />
        </button>
      </div>
    </motion.div>
  );
}
