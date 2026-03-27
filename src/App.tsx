import { useEffect, useMemo, useState } from "react";
import {
  Project,
  Routine,
  Task,
  Workspace,
  WorkspaceFilter,
} from "./types";
import { defaultProjects } from "./data/defaultProjects";
import { formatDate, getMonthGrid, nextMonth, prevMonth } from "./lib/calendar";
import {
  loadProjects,
  loadRoutines,
  loadTasks,
  saveProjects,
  saveRoutines,
  saveTasks,
} from "./lib/storage";

function getTodayString() {
  return formatDate(new Date());
}

function getMonthTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getProjectById(projects: Project[], projectId: string) {
  return projects.find((project) => project.id === projectId);
}

function getProjectsForWorkspace(
  projects: Project[],
  workspace: WorkspaceFilter
) {
  if (workspace === "all") return projects;
  return projects.filter((project) => project.workspace === workspace);
}

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workspaceFilter, setWorkspaceFilter] =
    useState<WorkspaceFilter>("all");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(getTodayString());
  const [newTaskWorkspace, setNewTaskWorkspace] = useState<Workspace>("work");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");

  useEffect(() => {
    const storedTasks = loadTasks();
    const storedProjects = loadProjects();
    const storedRoutines = loadRoutines();

    setTasks(storedTasks);

    if (storedProjects.length > 0) {
      setProjects(storedProjects);
    } else {
      setProjects(defaultProjects);
    }

    if (storedRoutines.length > 0) {
      setRoutines(storedRoutines);
    } else {
      setRoutines([
        {
          id: "routine-glutes",
          title: "Fitness: glutes",
          workspace: "home",
          targetPerWeek: 3,
          completedThisWeek: 0,
        },
        {
          id: "routine-arms",
          title: "Fitness: arms",
          workspace: "home",
          targetPerWeek: 2,
          completedThisWeek: 0,
        },
        {
          id: "routine-abs",
          title: "Fitness: abs",
          workspace: "home",
          targetPerWeek: 2,
          completedThisWeek: 0,
        },
        {
          id: "routine-spanish-read",
          title: "Spanish reading",
          workspace: "study",
          targetPerWeek: 1,
          completedThisWeek: 0,
        },
        {
          id: "routine-spanish-listen",
          title: "Spanish listening",
          workspace: "study",
          targetPerWeek: 1,
          completedThisWeek: 0,
        },
        {
          id: "routine-spanish-video",
          title: "Spanish video",
          workspace: "study",
          targetPerWeek: 1,
          completedThisWeek: 0,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (projects.length > 0) {
      saveProjects(projects);
    }
  }, [projects]);

  useEffect(() => {
    if (routines.length > 0) {
      saveRoutines(routines);
    }
  }, [routines]);

  useEffect(() => {
    const filteredProjects = projects.filter(
      (project) => project.workspace === newTaskWorkspace
    );

    if (filteredProjects.length > 0) {
      setNewTaskProjectId(filteredProjects[0].id);
    } else {
      setNewTaskProjectId("");
    }
  }, [newTaskWorkspace, projects]);

  const monthCells = useMemo(() => {
    return getMonthGrid(currentMonth);
  }, [currentMonth]);

  const visibleTasks = useMemo(() => {
    if (workspaceFilter === "all") return tasks;
    return tasks.filter((task) => task.workspace === workspaceFilter);
  }, [tasks, workspaceFilter]);

  const visibleProjects = useMemo(() => {
    return getProjectsForWorkspace(projects, workspaceFilter);
  }, [projects, workspaceFilter]);

  const visibleRoutines = useMemo(() => {
    if (workspaceFilter === "all") return routines;
    return routines.filter((routine) => routine.workspace === workspaceFilter);
  }, [routines, workspaceFilter]);

  function openTaskModal() {
    setNewTaskTitle("");
    setNewTaskDate(getTodayString());
    setNewTaskWorkspace("work");

    const firstWorkProject = projects.find((project) => project.workspace === "work");
    setNewTaskProjectId(firstWorkProject ? firstWorkProject.id : "");
    setNewTaskPriority("medium");
    setIsTaskModalOpen(true);
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false);
  }

  function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    if (!newTaskDate) return;
    if (!newTaskProjectId) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      date: newTaskDate,
      workspace: newTaskWorkspace,
      projectId: newTaskProjectId,
      done: false,
      priority: newTaskPriority,
      repeat: "none",
    };

    setTasks((prev) => [...prev, newTask]);
    setIsTaskModalOpen(false);
  }

  function toggleTaskDone(taskId: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    );
  }

  function moveTaskByDays(taskId: string, days: number) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const current = new Date(task.date + "T00:00:00");
        current.setDate(current.getDate() + days);

        return {
          ...task,
          date: formatDate(current),
        };
      })
    );
  }

  function incrementRoutine(routineId: string) {
    setRoutines((prev) =>
      prev.map((routine) => {
        if (routine.id !== routineId) return routine;

        const nextValue =
          routine.completedThisWeek < routine.targetPerWeek
            ? routine.completedThisWeek + 1
            : routine.completedThisWeek;

        return {
          ...routine,
          completedThisWeek: nextValue,
        };
      })
    );
  }

  function decrementRoutine(routineId: string) {
    setRoutines((prev) =>
      prev.map((routine) => {
        if (routine.id !== routineId) return routine;

        const nextValue =
          routine.completedThisWeek > 0
            ? routine.completedThisWeek - 1
            : 0;

        return {
          ...routine,
          completedThisWeek: nextValue,
        };
      })
    );
  }

  function getTasksForDay(date: Date) {
    const dateString = formatDate(date);
    return visibleTasks.filter((task) => task.date === dateString);
  }

  function renderPriority(task: Task) {
    if (task.priority === "high") return " !";
    if (task.priority === "medium") return " •";
    return "";
  }

  const workspaceProjectsForModal = projects.filter(
    (project) => project.workspace === newTaskWorkspace
  );

  return (
    <div className="app">
      <div className="topbar">
        <div className="workspace-buttons">
          <button
            className={workspaceFilter === "all" ? "active" : ""}
            onClick={() => setWorkspaceFilter("all")}
          >
            All
          </button>
          <button
            className={workspaceFilter === "work" ? "active" : ""}
            onClick={() => setWorkspaceFilter("work")}
          >
            Nesuda
          </button>
          <button
            className={workspaceFilter === "home" ? "active" : ""}
            onClick={() => setWorkspaceFilter("home")}
          >
            Home
          </button>
          <button
            className={workspaceFilter === "study" ? "active" : ""}
            onClick={() => setWorkspaceFilter("study")}
          >
            Study
          </button>
          <button
            className={workspaceFilter === "promotion" ? "active" : ""}
            onClick={() => setWorkspaceFilter("promotion")}
          >
            Promotion
          </button>
        </div>

        <button onClick={openTaskModal}>Create task</button>
      </div>

      <div className="main">
        <div className="sidebar">
          <div className="routines">
            <h3>Weekly routines</h3>

            {visibleRoutines.length === 0 ? (
              <p>No routines</p>
            ) : (
              visibleRoutines.map((routine) => (
                <div
                  key={routine.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ marginBottom: "6px", fontWeight: 600 }}>
                    {routine.title}
                  </div>

                  <div className="routine">
                    <span>
                      {routine.completedThisWeek} / {routine.targetPerWeek}
                    </span>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => decrementRoutine(routine.id)}>
                        -
                      </button>
                      <button onClick={() => incrementRoutine(routine.id)}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="projects">
            <h3>Projects</h3>

            {visibleProjects.length === 0 ? (
              <p>No projects</p>
            ) : (
              visibleProjects.map((project) => (
                <div
                  key={project.id}
                  className="project"
                  style={{
                    background: project.color,
                    color: "#ffffff",
                  }}
                >
                  {project.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="calendar">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <button onClick={() => setCurrentMonth(prevMonth(currentMonth))}>
              ←
            </button>

            <h2 style={{ margin: 0 }}>{getMonthTitle(currentMonth)}</h2>

            <button onClick={() => setCurrentMonth(nextMonth(currentMonth))}>
              →
            </button>
          </div>

          <div
            className="calendar-grid"
            style={{ marginBottom: "6px", fontWeight: 700 }}
          >
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div className="calendar-grid">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <div key={index} className="day"></div>;
              }

              const dayTasks = getTasksForDay(cell);

              return (
                <div key={formatDate(cell)} className="day">
                  <div className="day-number">{cell.getDate()}</div>

                  {dayTasks.map((task) => {
                    const project = getProjectById(projects, task.projectId);

                    return (
                      <div
                        key={task.id}
                        className={`task ${task.done ? "done" : ""}`}
                        style={{
                          background: project ? project.color : "#cbd5e1",
                          color: "#ffffff",
                        }}
                      >
                        <div>
                          {task.title}
                          {renderPriority(task)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            marginTop: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button onClick={() => toggleTaskDone(task.id)}>
                            {task.done ? "Undo" : "Done"}
                          </button>
                          <button onClick={() => moveTaskByDays(task.id, -1)}>
                            ←
                          </button>
                          <button onClick={() => moveTaskByDays(task.id, 1)}>
                            →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isTaskModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "16px",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Create task</h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <input
                type="text"
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />

              <input
                type="date"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
              />

              <select
                value={newTaskWorkspace}
                onChange={(e) =>
                  setNewTaskWorkspace(e.target.value as Workspace)
                }
              >
                <option value="work">Nesuda</option>
                <option value="home">Home</option>
                <option value="study">Study</option>
                <option value="promotion">Promotion</option>
              </select>

              <select
                value={newTaskProjectId}
                onChange={(e) => setNewTaskProjectId(e.target.value)}
              >
                {workspaceProjectsForModal.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <select
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(
                    e.target.value as "low" | "medium" | "high"
                  )
                }
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <button onClick={closeTaskModal}>Cancel</button>
              <button onClick={handleCreateTask}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
