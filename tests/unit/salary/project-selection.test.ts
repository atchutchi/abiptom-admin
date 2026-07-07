import { describe, expect, it } from "vitest";
import { buildSalaryProjectEntries } from "@/lib/salary/project-selection";

describe("buildSalaryProjectEntries", () => {
  it("comeca sem projectos visiveis antes de carregar facturas pagas", () => {
    expect(
      buildSalaryProjectEntries({
        projects: [{ id: "p1" }, { id: "p2" }],
        importedEntries: [],
        mode: "paid-invoices",
      }),
    ).toEqual([]);
  });

  it("mostra apenas projectos com pagamentos no mes importado", () => {
    expect(
      buildSalaryProjectEntries({
        projects: [{ id: "p1" }, { id: "p2" }],
        importedEntries: [{ projectId: "p2", valorRecebido: 150000 }],
        mode: "paid-invoices",
      }),
    ).toEqual([
      {
        projectId: "p2",
        included: true,
        valorLiquido: "150000",
      },
    ]);
  });
});
