import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";

type Priority = "low" | "medium" | "high";
type Workspace = "clinic" | "family" | "study";
type Project = {
  id: string;
  name: string;
  workspace: Workspace;
  color: string;
};

type RepeatRule = "none" | "daily" | "weekly" | "monthly";

type Task = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  projectId: string;
  workspace: Workspace;
  done: boolean;
  priority: Priority;
  repeat: RepeatRule;
};

const projects: Project[] = [
  { id: "nesuda", name: "Nesuda", workspace: "clinic", color: "bg-emerald-100 border-emerald-300" },
  { id: "amani", name: "Amani", workspace: "clinic", color: "bg-sky-100 border-sky-300" },
  { id: "kids", name: "Children", workspace: "family", color: "bg-rose-100 border-rose-300" },
  { id: "ielts", name: "IELTS", workspace: "study", color: "bg-amber-100 border-amber-300" },
];

const seedTasks: Task[] = [
  {
    id: "1",
    title: "Check NSSF",
    date: todayISO(),
    projectId: "nesuda",
    workspace: "clinic",
    done: false,
    priority: "high",
    repeat: "none",
  },
  {
    id: "2",
    title: "NICU round",
    date: todayISO(),
    projectId: "amani",
    workspace: "clinic",
    done: true,
    priority: "medium",
    repeat: "weekly",
  },
  {
    id: "3",
    title: "Spanish 10 min",
    date: todayISO(),
    projectId: "ielts",
    workspace: "study",
    done: false,
    priority: "low",
    repeat: "daily",
  },
];

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function padMonthGrid(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const firstDay = (start.getDay() + 6) % 7; // Monday first
  const totalDays = end.getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function projectById(id: string) {
  return projects.find((p) => p.id === id)!;
}

export default function PlannerMVP() {
  const [month, setMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [workspaceFilter, setWorkspaceFilter] = useState<Workspace | "all">("all");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState(projects[0].id);
  const [priority, setPriority] = useState<Priority>("medium");
  const [repeat, setRepeat] = useState<RepeatRule>("none");

  const cells = useMemo(() => padMonthGrid(month), [month]);

  const filteredTasks = useMemo(() => {
    return workspaceFilter === "all"
      ? tasks
      : tasks.filter((t) => t.workspace === workspaceFilter);
  }, [tasks, workspaceFilter]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const arr = map.get(task.date) ?? [];
      arr.push(task);
      map.set(task.date, arr);
    }
    return map;
  }, [filteredTasks]);

  function addTask() {
    if (!title.trim()) return;
    const project = projectById(projectId);
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      projectId,
      workspace: project.workspace,
      done: false,
      priority,
      repeat,
    };
    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
  }

  function toggleDone(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  }

  function moveTask(taskId: string, direction: -1 | 1) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const base = new Date(`${t.date}T00:00:00`);
        base.setDate(base.getDate() + direction);
        return { ...t, date: formatISO(base) };
      })
    );
  }

  function nextMonth(delta: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Planner MVP</h1>
            <p className="text-sm text-slate-600">
              Calendar by day, project colors, recurring flag, done state, moving tasks, and priority mark.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => nextMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-40 text-center text-sm font-medium">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="icon" onClick={() => nextMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">New task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.workspace}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatRule)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={addTask}>
                <Plus className="mr-2 h-4 w-4" /> Add task
              </Button>

              <div className="pt-2">
                <p className="mb-2 text-sm font-medium">Workspace filter</p>
                <div className="flex flex-wrap gap-2">
                  {(["all", "clinic", "family", "study"] as const).map((w) => (
                    <Button
                      key={w}
                      variant={workspaceFilter === w ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWorkspaceFilter(w)}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-7 gap-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2 text-center text-sm font-medium text-slate-500">
                {d}
              </div>
            ))}

            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={idx} className="min-h-36 rounded-2xl border border-dashed border-slate-200 bg-white/50" />;
              }

              const iso = formatISO(cell);
              const dayTasks = tasksByDate.get(iso) ?? [];

              return (
                <Card key={iso} className="min-h-36 rounded-2xl shadow-sm">
                  <CardContent className="space-y-2 p-3">
                    <div className="text-sm font-semibold">{cell.getDate()}</div>
                    {dayTasks.length === 0 ? (
                      <div className="text-xs text-slate-400">No tasks</div>
                    ) : (
                      dayTasks.map((task) => {
                        const project = projectById(task.projectId);
                        return (
                          <div
                            key={task.id}
                            className={`rounded-xl border p-2 transition ${project.color} ${task.done ? "opacity-45" : "opacity-100"}`}
                          >
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <Checkbox checked={task.done} onCheckedChange={() => toggleDone(task.id)} />
                                <div>
                                  <div className={`text-sm ${task.done ? "line-through" : ""}`}>{task.title}</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    <Badge variant="secondary">{project.name}</Badge>
                                    {task.repeat !== "none" && <Badge variant="outline">{task.repeat}</Badge>}
                                  </div>
                                </div>
                              </div>
                              {task.priority === "high" && <AlertTriangle className="mt-0.5 h-4 w-4" />}
                            </div>
                            <div className="flex gap-1 pt-1">
                              <Button variant="outline" size="sm" onClick={() => moveTask(task.id, -1)}>
                                ←
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => moveTask(task.id, 1)}>
                                →
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
