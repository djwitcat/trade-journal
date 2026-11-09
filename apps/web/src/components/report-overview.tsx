"use client";

import { useTranslations } from "next-intl";
import type { AnalysisFilters, BucketStats } from "@luxalgo/journal-core";
import { TimeHeatmap } from "./charts/time-heatmap";
import { ReviewExport } from "./review-export";
import { MonetaryValue } from "./privacy";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useApi } from "@/lib/use-api";
import { fmtMoney, fmtPercent, pnlClass } from "@/lib/utils";
import { describeFilters } from "@/lib/filter-description";

interface OverviewData {
  buckets: Record<
    "symbol" | "tag" | "mistake" | "playbook" | "weekday" | "hour" | "duration" | "direction",
    BucketStats[]
  >;
  currencies: string[];
  timeZone: string;
  accounts: { id: string; name: string }[];
  playbooks: { id: string; name: string }[];
}

// Keep the original overview's aggregations and ordering alongside the advanced reports.
const SECTIONS = [
  { key: "symbol" },
  { key: "direction" },
  { key: "weekday" },
  { key: "duration" },
  { key: "tag" },
  { key: "mistake" },
  { key: "playbook" },
] as const;

export function ReportOverview({ query, filters }: { query: string; filters: AnalysisFilters }) {
  const t = useTranslations("extracted");
  const { data, error, loading } = useApi<OverviewData>(`/api/stats?${query}`);
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  if (loading || !data) return <Skeleton className="h-72" />;
  if (data.currencies.length > 1)
    return (
      <p className="rounded-lg border p-4 text-sm">
        {t("components_report_overview_these_accounts_use_different_cur_519298")}
        {data.currencies.join(", ")}
        {t("components_report_overview_select_accounts_with_the_same_cu_cd8aa8")}
      </p>
    );
  const currency = data.currencies[0] ?? "USD";
  const label = (dimension: string, key: string) =>
    dimension === "playbook" ? (data.playbooks.find((book) => book.id === key)?.name ?? key) : key;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("components_report_overview_trading_overview_3b56d2")} {data.timeZone} · {currency}
        </p>
        <ReviewExport
          containsFinancialData
          document={{
            title: t("report_overview_export_title"),
            subtitle: `${data.timeZone} · ${currency}`,
            lines: [
              t("report_export_filters", {
                filters: describeFilters(filters, data.accounts, data.playbooks),
              }),
              "",
              t("report_overview_trade_time"),
              ...data.buckets.hour.map((b) =>
                t("report_overview_hour_line", {
                  hour: b.key,
                  trades: b.trades,
                  pnl: fmtMoney(b.netPnl, currency),
                }),
              ),
              ...SECTIONS.flatMap((section) => [
                "",
                t(`report_overview_section_${section.key}`),
                ...data.buckets[section.key].map((b) =>
                  t("report_overview_bucket_line", {
                    label: label(section.key, b.key),
                    trades: b.trades,
                    rate: fmtPercent(b.winRate, 0),
                    pnl: fmtMoney(b.netPnl, currency),
                  }),
                ),
              ]),
            ],
          }}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("components_report_overview_trade_time_performance_9485a8")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeHeatmap hours={data.buckets.hour} currency={currency} />
          </CardContent>
        </Card>
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle>{t(`report_overview_section_${section.key}`)}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.buckets[section.key].length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {section.key === "tag" || section.key === "mistake" || section.key === "playbook"
                    ? t("components_report_overview_annotate_trades_to_unlock_this_b_c8f40c")
                    : t("components_report_overview_no_data_yet_3b0b47")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(`report_overview_section_${section.key}`)}</TableHead>
                      <TableHead className="text-right">
                        {t("components_report_overview_trades_597b10")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("components_report_overview_win_a7c9d3")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("components_report_overview_net_p_l_152aa9")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.buckets[section.key].map((bucket) => (
                      <TableRow key={bucket.key}>
                        <TableCell className="font-medium">
                          {label(section.key, bucket.key)}
                        </TableCell>
                        <TableCell className="tnum text-right text-muted-foreground">
                          {bucket.trades}
                        </TableCell>
                        <TableCell className="tnum text-right">
                          {fmtPercent(bucket.winRate, 0)}
                        </TableCell>
                        <TableCell className={`tnum text-right ${pnlClass(bucket.netPnl)}`}>
                          <MonetaryValue>{fmtMoney(bucket.netPnl, currency)}</MonetaryValue>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("components_report_overview_weekday_and_hour_use_trade_openi_ce1f56")}
      </p>
    </div>
  );
}
