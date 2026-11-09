"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense, useState } from "react";
import type {
  CalendarMonth,
  DayStats,
  EdgeScore,
  EquityPoint,
  TradeMetrics,
} from "@luxalgo/journal-core";
import { dayKeyOf, relativeDrawdownCurve } from "@luxalgo/journal-core";
import { CurrencyNotice } from "@/components/currency-notice";
import type { CurrencyScope } from "@/lib/currencies";
import { CalendarPnl } from "@/components/calendar-pnl";
import { DailyBars } from "@/components/charts/daily-bars";
import { EdgeRadar } from "@/components/charts/edge-radar";
import { EquityArea } from "@/components/charts/equity-area";
import { Gauge } from "@/components/charts/gauge";
import { RelativeDrawdownBars } from "@/components/charts/relative-drawdown-bars";
import { TimeHeatmap } from "@/components/charts/time-heatmap";
import {
  ArrowUpDown,
  CalendarCheck2,
  CircleDollarSign,
  Flame,
  Scale,
  Sigma,
  Target,
  Timer,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { AddTradeDialog } from "@/components/add-trade-dialog";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MonetaryValue } from "@/components/privacy";
import { Pnl } from "@/components/pnl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpHint, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { postJson, useApi } from "@/lib/use-api";
import type { CalendarPnlPoint } from "@/lib/calendar-insights";
import { cn, fmtDuration, fmtMoney, fmtNumber, fmtPercent } from "@/lib/utils";

interface Bucket {
  key: string;
  trades: number;
  netPnl: number;
  winRate: number | null;
}

interface StatsPayload {
  timeZone: string;
  metrics: TradeMetrics | null;
  currencyScope: CurrencyScope;
  currencyGroups: { currency: string; metrics: TradeMetrics }[];
  initialBalance: number;
  edgeScore: EdgeScore | null;
  days: DayStats[];
  dailyCumulative: EquityPoint[];
  calendar: CalendarMonth;
  calendarCurrencies: string[];
  runningPnl: Record<string, CalendarPnlPoint[]>;
  buckets: Record<"symbol" | "weekday" | "hour" | "duration" | "direction", Bucket[]>;
  openPositions: {
    key: string;
    symbol: string;
    direction: string;
    openedAt: string;
    quantity: number;
    avgEntry: number;
    currency: string;
  }[];
  recentTrades: {
    key: string;
    symbol: string;
    closedAt: string;
    netPnl: number;
    currency: string;
    status: string;
  }[];
}

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const t = useTranslations("extracted");
  const { query } = useFilters();
  const { data, loading, error, refresh } = useApi<StatsPayload>(`/api/stats?${query}`);

  return (
    <>
      <FilterBar
        title={t("app_page_dashboard_d87f47")}
        actions={<AddTradeDialog onSaved={refresh} />}
      />
      <DashboardContent
        data={data}
        loading={loading}
        error={error}
        refresh={refresh}
        query={query}
      />
    </>
  );
}

function DashboardContent({
  data,
  loading,
  error,
  refresh,
  query,
}: {
  data: StatsPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  query: string;
}) {
  const t = useTranslations("extracted");
  if (loading && !data) return <DashboardSkeleton />;
  if (!data)
    return (
      <div>
        <div className="space-y-3 p-4">
          <p role="alert" className="text-sm text-destructive">
            {error ?? t("app_page_could_not_load_the_dashboard_e4b0da")}
          </p>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
            onClick={refresh}
          >
            {t("app_page_try_again_042c86")}
          </button>
        </div>
      </div>
    );
  if (!data.currencyScope.monetary) {
    const closed = data.currencyGroups.reduce((sum, group) => sum + group.metrics.closedTrades, 0);
    const wins = data.currencyGroups.reduce((sum, group) => sum + group.metrics.wins, 0);
    return (
      <>
        <CurrencyNotice scope={data.currencyScope} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("app_page_all_accounts_6a19f2")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {closed} {t("app_page_closed_trades_f88312")}{" "}
              {closed ? fmtPercent(wins / closed) : "–"} {t("app_page_trade_win_rate_9a0e00")}
            </CardContent>
          </Card>
          {data.currencyGroups.map((group) => (
            <Card key={group.currency}>
              <CardHeader>
                <CardTitle>
                  {group.currency} {t("app_page_accounts_10db27")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Pnl
                  value={group.metrics.netPnl}
                  currency={group.currency}
                  className="text-2xl font-semibold"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.metrics.closedTrades} {t("app_page_closed_trades_f88312")}{" "}
                  {fmtPercent(group.metrics.winRate)} {t("app_page_trade_win_rate_9a0e00")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }
  const { metrics: m, edgeScore } = data;
  if (!m || !edgeScore) return null;
  const currency = data.currencyScope.currency ?? "USD";

  if (m.totalTrades === 0)
    return query ? (
      <div>
        <p className="p-12 text-center text-sm text-muted-foreground">
          {t("app_page_no_trades_match_these_filters_cl_41e573")}
        </p>
      </div>
    ) : (
      <EmptyState />
    );

  // Momentum: net P&L of the last 7 calendar days vs the 7 before them.
  // Hidden when either window has no trading days (e.g. the 7D range).
  const weekDelta = (() => {
    const now = Date.now();
    let last = 0;
    let prior = 0;
    let lastDays = 0;
    let priorDays = 0;
    for (const day of data.days) {
      const ageDays = (now - Date.parse(`${day.date}T00:00:00Z`)) / 86_400_000;
      if (ageDays <= 7) {
        last += day.netPnl;
        lastDays++;
      } else if (ageDays <= 14) {
        prior += day.netPnl;
        priorDays++;
      }
    }
    return lastDays > 0 && priorDays > 0 ? last - prior : null;
  })();
  const bestDay = data.days.length
    ? data.days.reduce((a, b) => (b.netPnl > a.netPnl ? b : a))
    : null;
  const worstDay = data.days.length
    ? data.days.reduce((a, b) => (b.netPnl < a.netPnl ? b : a))
    : null;

  return (
    <>
      <CurrencyNotice scope={data.currencyScope} />
      <DashboardLayout
        widgets={[
          {
            id: "widget-0",
            label: t("app_page_net_p_l_152aa9"),
            size: "small",
            layoutGroup: "summary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_net_p_l_152aa9")}
                  icon={CircleDollarSign}
                  hint={t("app_page_realized_profit_and_loss_net_of__1cd20a")}
                />
                <CardContent>
                  <Pnl
                    value={m.netPnl}
                    currency={currency}
                    className="text-3xl font-semibold tracking-tight"
                  />
                  {weekDelta !== null && (
                    <div
                      className={cn(
                        "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        weekDelta >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss",
                      )}
                    >
                      {weekDelta >= 0 ? "▲" : "▼"}{" "}
                      <MonetaryValue>
                        {fmtMoney(Math.abs(weekDelta), currency).replace("+", "")}
                      </MonetaryValue>{" "}
                      {t("app_page_vs_prior_7d_f8894b")}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.closedTrades} {t("app_page_closed_trades_f88312")}{" "}
                    <MonetaryValue>{fmtMoney(m.fees, currency)}</MonetaryValue>{" "}
                    {t("app_page_fees_44de56")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-1",
            label: t("app_page_trade_win_328ebd"),
            size: "small",
            layoutGroup: "summary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_trade_win_328ebd")}
                  icon={Target}
                  hint={t("app_page_winning_trades_divided_by_all_cl_6ec1b3")}
                />
                <CardContent className="flex items-center justify-between gap-2">
                  <Gauge value={m.winRate} label={t("app_page_trade_win_rate_6d44e6")} />
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <div>
                      {m.wins} {t("app_page_w_e2415c")}
                    </div>
                    <div>
                      {m.breakevens} {t("app_page_be_3472ff")}
                    </div>
                    <div>
                      {m.losses} {t("app_page_l_d160e0")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-2",
            label: t("app_page_profit_factor_80e53e"),
            size: "small",
            layoutGroup: "summary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_profit_factor_80e53e")}
                  icon={Scale}
                  hint={t("app_page_gross_profit_gross_loss_above_1__888899")}
                />
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight tnum">
                    {m.profitFactorIsInfinite
                      ? "∞"
                      : m.profitFactor === null
                        ? "–"
                        : fmtNumber(m.profitFactor)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("app_page_gross_profit_gross_loss_30d00d")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-3",
            label: t("app_page_day_win_4c7186"),
            size: "small",
            layoutGroup: "summary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_day_win_4c7186")}
                  icon={CalendarCheck2}
                  hint={t("app_page_green_trading_days_all_trading_d_14e9de")}
                />
                <CardContent className="flex items-center justify-between gap-2">
                  <Gauge value={m.dayWinRate} label={t("app_page_day_win_rate_ba24f7")} />
                  <div className="text-xs text-muted-foreground">
                    {m.tradingDays} {t("app_page_days_5548ae")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-4",
            label: t("app_page_avg_win_loss_5de6a5"),
            size: "small",
            layoutGroup: "summary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_avg_win_loss_5de6a5")}
                  icon={ArrowUpDown}
                  hint={t("app_page_average_winning_trade_average_lo_05d57e")}
                />
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight tnum">
                    {m.avgWinLossRatio === null ? "–" : fmtNumber(m.avgWinLossRatio)}
                  </div>
                  {m.avgWin !== null && m.avgLoss !== null && m.avgWin + m.avgLoss > 0 && (
                    <div
                      className="journal-progress-visual mt-2 flex h-1.5 gap-0.5"
                      role="img"
                      aria-label={t("app_page_average_win_vs_average_loss_to_s_ad23b8")}
                    >
                      <span
                        className="rounded-full bg-profit"
                        style={{
                          width: `${((m.avgWin / (m.avgWin + m.avgLoss)) * 100).toFixed(1)}%`,
                        }}
                      />
                      <span className="flex-1 rounded-full bg-loss" />
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="text-profit">
                      {m.avgWin === null ? (
                        "–"
                      ) : (
                        <MonetaryValue>{fmtMoney(m.avgWin, currency)}</MonetaryValue>
                      )}
                    </span>
                    {t("app_page_avg_win_210e76")}
                    <span className="text-loss">
                      {m.avgLoss === null ? (
                        "–"
                      ) : (
                        <MonetaryValue>{fmtMoney(-m.avgLoss, currency)}</MonetaryValue>
                      )}
                    </span>
                    {t("app_page_avg_loss_b16384")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-5",
            label: t("app_page_edge_score_6a4344"),
            size: "medium",
            layoutGroup: "visuals",
            content: (
              <Card className="dashboard-visual-card h-full">
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1">
                    <CardTitle>{t("app_page_edge_score_6a4344")}</CardTitle>
                    <HelpHint heading={t("app_page_edge_score_6a4344")}>
                      {t("app_page_a_0_100_score_combining_win_rate_d9b104")}
                    </HelpHint>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight tnum">
                    {edgeScore.score === null ? (
                      "–"
                    ) : (
                      <span className="text-brand">{edgeScore.score}</span>
                    )}
                    <span className="text-xs text-muted-foreground"> /100</span>
                  </span>
                </CardHeader>
                <CardContent className="dashboard-visual-card-content">
                  {edgeScore.score === null ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("app_page_needs_5_closed_trades_the_formul_eed26b")}{" "}
                      <a
                        className="underline"
                        href="https://github.com/LuxAlgo/trade-journal/blob/main/docs/edge-score.md"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("app_page_read_it_eebcf6")}
                      </a>
                      .
                    </p>
                  ) : (
                    <EdgeRadar components={edgeScore.components} height="100%" />
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-6",
            label: t("app_page_cumulative_p_l_4ac64f"),
            size: "medium",
            layoutGroup: "visuals",
            content: (
              <Card className="dashboard-visual-card h-full">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t("app_page_daily_net_cumulative_p_l_b3e4f5")}</CardTitle>
                  <HelpHint heading={t("app_page_cumulative_p_l_4ac64f")}>
                    {t("app_page_running_total_of_net_profit_and__d5f564")}
                  </HelpHint>
                </CardHeader>
                <CardContent>
                  <EquityArea
                    currency={currency}
                    data={data.dailyCumulative.map((p) => ({ t: p.t, cumNetPnl: p.cumNetPnl }))}
                  />
                  <RelativeDrawdownBars
                    data={relativeDrawdownCurve(data.dailyCumulative, data.initialBalance)}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-7",
            label: t("app_page_daily_p_l_8cfaf5"),
            size: "medium",
            layoutGroup: "visuals",
            content: (
              <Card className="dashboard-visual-card h-full">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t("app_page_net_daily_p_l_ec7807")}</CardTitle>
                  <HelpHint heading={t("app_page_daily_p_l_8cfaf5")}>
                    {t("app_page_net_profit_or_loss_for_each_trad_e80808")}
                  </HelpHint>
                </CardHeader>
                <CardContent className="dashboard-visual-card-content">
                  <DailyBars
                    currency={currency}
                    data={data.days.map((d) => ({ date: d.date, netPnl: d.netPnl }))}
                    height="100%"
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-8",
            label: t("app_page_calendar_adab50"),
            size: "wide",
            layoutGroup: "detail",
            content: (
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>
                    {new Date(Date.UTC(data.calendar.year, data.calendar.month - 1)).toLocaleString(
                      "en-US",
                      { month: "long", year: "numeric", timeZone: "UTC" },
                    )}
                  </CardTitle>
                  <Link
                    href={`/calendar?${query}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {t("app_page_full_calendar_e35521")}
                  </Link>
                </CardHeader>
                <CardContent>
                  <CalendarPnl
                    calendar={data.calendar}
                    runningPnl={data.runningPnl}
                    currency={data.calendarCurrencies[0] ?? "USD"}
                    monetary={data.calendarCurrencies.length <= 1}
                  />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-9",
            label: t("app_page_activity_81c0d9"),
            size: "medium",
            layoutGroup: "detail",
            content: (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{t("app_page_activity_81c0d9")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="recent">
                    <TabsList className="h-8">
                      <TabsTrigger value="recent" className="text-xs">
                        {t("app_page_recent_trades_87d593")}
                      </TabsTrigger>
                      <TabsTrigger value="open" className="text-xs">
                        {t("app_page_open_positions_4de966")}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="recent" className="space-y-1">
                      {data.recentTrades.length === 0 && (
                        <Empty label={t("app_page_no_closed_trades_yet_ccaafb")} />
                      )}
                      {data.recentTrades.map((trade) => (
                        <Link
                          key={trade.key}
                          href={`/trades/${encodeURIComponent(trade.key)}?${query}`}
                          className="dashboard-activity-row flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/60"
                        >
                          <span className="flex items-center gap-2">
                            <Badge
                              variant={
                                trade.status === "win"
                                  ? "profit"
                                  : trade.status === "loss"
                                    ? "loss"
                                    : "secondary"
                              }
                            >
                              {trade.status.toUpperCase()}
                            </Badge>
                            {trade.symbol}
                          </span>
                          <span className="dashboard-activity-detail flex items-center">
                            <span className="text-xs text-muted-foreground">
                              {trade.closedAt && dayKeyOf(trade.closedAt, data.timeZone)}
                            </span>
                            <Pnl value={trade.netPnl} currency={trade.currency} />
                          </span>
                        </Link>
                      ))}
                    </TabsContent>
                    <TabsContent value="open" className="space-y-1">
                      {data.openPositions.length === 0 && (
                        <Empty label={t("app_page_flat_no_open_positions_82b18b")} />
                      )}
                      {data.openPositions.map((position) => (
                        <div
                          key={position.key}
                          className="dashboard-activity-row flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary">{position.direction.toUpperCase()}</Badge>
                            {position.symbol}
                          </span>
                          <span className="tnum text-xs text-muted-foreground">
                            {fmtNumber(position.quantity, 4)} @{" "}
                            <MonetaryValue>
                              {fmtNumber(position.avgEntry)} {position.currency}
                            </MonetaryValue>
                          </span>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-10",
            label: t("app_page_max_drawdown_3904fd"),
            size: "small",
            layoutGroup: "secondary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_max_drawdown_3904fd")}
                  icon={TrendingDown}
                  hint={t("app_page_largest_peak_to_trough_drop_of_t_3fef39")}
                />
                <CardContent>
                  <div className="text-xl font-semibold tnum text-loss">
                    <MonetaryValue>{fmtMoney(-m.maxDrawdown, currency)}</MonetaryValue>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.maxDrawdownPct === null
                      ? t("app_page_set_an_initial_balance_for_e84d9b")
                      : fmtPercent(m.maxDrawdownPct)}
                    {m.recoveryFactor !== null && ` · recovery ${fmtNumber(m.recoveryFactor)}x`}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-11",
            label: t("app_page_streaks_0de6ad"),
            size: "small",
            layoutGroup: "secondary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_streaks_0de6ad")}
                  icon={Flame}
                  hint={t("app_page_current_run_of_consecutive_wins__ac2bc8")}
                />
                <CardContent>
                  <div className="text-xl font-semibold tnum">
                    {m.currentStreak > 0
                      ? `${m.currentStreak}W`
                      : m.currentStreak < 0
                        ? `${-m.currentStreak}L`
                        : "–"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("app_page_best_c5f5e4")} {m.maxWinStreak}
                    {t("app_page_w_worst_0a8410")} {m.maxLossStreak}
                    {t("app_page_l_d160e0")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-12",
            label: t("app_page_expectancy_trade_314fa5"),
            size: "small",
            layoutGroup: "secondary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_expectancy_trade_314fa5")}
                  icon={Sigma}
                  hint={t("app_page_average_net_p_l_per_closed_trade_4e8b6f")}
                />
                <CardContent>
                  {m.expectancy === null ? (
                    "–"
                  ) : (
                    <Pnl
                      value={m.expectancy}
                      currency={currency}
                      className="text-xl font-semibold"
                    />
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.avgRealizedR !== null && m.tradesWithRisk > 0
                      ? t("dashboard_average_risk", {
                          average: fmtNumber(m.avgRealizedR),
                          count: m.tradesWithRisk,
                        })
                      : t("app_page_tag_stop_losses_to_unlock_r_mult_e68058")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-13",
            label: t("app_page_avg_duration_9f47e2"),
            size: "small",
            layoutGroup: "secondary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_avg_duration_9f47e2")}
                  icon={Timer}
                  hint={t("app_page_average_time_from_first_entry_fi_8eb9ac")}
                />
                <CardContent>
                  <div className="text-xl font-semibold tnum">{fmtDuration(m.avgDurationMs)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("app_page_winners_vs_losers_in_reports_e832c7")}
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-14",
            label: t("app_page_best_worst_day_a8db0b"),
            size: "small",
            layoutGroup: "secondary",
            content: (
              <Card className="h-full">
                <StatHeader
                  title={t("app_page_best_worst_day_a8db0b")}
                  icon={Trophy}
                  hint={t("app_page_highest_and_lowest_single_day_ne_e76dea")}
                />
                <CardContent className="space-y-1">
                  {bestDay && (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <Pnl
                        value={bestDay.netPnl}
                        currency={currency}
                        className="text-base font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">{bestDay.date.slice(5)}</span>
                    </div>
                  )}
                  {worstDay && (
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <Pnl
                        value={worstDay.netPnl}
                        currency={currency}
                        className="text-base font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">
                        {worstDay.date.slice(5)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            id: "widget-15",
            label: t("app_page_trade_time_performance_9485a8"),
            size: "full",
            layoutGroup: "full",
            content: (
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t("app_page_trade_time_performance_9485a8")}</CardTitle>
                  <HelpHint heading={t("app_page_trade_time_performance_9485a8")}>
                    {t("app_page_trades_grouped_by_their_opening__1648be")}
                  </HelpHint>
                </CardHeader>
                <CardContent>
                  <TimeHeatmap
                    currency={currency}
                    hours={data.buckets.hour.map((b) => ({
                      key: b.key,
                      netPnl: b.netPnl,
                      trades: b.trades,
                    }))}
                  />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}

/** Stat-tile header: quiet label left, metric icon with an explainer right. */
function StatHeader({
  title,
  hint,
  icon: Icon,
}: {
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const t = useTranslations("extracted");
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0">
      <CardTitle>{title}</CardTitle>
      <Tooltip>
        <TooltipTrigger className="cursor-help" aria-label={t("dashboard_about_metric", { title })}>
          <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="mb-1 font-semibold">{title}</div>
          <div className="text-muted-foreground">{hint}</div>
        </TooltipContent>
      </Tooltip>
    </CardHeader>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function EmptyState() {
  const t = useTranslations("extracted");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      await postJson("/api/demo", {});
      window.location.reload();
    } catch {
      setLoadingDemo(false);
    }
  };
  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
        <h2 className="text-xl font-semibold">{t("app_page_your_journal_is_empty_709314")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("app_page_connect_a_broker_for_automatic_s_25faff")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/import"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("app_page_import_your_first_trades_7d7efe")}
          </Link>
          <button
            onClick={loadDemo}
            disabled={loadingDemo}
            className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {loadingDemo ? t("app_page_loading_33ce41") : t("app_page_load_demo_data_e41a5e")}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("app_page_demo_data_lands_in_its_own_accou_44ca05")}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="dashboard-grid-stage space-y-3 p-4">
        <div className="dashboard-grid grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} data-card-size="small" className="dashboard-grid-card h-28" />
          ))}
        </div>
        <div className="dashboard-grid grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} data-card-size="medium" className="dashboard-grid-card h-72" />
          ))}
        </div>
      </div>
    </div>
  );
}
