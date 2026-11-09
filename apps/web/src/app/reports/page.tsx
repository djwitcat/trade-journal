"use client";
import { useTranslations } from "next-intl";
import { OptionSelect } from "@/components/ui/option-select";

import { HoverHint } from "@/components/ui/tooltip";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import {
  DIMENSIONS,
  type Dimension,
  type AnalysisFilters,
  type GroupSummary,
} from "@luxalgo/journal-core";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { FilterFields, Field, fieldClass } from "@/components/filter-fields";
import { ReviewExport } from "@/components/review-export";
import { AskJournal } from "@/components/ask-journal";
import { ReportOverview } from "@/components/report-overview";
import { MonetaryValue, usePrivacy } from "@/components/privacy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/lib/use-api";
import { describeFilters } from "@/lib/filter-description";
import { fmtDuration } from "@/lib/utils";
const TradeExplorer = dynamic(
  () => import("@/components/trade-explorer").then((module) => module.TradeExplorer),
  {
    loading: () => <ReportLoading message="tradeExplorer" />,
  },
);
const PerformanceTrendsReport = dynamic(
  () => import("@/components/performance-trends").then((module) => module.PerformanceTrendsReport),
  {
    loading: () => <ReportLoading message="performanceTrends" />,
  },
);

function ReportLoading({ message }: { message: "tradeExplorer" | "performanceTrends" }) {
  const t = useTranslations("extracted");
  return (
    <p role="status" className="py-6 text-sm text-muted-foreground">
      {t(
        message === "tradeExplorer"
          ? "app_reports_page_loading_trade_explorer"
          : "app_reports_page_loading_performance_trends",
      )}
    </p>
  );
}
interface Group extends GroupSummary {
  row: string;
  column: string;
}
interface Analysis {
  accounts: { id: string; name: string }[];
  summary: GroupSummary;
  groups: Group[];
  playbooks: { id: string; name: string }[];
  currencies: string[];
  timeZone: string;
}
const number = (n: number | null) =>
  n === null ? "-" : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const percent = (n: number | null) => (n === null ? "-" : `${(n * 100).toFixed(1)}%`);
const money = (n: number, currency: string) => `${number(n)} ${currency}`;
function Summary({ data }: { data: Analysis }) {
  const t = useTranslations("extracted");
  const s = data.summary;
  return (
    <div className="report-summary">
      <div className="report-summary-grid grid grid-cols-2 gap-4">
        {[
          ["closed", String(s.trades)],
          ["netPnl", money(s.netPnl, data.currencies[0] ?? "USD")],
          ["winRate", percent(s.winRate)],
          ["profitFactor", s.noLosses ? "∞" : number(s.profitFactor)],
          ["volume", number(s.volume)],
          ["holding", fmtDuration(s.avgDurationMs)],
          ["plannedR", number(s.avgPlannedR)],
          ["realizedR", number(s.avgRealizedR)],
        ].map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-muted-foreground">{t(`report_summary_${key}`)}</p>
            <p className="mt-1 break-words text-base font-semibold tabular-nums sm:text-lg">
              {key === "netPnl" ? <MonetaryValue>{value}</MonetaryValue> : value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
function DimensionSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Dimension;
  onChange: (d: Dimension) => void;
}) {
  const t = useTranslations("extracted");
  return (
    <Field label={label}>
      <OptionSelect
        className={fieldClass}
        value={value}
        onValueChange={(next) => onChange(next as Dimension)}
      >
        {Object.keys(DIMENSIONS).map((key) => (
          <option key={key} value={key}>
            {t(`report_dimension_${key}`)}
          </option>
        ))}
      </OptionSelect>
    </Field>
  );
}
const labels = (data: Analysis, key: string) =>
  data.playbooks.find((p) => p.id === key)?.name ?? key;
function GroupLabel({ dimension, children }: { dimension: Dimension; children: string }) {
  return dimension === "entryPrice" || dimension === "exitPrice" ? (
    <MonetaryValue>{children}</MonetaryValue>
  ) : (
    children
  );
}
function Breakdown({
  data,
  cross,
  primary,
  secondary,
}: {
  data: Analysis;
  cross: boolean;
  primary: Dimension;
  secondary: Dimension;
}) {
  const t = useTranslations("extracted");
  const rowLabel = (k: string) => (primary === "playbook" ? labels(data, k) : k),
    colLabel = (k: string) => (secondary === "playbook" ? labels(data, k) : k);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rows = [...new Set(data.groups.map((g) => g.row))],
    columns = [...new Set(data.groups.map((g) => g.column))].sort((a, b) =>
      secondary === "weekday"
        ? weekdays.indexOf(a) - weekdays.indexOf(b)
        : a.localeCompare(b, undefined, { numeric: true }),
    );
  if (primary === "weekday") rows.sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
  const max = data.groups.reduce((max, g) => Math.max(max, Math.abs(g.netPnl)), 1);
  const cells = new Map(data.groups.map((g) => [JSON.stringify([g.row, g.column]), g]));
  return (
    <div className="space-y-4">
      {cross && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-3 text-left">
                  {t(`report_dimension_${primary}`)} / {t(`report_dimension_${secondary}`)}
                </th>
                {columns.map((c) => (
                  <th key={c} className="min-w-24 p-2">
                    <GroupLabel dimension={secondary}>{colLabel(c)}</GroupLabel>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r}>
                  <th className="p-3 text-left font-medium">
                    <GroupLabel dimension={primary}>{rowLabel(r)}</GroupLabel>
                  </th>
                  {columns.map((c) => {
                    const g = cells.get(JSON.stringify([r, c]));
                    return (
                      <HoverHint
                        key={c}
                        content={
                          g
                            ? t("report_cell_hint", { count: g.trades, rate: percent(g.winRate) })
                            : t("report_no_trades")
                        }
                      >
                        <td
                          key={c}
                          className="border border-background p-2 text-center tabular-nums"
                          style={{
                            background: g
                              ? `color-mix(in srgb, ${g.netPnl >= 0 ? "var(--profit-fill)" : "var(--loss)"} ${8 + (Math.abs(g.netPnl) / max) * 35}%, transparent)`
                              : undefined,
                          }}
                          tabIndex={0}
                        >
                          {g ? <MonetaryValue>{number(g.netPnl)}</MonetaryValue> : "-"}
                        </td>
                      </HoverHint>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("app_reports_page_cell_values_are_net_p_l_in_9c8a48")}{" "}
            {data.currencies[0] ?? t("app_reports_page_account_currency_b04660")}.
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              {[
                t(`report_dimension_${primary}`),
                ...(cross ? [t(`report_dimension_${secondary}`)] : []),
                t("report_table_trades"),
                t("report_table_win_rate"),
                t("report_table_net_pnl"),
                t("report_table_volume"),
                t("report_table_planned_r"),
                t("report_table_realized_r"),
                t("report_table_duration"),
              ].map((h) => (
                <th key={h} className="whitespace-nowrap border-b px-3 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.groups.map((g) => (
              <tr
                key={JSON.stringify([g.row, g.column])}
                className="border-b border-border/50 hover:bg-accent/30"
              >
                <td className="px-3 py-3 font-medium">
                  <GroupLabel dimension={primary}>{rowLabel(g.row)}</GroupLabel>
                </td>
                {cross && (
                  <td className="px-3 py-3">
                    <GroupLabel dimension={secondary}>{colLabel(g.column)}</GroupLabel>
                  </td>
                )}
                <td className="px-3">{g.trades}</td>
                <td className="px-3">{percent(g.winRate)}</td>
                <td
                  className={`whitespace-nowrap px-3 tabular-nums ${g.netPnl >= 0 ? "text-profit" : "text-loss"}`}
                >
                  <MonetaryValue>{money(g.netPnl, data.currencies[0] ?? "USD")}</MonetaryValue>
                </td>
                <td className="px-3">{number(g.volume)}</td>
                <td className="px-3">{number(g.avgPlannedR)}</td>
                <td className="px-3">{number(g.avgRealizedR)}</td>
                <td className="whitespace-nowrap px-3">{fmtDuration(g.avgDurationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.groups.length && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("app_reports_page_no_closed_trades_match_these_fil_9bbba2")}
        </p>
      )}
    </div>
  );
}
export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}
function Reports() {
  const t = useTranslations("extracted");
  const { query, values } = useFilters();
  const [mode, setMode] = useState<
      "overview" | "trends" | "explorer" | "breakdown" | "cross" | "compare"
    >("overview"),
    [primary, setPrimary] = useState<Dimension>("symbol"),
    [secondary, setSecondary] = useState<Dimension>("weekday");
  const { data, error, loading } = useApi<Analysis>(
    mode === "breakdown" || mode === "cross"
      ? `/api/analysis?${query}&primary=${primary}${mode === "cross" ? `&secondary=${secondary}` : ""}`
      : null,
  );
  const multi = (data?.currencies.length ?? 0) > 1;
  return (
    <div>
      <FilterBar title={t("app_reports_page_reports_88bc3f")} />
      <div className="space-y-4 p-4">
        <AskJournal />
        <div className="flex flex-wrap items-center gap-2">
          {(["overview", "trends", "explorer", "breakdown", "cross", "compare"] as const).map(
            (key) => (
              <Button
                key={key}
                size="sm"
                variant={mode === key ? "default" : "outline"}
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
              >
                {t(`report_mode_${key}`)}
              </Button>
            ),
          )}
        </div>
        <div key={mode} className="journal-report-section space-y-4" data-report-section={mode}>
          {mode === "overview" ? (
            <ReportOverview query={query} filters={values} />
          ) : mode === "trends" ? (
            <PerformanceTrendsReport key={query} query={query} />
          ) : mode === "explorer" ? (
            <TradeExplorer key={query} query={query} />
          ) : mode === "compare" ? (
            <Comparison key={query} initial={values} />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap gap-3">
                      <DimensionSelect
                        label={t("app_reports_page_group_by_8f0d8d")}
                        value={primary}
                        onChange={setPrimary}
                      />
                      {mode === "cross" && (
                        <DimensionSelect
                          label={t("app_reports_page_then_by_84617c")}
                          value={secondary}
                          onChange={setSecondary}
                        />
                      )}
                    </div>
                    {data && !multi && (
                      <ReviewExport
                        containsFinancialData
                        document={{
                          title:
                            mode === "cross"
                              ? t("report_export_cross_title", {
                                  primary: t(`report_dimension_${primary}`),
                                  secondary: t(`report_dimension_${secondary}`),
                                })
                              : t("report_export_title", {
                                  dimension: t(`report_dimension_${primary}`),
                                }),
                          subtitle: `${data.timeZone} · ${data.currencies[0] ?? t("report_account_currency")}`,
                          lines: [
                            t("report_export_filters", {
                              filters: describeFilters(values, data.accounts, data.playbooks),
                            }),
                            t("report_export_summary", {
                              trades: data.summary.trades,
                              pnl: number(data.summary.netPnl),
                              rate: percent(data.summary.winRate),
                            }),
                            "",
                            ...data.groups.map((g) =>
                              t("report_export_group", {
                                group: `${labels(data, g.row)}${g.column ? ` / ${labels(data, g.column)}` : ""}`,
                                trades: g.trades,
                                pnl: number(g.netPnl),
                                rate: percent(g.winRate),
                                planned: number(g.avgPlannedR),
                                realized: number(g.avgRealizedR),
                                volume: number(g.volume),
                                duration: fmtDuration(g.avgDurationMs),
                              }),
                            ),
                          ],
                        }}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <p role="alert" className="text-destructive">
                      {error}
                    </p>
                  ) : loading ? (
                    <p className="text-sm text-muted-foreground">
                      {t("app_reports_page_loading_report_53284c")}
                    </p>
                  ) : multi ? (
                    <p className="text-sm">
                      {t("app_reports_page_these_accounts_use_different_cur_519298")}
                      {data?.currencies.join(", ")}
                      {t("app_reports_page_select_accounts_with_the_same_cu_cd8aa8")}
                    </p>
                  ) : data ? (
                    <Summary data={data} />
                  ) : null}
                </CardContent>
              </Card>
              {data && !multi && !loading && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {mode === "cross"
                        ? t("report_cross_title", {
                            primary: t(`report_dimension_${primary}`),
                            secondary: t(`report_dimension_${secondary}`),
                          })
                        : t("report_performance_title", {
                            dimension: t(`report_dimension_${primary}`),
                          })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Breakdown
                      data={data}
                      cross={mode === "cross"}
                      primary={primary}
                      secondary={secondary}
                    />
                  </CardContent>
                </Card>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("app_reports_page_closed_trades_only_dates_use_the_4bf0a2")}{" "}
                {data?.timeZone ?? t("app_reports_page_your_journal_timezone_165e83")}
                {t("app_reports_page_volume_is_total_entry_quantity_r_ed43e9")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function Comparison({ initial }: { initial: AnalysisFilters }) {
  const t = useTranslations("extracted");
  const privateMode = usePrivacy();
  const [a, setA] = useState<AnalysisFilters>({ ...initial, direction: "long" }),
    [b, setB] = useState<AnalysisFilters>({ ...initial, direction: "short" }),
    [nameA, setNameA] = useState(() => t("report_long_trades")),
    [nameB, setNameB] = useState(() => t("report_short_trades")),
    [editing, setEditing] = useState<"a" | "b" | null>(null),
    [draft, setDraft] = useState<AnalysisFilters>({});
  const aa = useApi<Analysis>(`/api/analysis?${new URLSearchParams(a).toString()}`),
    bb = useApi<Analysis>(`/api/analysis?${new URLSearchParams(b).toString()}`);
  const currencies = new Set([...(aa.data?.currencies ?? []), ...(bb.data?.currencies ?? [])]),
    multi = currencies.size > 1;
  const metricLines = (name: string, d: Analysis) => [
    name,
    t("report_compare_summary", {
      trades: d.summary.trades,
      pnl: number(d.summary.netPnl),
      currency: d.currencies[0] ?? "",
    }),
    t("report_compare_rates", {
      rate: percent(d.summary.winRate),
      planned: number(d.summary.avgPlannedR),
      realized: number(d.summary.avgRealizedR),
    }),
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("app_reports_page_each_group_has_its_own_filters_c_dc7ad9")}
      </p>
      {multi && (
        <p role="alert" className="rounded-md border p-3 text-sm">
          {t("app_reports_page_select_accounts_with_the_same_cu_750077")}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {(
          [
            { key: "a", name: nameA, setName: setNameA, filters: a, result: aa },
            { key: "b", name: nameB, setName: setNameB, filters: b, result: bb },
          ] as const
        ).map((group) => (
          <Card key={group.key}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  aria-label={`Group ${group.key.toUpperCase()} name`}
                  className={`${fieldClass} min-w-32 flex-1 font-semibold`}
                  value={group.name}
                  onChange={(e) => group.setName(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft({ ...group.filters });
                    setEditing(group.key);
                  }}
                >
                  {t("app_reports_page_edit_filters_1a84a6")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-words">
                {describeFilters(
                  group.filters,
                  group.result.data?.accounts,
                  group.result.data?.playbooks,
                  privateMode,
                )}
              </p>
            </CardHeader>
            <CardContent>
              {group.result.error ? (
                <p role="alert" className="text-destructive">
                  {group.result.error}
                </p>
              ) : group.result.loading ? (
                <p>{t("app_reports_page_loading_33ce41")}</p>
              ) : group.result.data && !multi ? (
                <Summary data={group.result.data} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {aa.data && bb.data && !aa.loading && !bb.loading && !multi && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <p className="text-sm">
              {nameB} {t("app_reports_page_minus_59b653")} {nameA}:{" "}
              <strong>
                <MonetaryValue>
                  {money(
                    bb.data.summary.netPnl - aa.data.summary.netPnl,
                    [...currencies][0] ?? "USD",
                  )}
                </MonetaryValue>
              </strong>{" "}
              {t("app_reports_page_net_p_l_f64579")}{" "}
              {number(bb.data.summary.trades - aa.data.summary.trades)}{" "}
              {t("app_reports_page_trades_cf7b32")}
            </p>
            <ReviewExport
              containsFinancialData
              document={{
                title: `${nameA} vs ${nameB}`,
                lines: [
                  `Group A: ${describeFilters(a, aa.data.accounts, aa.data.playbooks)}`,
                  `Group B: ${describeFilters(b, bb.data.accounts, bb.data.playbooks)}`,
                  "",
                  ...metricLines(nameA, aa.data),
                  "",
                  ...metricLines(nameB, bb.data),
                ],
              }}
            />
          </CardContent>
        </Card>
      )}
      <Dialog
        open={editing !== null}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("app_reports_page_group_171a06")} {editing?.toUpperCase()}{" "}
              {t("app_reports_page_filters_9ce5ff")}
            </DialogTitle>
          </DialogHeader>
          <FilterFields value={draft} onChange={setDraft} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setDraft({})}>
              {t("app_reports_page_clear_719ea3")}
            </Button>
            <Button
              onClick={() => {
                if (editing === "a") setA(draft);
                else setB(draft);
                setEditing(null);
              }}
            >
              {t("app_reports_page_apply_to_group_c38728")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
