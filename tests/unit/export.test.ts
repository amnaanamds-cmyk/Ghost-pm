import { describe, expect, it } from "vitest";
import { csvCell, tasksToCsv, tasksToMarkdown } from "@/lib/export";

const task = (over = {}) => ({
  title: "Fix login",
  why: 'Users see "500"',
  priority: "P0",
  status: "todo",
  assignee: "bea",
  githubIssueUrl: null,
  agentPrompt: null,
  createdAt: new Date("2026-01-02T03:04:05Z"),
  ...over,
});

describe("csvCell", () => {
  it("quotes and escapes double quotes", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("neutralizes spreadsheet formulas", () => {
    for (const evil of ["=HYPERLINK(1)", "+1", "-1", "@SUM(A1)"]) expect(csvCell(evil).startsWith(`"'`)).toBe(true);
  });
  it("renders null as empty", () => {
    expect(csvCell(null)).toBe('""');
  });
});

describe("tasksToCsv", () => {
  it("has a header and one CRLF row per task", () => {
    const csv = tasksToCsv([task(), task({ title: "Second" })]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Title","Why","Priority"');
    expect(lines[1]).toContain('"Users see ""500"""');
  });
});

describe("tasksToMarkdown", () => {
  it("groups by status with checkboxes", () => {
    const md = tasksToMarkdown("App", [task(), task({ title: "Shipped", status: "done" })]);
    expect(md).toContain("## To do");
    expect(md).toContain("- [ ] **P0** Fix login _(@bea)_");
    expect(md).toContain("- [x] **P0** Shipped");
  });
});
