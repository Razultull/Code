export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO date
  priority?: "low" | "medium" | "high";
}
