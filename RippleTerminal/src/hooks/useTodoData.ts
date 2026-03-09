"use client";

import { useState, useEffect, useCallback } from "react";
import type { Todo } from "@/types/todo";

const STORAGE_KEY = "ripple-terminal-todos";

function loadTodos(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveTodos(todos: Todo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {}
}

export function useTodoData() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    setTodos(loadTodos());
    setLoading(false);
  }, []);

  // Persist whenever todos change (skip initial empty state)
  useEffect(() => {
    if (!loading) {
      saveTodos(todos);
    }
  }, [todos, loading]);

  const addTodo = useCallback(
    (text: string, priority?: "low" | "medium" | "high") => {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        priority,
      };
      setTodos((prev) => [newTodo, ...prev]);
    },
    []
  );

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reorderTodo = useCallback(
    (fromIndex: number, toIndex: number) => {
      setTodos((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    []
  );

  return { todos, loading, addTodo, toggleTodo, deleteTodo, reorderTodo };
}
