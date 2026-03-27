import { Task, Project, Routine } from "../types";

const TASKS_KEY = "planner_tasks";
const PROJECTS_KEY = "planner_projects";
const ROUTINES_KEY = "planner_routines";

export function loadTasks(): Task[] {
  const raw = localStorage.getItem(TASKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function loadProjects(): Project[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadRoutines(): Routine[] {
  const raw = localStorage.getItem(ROUTINES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRoutines(routines: Routine[]) {
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}
