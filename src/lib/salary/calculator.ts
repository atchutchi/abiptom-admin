import type {
  Guia2026PolicyConfig,
  ProjectInput,
  SalaryCalculationResult,
  SalaryOverride,
  StaffInput,
} from "./types";
import { calculateGuia2026 } from "./engines/guia-2026";

/**
 * Dispatcher legacy, ainda usado para a política `guia_2026`. A política
 * `actual_2024` tem um motor com assinatura nova (input por objecto) e deve
 * ser chamada directamente via `calculateActual2024` em `engines/actual-2024`.
 */
export function calculateGuia2026Salary(
  policy: Guia2026PolicyConfig,
  projects: ProjectInput[],
  staff: StaffInput[],
  overrides: SalaryOverride[] = []
): SalaryCalculationResult {
  return calculateGuia2026(policy, projects, staff, overrides);
}
