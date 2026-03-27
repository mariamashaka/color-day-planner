export type Workspace = "work" | "home" | "study" | "promotion";

export type WorkspaceFilter = Workspace | "all";

export type Priority = "low" | "medium" | "high";

export type RepeatRule = "none" | "daily" | "weekly" | "monthly";

export type Project = {
  id: string;
  name: string;
  workspace: Workspace;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  workspace: Workspace;
  projectId: string;
  done: boolean;
  priority: Priority;
  repeat: RepeatRule;
};

export type Routine = {
  id: string;
  title: string;
  workspace: Workspace;
  targetPerWeek: number;
  completedThisWeek: number;
};
