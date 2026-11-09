"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MIN_TREND_POINTS, type PerformanceTrendsResponse } from "@/lib/performance-trends";
import { useApi } from "@/lib/use-api";
import { fmtPercent } from "@/lib/utils";
import { Pnl } from "./pnl";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const RollingTradeChart = dynamic(
  () => import("./charts/rolling-trade-chart").then((module) => module.RollingTradeChart),
  {
    loading: () => <TrendChartLoading />,
  },
);

function TrendChartLoading() {
  const t = useTranslations("extracted");
  return (
    <div role="status" aria-label={t("components_performance_trends_loading_trend_chart")}>
      <Skeleton className="h-60" />
    </div>
  );
}
const tradeHref = (key: string) => `/trades/${encodeURIComponent(key)}`;

export function PerformanceTrendsReport({ query }: { query: string }) {
  const t = useTranslations("extracted");
  const { data, loading, error, refresh } = useApi<PerformanceTrendsResponse>(
    `/api/performance-trends?${query}`,
  );
  const [tableOpen, setTableOpen] = useState(false);
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        timeZone: data?.timeZone ?? "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [data?.timeZone],
  );
  if (loading)
    return (
      <div
        role="status"
        aria-label={t("components_performance_trends_loading_performance_trends_44af62")}
        className="grid gap-3 md:grid-cols-2"
      >
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  if (error || !data)
    return (
      <div role="alert" className="rounded-xl border p-5">
        <p className="text-sm text-destructive">
          {error ?? t("components_performance_trends_unable_to_load_performance_trend_9a0d94")}
        </p>
        <Button onClick={refresh} variant="outline" size="sm" className="mt-3">
          {t("components_performance_trends_try_again_042c86")}
        </Button>
      </div>
    );
  const { trends, timeZone, currencies } = data;
  const currency = currencies[0] ?? "USD";
  const monetary = currencies.length <= 1;
  const latest = trends.points.at(-1);
  const chartReady = trends.points.length >= MIN_TREND_POINTS;
  return (
    <section
      className="space-y-4"
      aria-labelledby="performance-trends-title"
      data-performance-trends
    >
      <div>
        <h2 id="performance-trends-title" className="text-lg font-semibold">
          {t("components_performance_trends_performance_trends_3ee385")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {trends.count}{" "}
          {t("components_performance_trends_closed_trades_active_account_and_89f72e")} {timeZone}
          {monetary && trends.count > 0 ? ` · ${currency}` : ""}
        </p>
      </div>
      {trends.count === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="font-medium">
              {t("components_performance_trends_no_closed_trades_in_this_selecti_5f97a6")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("components_performance_trends_change_the_date_range_or_filters_447666")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {!monetary && (
            <p
              role="note"
              className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground"
            >
              {t("components_performance_trends_these_trades_use_different_curre_c6b83c")}
              {currencies.join(", ")}
              {t("components_performance_trends_win_rate_is_available_select_acc_d21f0e")}
            </p>
          )}
          <div className={`grid items-start gap-3 ${monetary ? "lg:grid-cols-2" : ""}`}>
            {(["winRate", ...(monetary ? ["avgNetPnl" as const] : [])] as const).map((metric) => {
              const rate = metric === "winRate";
              const reference = rate ? trends.overallWinRate! : trends.overallAvgNetPnl!;
              return (
                <Card key={metric} className="min-w-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle>
                      {rate
                        ? t("components_performance_trends_win_rate_trend_e97727")
                        : t("components_performance_trends_average_trade_p_l_trend_717ac8")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("components_performance_trends_last_20_closed_trades_at_each_po_a3dc5a")}
                      {rate
                        ? t("components_performance_trends_breakevens_included_19a19b")
                        : t("components_performance_trends_after_fees_3c0231")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("components_performance_trends_latest_full_window_4f849d")}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {latest ? (
                            rate ? (
                              fmtPercent(latest.winRate, 1)
                            ) : (
                              <Pnl value={latest.avgNetPnl} currency={currency} />
                            )
                          ) : (
                            "—"
                          )}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>
                          {t("components_performance_trends_selected_period_e12be8")}{" "}
                          {rate
                            ? t("components_performance_trends_win_rate_0a2b79")
                            : t("components_performance_trends_average_93a801")}
                        </p>
                        <p className="mt-1 text-sm tabular-nums">
                          {rate ? (
                            fmtPercent(reference, 1)
                          ) : (
                            <Pnl value={reference} currency={currency} />
                          )}
                        </p>
                      </div>
                    </div>
                    {chartReady ? (
                      <>
                        <RollingTradeChart
                          data={trends.points}
                          metric={metric}
                          reference={reference}
                          currency={currency}
                          timeZone={timeZone}
                        />
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "components_performance_trends_closed_trade_sequence_dashed_lin_d29de8",
                          )}{" "}
                          {rate
                            ? t("components_performance_trends_win_rate_0a2b79")
                            : t("components_performance_trends_average_93a801")}
                        </p>
                      </>
                    ) : (
                      <div className="rounded-lg bg-muted/30 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
                        {!latest
                          ? t("trend_more_trades_needed", { count: 20 - trends.count })
                          : t("trend_latest_window_available")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {monetary && (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>
                  {t("components_performance_trends_largest_winning_and_losing_trade_de11ff")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("components_performance_trends_individual_closed_trades_after_f_49798e")}
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["winner", trends.largestWin],
                    ["loser", trends.largestLoss],
                  ] as const
                ).map(([label, trade]) => (
                  <div key={label} className="min-w-0 rounded-lg border p-4">
                    <h3 className="text-xs text-muted-foreground">
                      {label === "winner" ? t("trend_largest_winner") : t("trend_largest_loser")}
                    </h3>
                    {trade ? (
                      <>
                        <p className="mt-2 text-xl font-semibold">
                          <Pnl value={trade.netPnl} currency={currency} />
                        </p>
                        <Link
                          href={tradeHref(trade.key)}
                          className="mt-2 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded text-sm underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-current"
                        >
                          <span className="break-all font-medium">
                            {trade.symbol} · {trade.direction}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dateFormat.format(new Date(trade.closedAt))} ↗
                          </span>
                        </Link>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t("components_performance_trends_no_816c52")}{" "}
                        {label === "winner"
                          ? t("components_performance_trends_winning_5de860")
                          : t("components_performance_trends_losing_816db0")}{" "}
                        {t("components_performance_trends_trades_in_this_selection_c9a815")}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {latest && (
            <details
              className="rounded-xl border bg-card"
              onToggle={(event) => setTableOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium">
                {t("components_performance_trends_explore_window_values_and_trades_fd5577")}
              </summary>
              {tableOpen && (
                <div className="max-h-72 overflow-auto px-4 pb-4">
                  <table className="w-full text-left text-xs">
                    <caption className="pb-3 text-left text-muted-foreground">
                      {t("components_performance_trends_each_row_covers_20_trades_ending_7bf0c8")}{" "}
                      {timeZone}.
                    </caption>
                    <thead>
                      <tr className="border-b">
                        <th scope="col" className="py-2 pr-3">
                          {t("components_performance_trends_window_closing_trade_2c6c3c")}
                        </th>
                        <th scope="col" className="px-2 text-right">
                          {t("components_performance_trends_win_rate_79bcb3")}
                        </th>
                        {monetary && (
                          <th scope="col" className="pl-2 text-right">
                            {t("components_performance_trends_avg_net_p_l_aadfc9")}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {trends.points.map((point) => (
                        <tr key={point.key} className="border-b last:border-0">
                          <th scope="row" className="py-3 pr-3 font-normal">
                            <Link
                              className="rounded underline underline-offset-4"
                              href={tradeHref(point.key)}
                            >
                              #{point.sequence - 19}–{point.sequence}
                              <span className="mt-1 block text-muted-foreground">
                                {dateFormat.format(new Date(point.closedAt))}
                              </span>
                            </Link>
                          </th>
                          <td className="px-2 text-right tabular-nums">
                            {fmtPercent(point.winRate, 1)}
                          </td>
                          {monetary && (
                            <td className="pl-2 text-right">
                              <Pnl value={point.avgNetPnl} currency={currency} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("components_performance_trends_only_trades_within_your_selectio_7408c0")}
          </p>
        </>
      )}
    </section>
  );
}
