type ProjectRef = {
  id: string;
};

type ImportedProjectEntry = {
  projectId: string;
  valorRecebido: number;
};

type BuildSalaryProjectEntriesInput = {
  projects: ProjectRef[];
  importedEntries: ImportedProjectEntry[];
  mode: "paid-invoices";
};

export type SalaryProjectEntry = {
  projectId: string;
  included: boolean;
  valorLiquido: string;
};

export function buildSalaryProjectEntries({
  projects,
  importedEntries,
}: BuildSalaryProjectEntriesInput): SalaryProjectEntry[] {
  const knownProjectIds = new Set(projects.map((project) => project.id));

  return importedEntries
    .filter((entry) => knownProjectIds.has(entry.projectId))
    .map((entry) => ({
      projectId: entry.projectId,
      included: true,
      valorLiquido: String(entry.valorRecebido),
    }));
}
