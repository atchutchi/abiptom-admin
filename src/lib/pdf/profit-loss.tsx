import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ProfitLossReport } from "@/lib/reports/actions";

const BRAND_GREEN = "#2D6A4F";
const DARK = "#1A1A1A";
const GRAY = "#666666";
const LIGHT_GRAY = "#F5F5F5";
const BORDER = "#DDDDDD";
const RED = "#B91C1C";

const MES_LABELS = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  aluguer: "Aluguer",
  servicos_publicos: "Serviços (Água/Luz/Internet)",
  material_escritorio: "Material de escritório",
  deslocacoes: "Deslocações",
  marketing: "Marketing",
  formacao: "Formação",
  software_licencas: "Software / Licenças",
  manutencao: "Manutenção",
  impostos_taxas: "Impostos / Taxas",
  outros: "Outros",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  logo: { width: 120, height: 50, objectFit: "contain" },
  titleBox: { alignItems: "flex-end" },
  titleLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: BRAND_GREEN,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  periodLabel: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 2,
  },
  policyLabel: { fontSize: 8.5, color: GRAY, marginTop: 4 },
  separator: {
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND_GREEN,
    marginBottom: 14,
  },
  companyBlock: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  companyDetail: { fontSize: 8.5, color: GRAY, lineHeight: 1.5 },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    padding: 8,
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 3,
  },
  kpiSub: { fontSize: 7.5, color: GRAY, marginTop: 2 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    backgroundColor: LIGHT_GRAY,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_GREEN,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: "#FAFAFA" },
  tableCell: { fontSize: 8.5, color: DARK },
  colDesc: { flex: 1 },
  colValue: { width: 100, textAlign: "right" },
  colPct: { width: 50, textAlign: "right" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  summaryLabel: { fontSize: 9, color: DARK },
  summaryValue: { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold" },
  redValue: { fontSize: 9, color: RED, fontFamily: "Helvetica-Bold" },
  resultSection: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  resultFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND_GREEN,
  },
  resultFinalNeg: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: RED,
  },
  resultLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  resultValue: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  resultFinalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  resultFinalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: GRAY },
});

function formatNum(n: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function ProfitLossPDF({
  report,
  generatedAt,
  title = "Relatório Mensal (P&L)",
  periodLabelOverride,
}: {
  report: ProfitLossReport;
  generatedAt: string;
  title?: string;
  periodLabelOverride?: string;
}) {
  const { ano, mes, receitas, despesas, salarios, dividendos, resultado } =
    report;
  const periodLabel = periodLabelOverride ?? `${MES_LABELS[mes]} ${ano}`;

  const categoriasOrdenadas = Object.entries(despesas.porCategoria).sort(
    (a, b) => b[1] - a[1]
  );

  const totalCategorias = categoriasOrdenadas.reduce((s, [, v]) => s + v, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src="/brand/abiptom-logo.png" style={styles.logo} />
          <View style={styles.titleBox}>
            <Text style={styles.titleLabel}>{title}</Text>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            <Text style={styles.policyLabel}>
              Emitido em {formatDate(generatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.companyBlock}>
          <Text style={styles.sectionLabel}>Empresa</Text>
          <Text style={styles.companyName}>ABIPTOM SARL</Text>
          <Text style={styles.companyDetail}>
            NIF: 510148077 · Bissau, Guiné-Bissau
          </Text>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Facturado</Text>
            <Text style={styles.kpiValue}>{formatNum(receitas.facturado)}</Text>
            <Text style={styles.kpiSub}>
              {receitas.facturasCount} factura(s)
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Recebido</Text>
            <Text style={styles.kpiValue}>{formatNum(receitas.recebido)}</Text>
            <Text style={styles.kpiSub}>
              {receitas.pagamentosCount} pagamento(s)
            </Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Despesas</Text>
            <Text style={styles.kpiValue}>{formatNum(despesas.total)}</Text>
            <Text style={styles.kpiSub}>{despesas.count} movimento(s)</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Folha Bruta</Text>
            <Text style={styles.kpiValue}>
              {formatNum(salarios.totalFolha)}
            </Text>
            <Text style={styles.kpiSub}>{salarios.estado ?? "—"}</Text>
          </View>
        </View>

        {categoriasOrdenadas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Despesas por categoria</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>
                Categoria
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colValue]}>
                Valor (XOF)
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colPct]}>%</Text>
            </View>
            {categoriasOrdenadas.map(([cat, valor], i) => {
              const pct = totalCategorias > 0 ? (valor / totalCategorias) * 100 : 0;
              return (
                <View
                  key={cat}
                  style={[
                    styles.tableRow,
                    i % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colDesc]}>
                    {EXPENSE_CATEGORY_LABEL[cat] ?? cat}
                  </Text>
                  <Text style={[styles.tableCell, styles.colValue]}>
                    {formatNum(valor)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colPct]}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Salários e dividendos</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total bruto da folha</Text>
          <Text style={styles.summaryValue}>
            {formatNum(salarios.totalBruto)} XOF
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total líquido pago</Text>
          <Text style={styles.summaryValue}>
            {formatNum(salarios.totalLiquido)} XOF
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Dividendos distribuídos</Text>
          <Text style={styles.summaryValue}>
            {formatNum(dividendos.totalDistribuido)} XOF
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Dividendos pagos no mês</Text>
          <Text style={styles.summaryValue}>
            {formatNum(dividendos.pagoNoMes)} XOF
          </Text>
        </View>

        <View style={styles.resultSection}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Margem bruta (facturado − despesas)
            </Text>
            <Text
              style={resultado.margemBruta >= 0 ? styles.resultValue : styles.redValue}
            >
              {formatNum(resultado.margemBruta)} XOF
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>
              Margem líquida (margem bruta − folha)
            </Text>
            <Text
              style={
                resultado.margemLiquida >= 0 ? styles.resultValue : styles.redValue
              }
            >
              {formatNum(resultado.margemLiquida)} XOF
            </Text>
          </View>
          <View
            style={
              resultado.cashflow >= 0 ? styles.resultFinal : styles.resultFinalNeg
            }
          >
            <Text style={styles.resultFinalLabel}>
              Cash-flow (recebido − despesas − líquido − divid. pagos)
            </Text>
            <Text style={styles.resultFinalValue}>
              {formatNum(resultado.cashflow)} XOF
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ABIPTOM SARL · NIF 510148077
          </Text>
          <Text style={styles.footerText}>
            Documento gerado automaticamente · {formatDate(generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
