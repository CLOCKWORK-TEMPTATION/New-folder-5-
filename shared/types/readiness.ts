export interface ProjectReadinessStatus {
  projectName: string;
  status: "ready" | "blocked" | "warning";
  checks: Record<string, boolean>;
  blockers: string[];
  lastChecked: string;
}

export interface BuildReadinessReport {
  reportId: string;
  timestamp: string;
  projects: ProjectReadinessStatus[];
  overallStatus: "ready" | "blocked";
  blockers: string[];
  recommendations: string[];
}

