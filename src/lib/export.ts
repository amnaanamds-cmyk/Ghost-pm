type ExportTask = {
  title: string;
  why: string;
  priority: string;
  status: string;
  assignee: string | null;
  githubIssueUrl: string | null;
  agentPrompt: string | null;
  createdAt: Date;
};

/** CSV cell: quoted, with formula-injection protection for spreadsheet apps. */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function tasksToCsv(tasks: ExportTask[]): string {
  const header = ["Title", "Why", "Priority", "Status", "Assignee", "GitHub issue", "Created", "Agent prompt"];
  const rows = tasks.map((t) =>
    [t.title, t.why, t.priority, t.status, t.assignee, t.githubIssueUrl, t.createdAt.toISOString(), t.agentPrompt]
      .map(csvCell)
      .join(",")
  );
  return [header.map(csvCell).join(","), ...rows].join("\r\n") + "\r\n";
}

const STATUS_TITLES: Record<string, string> = { todo: "To do", doing: "Doing", done: "Done" };

export function tasksToMarkdown(projectName: string, tasks: ExportTask[]): string {
  const out = [`# ${projectName} — tasks`, "", `_Exported ${new Date().toISOString().slice(0, 10)} from Ghost PM_`, ""];
  for (const status of ["todo", "doing", "done"]) {
    const group = tasks.filter((t) => t.status === status);
    if (!group.length) continue;
    out.push(`## ${STATUS_TITLES[status]}`, "");
    for (const t of group) {
      out.push(`- [${status === "done" ? "x" : " "}] **${t.priority}** ${t.title}${t.assignee ? ` _(@${t.assignee})_` : ""}`);
      if (t.why) out.push(`  - ${t.why}`);
      if (t.githubIssueUrl) out.push(`  - ${t.githubIssueUrl}`);
    }
    out.push("");
  }
  return out.join("\n");
}
