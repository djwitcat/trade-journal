"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { DayStats } from "@luxalgo/journal-core";
import { calendarTradeHref, type CalendarResponse } from "@/lib/calendar-insights";
import { cn, fmtMoney, fmtPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { HelpHint, HoverHint } from "./ui/tooltip";
import { Pnl } from "./pnl";
import { usePrivacy } from "./privacy";
// Keep the calendar and summaries usable before the plotting bundle loads.
const CalendarDailyChart = dynamic(
  () => import("./charts/calendar-daily-chart").then((module) => module.CalendarDailyChart),
  {
    loading: () => <CalendarChartLoading />,
  },
);

function CalendarChartLoading() {
  const t = useTranslations("extracted");
  return (
    <div
      role="status"
      aria-label={t("components_calendar_insights_loading_daily_performance_chart")}
      className="h-60 rounded-lg bg-muted/20"
    />
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const dateLabel = (date: string) => dateFormatter.format(new Date(`${date}T12:00:00Z`));

function Metric({
  title,
  value,
  detail,
  hint,
}: {
  title: string;
  value: ReactNode;
  detail: ReactNode;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <HelpHint heading={title}>{hint}</HelpHint>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

export function CalendarPerformance({ data, query }: { data: CalendarResponse; query: string }) {
  const t = useTranslations("extracted");
  const { insights: i, scope, timeZone, currencies } = data;
  const currency = currencies[0] ?? "USD";
  const mixed = currencies.length > 1;
  const privateMode = usePrivacy();
  const router = useRouter();
  const [weekday, setWeekday] = useState<number | null>(null);
  const href = (date?: string) => calendarTradeHref(query, scope, date);
  const money = (value: number | null) =>
    value === null || mixed ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <Pnl value={value} currency={currency} />
    );
  const selected = weekday === null ? null : i.weekdays[weekday]!;
  const peak = Math.max(1, ...i.weekdays.map((day) => Math.abs(day.netPnl)));
  const dayLink = (day: DayStats | null) =>
    day && !mixed ? (
      <Link
        href={href(day.date)}
        className="inline-flex max-w-full items-center gap-2 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {money(day.netPnl)}
        <span className="text-xs font-normal text-muted-foreground">{dateLabel(day.date)}</span>
        <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    ) : (
      money(null)
    );
  return (
    <section
      aria-labelledby="calendar-insights-heading"
      className="space-y-3"
      data-calendar-insights
    >
      <div className="flex flex-wrap items-end justify-between gap-2 pt-3">
        <div>
          <h2 id="calendar-insights-heading" className="text-base font-semibold tracking-tight">
            {t("components_calendar_insights_performance_insights_3be82a")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("components_calendar_insights_visible_month_active_filters_clo_33c6b1")} {timeZone}
          </p>
        </div>
        {i.trades > 0 && (
          <Link
            href={href()}
            className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("components_calendar_insights_view_matching_trades_9aa190")}{" "}
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        )}
      </div>
      {!i.tradingDays ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays aria-hidden="true" className="mb-1 size-6 text-muted-foreground" />
            <h3 className="text-sm font-medium">
              {t("components_calendar_insights_no_closed_trades_in_this_view_bc6ab9")}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {t("components_calendar_insights_choose_another_month_or_adjust_y_fdcf19")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {mixed && (
            <p
              role="status"
              className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
            >
              {t("components_calendar_insights_these_trades_use_307772")} {currencies.join(", ")}
              {t("components_calendar_insights_select_accounts_with_one_currenc_599c65")}
            </p>
          )}
          <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <Metric
              title={t("components_calendar_insights_net_p_l_152aa9")}
              value={money(i.netPnl)}
              detail={t("calendar_trading_days", {
                count: i.tradingDays,
                currency: mixed ? "" : ` · ${currency}`,
              })}
              hint={t("components_calendar_insights_sum_of_net_p_l_for_closed_trades_5f47e7")}
            />
            <Metric
              title={t("components_calendar_insights_average_daily_p_l_5be448")}
              value={money(i.avgDailyPnl)}
              detail={t("components_calendar_insights_per_day_with_closed_trades_a2b525")}
              hint={t("components_calendar_insights_net_p_l_divided_by_trading_days__2c4e64")}
            />
            <Metric
              title={t("components_calendar_insights_trade_win_rate_6d44e6")}
              value={fmtPercent(i.winRate)}
              detail={`${i.wins} wins · ${i.losses} losses · ${i.breakevens} break-even`}
              hint={t("components_calendar_insights_winning_closed_trades_divided_by_d2e7f8")}
            />
            <Metric
              title={t("components_calendar_insights_total_closed_trades_fa6f9e")}
              value={
                <Link
                  className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  href={href()}
                >
                  {i.trades}
                </Link>
              }
              detail={t("components_calendar_insights_round_trip_trades_not_executions_3f951e")}
              hint={t("components_calendar_insights_counts_completed_trades_whose_cl_ef05f3")}
            />
          </div>
          {!mixed && (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("components_calendar_insights_best_worst_day_3f339c")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t("components_calendar_insights_best_day_d62946")}
                      </span>
                      {dayLink(i.bestDay)}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t("components_calendar_insights_worst_day_f54d67")}
                      </span>
                      {dayLink(i.worstDay)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {i.tradingDays === 1
                        ? t("components_calendar_insights_one_trading_day_both_extrema_are_4aba1a")
                        : t("components_calendar_insights_highest_and_lowest_daily_net_p_l_e98f5f")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("components_calendar_insights_average_green_red_day_bf3348")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {i.greenDays} {t("components_calendar_insights_profitable_days_01d490")}
                      </span>
                      {money(i.avgGreenDay)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {i.redDays} {t("components_calendar_insights_losing_days_eb0caf")}
                      </span>
                      {money(i.avgRedDay)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("components_calendar_insights_each_average_uses_only_its_own_g_c5237d")}
                    </p>
                  </CardContent>
                </Card>
                <Metric
                  title={t("components_calendar_insights_day_consistency_d23b2f")}
                  value={fmtPercent(i.profitableDayRate)}
                  detail={t("calendar_day_consistency", {
                    positive: i.greenDays,
                    negative: i.redDays,
                    flat: i.flatDays,
                  })}
                  hint={t("components_calendar_insights_share_of_trading_days_with_stric_3809b5")}
                />
              </div>
              <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-medium">
                      {t("components_calendar_insights_daily_performance_85ae91")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("components_calendar_insights_net_p_l_by_closing_day_ef3343")} {currency}
                      {i.tradingDays >= 8
                        ? t("components_calendar_insights_dashed_line_5_trading_day_averag_2aeccb")
                        : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {i.tradingDays >= 2 ? (
                      <CalendarDailyChart
                        data={i.trend}
                        currency={currency}
                        onInspect={(date) => router.push(href(date))}
                      />
                    ) : (
                      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 p-5 text-center">
                        <span className="text-sm font-medium">
                          {t("components_calendar_insights_a_trend_needs_more_than_one_day_5d166a")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dateLabel(i.days[0]!.date)} · {money(i.netPnl)} · {i.trades}{" "}
                          {t("components_calendar_insights_closed_trades_a70028")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            "components_calendar_insights_explore_an_earlier_month_with_mo_fe05b9",
                          )}
                        </span>
                      </div>
                    )}
                    <details className="mt-3 border-t pt-3">
                      <summary className="cursor-pointer rounded text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                        {t("components_calendar_insights_daily_values_trade_links_a110e1")}
                        {i.tradingDays})
                      </summary>
                      <div className="mt-2 max-h-60 overflow-auto">
                        <table className="w-full text-left text-xs">
                          <caption className="sr-only">
                            {t(
                              "components_calendar_insights_daily_results_for_the_current_mo_c5b3d6",
                            )}
                          </caption>
                          <thead className="sticky top-0 bg-card text-muted-foreground">
                            <tr>
                              <th scope="col" className="py-2 font-medium">
                                {t("components_calendar_insights_closing_day_93a93c")}
                              </th>
                              <th scope="col" className="text-right font-medium">
                                {t("components_calendar_insights_trades_597b10")}
                              </th>
                              <th scope="col" className="text-right font-medium">
                                {t("components_calendar_insights_net_p_l_152aa9")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {i.days.map((day) => (
                              <tr key={day.date} className="border-t">
                                <th scope="row" className="py-2 font-normal">
                                  <Link
                                    href={href(day.date)}
                                    className="rounded underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    {dateLabel(day.date)}
                                  </Link>
                                </th>
                                <td className="text-right tabular-nums">{day.trades}</td>
                                <td className="text-right">{money(day.netPnl)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-medium">
                      {t("components_calendar_insights_performance_by_weekday_92895e")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("components_calendar_insights_closing_day_net_p_l_8c4d84")} {currency}{" "}
                      {t("components_calendar_insights_select_a_row_435aac")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 rounded-lg bg-muted/40 px-3 py-2">
                      <div className="text-[11px] text-muted-foreground">
                        {t("components_calendar_insights_most_profitable_weekday_2b6475")}
                      </div>
                      <div className="mt-0.5 flex flex-wrap justify-between gap-1 text-sm font-medium">
                        {i.mostProfitableWeekday ? (
                          <>
                            <span>{i.mostProfitableWeekday.label}</span>
                            {money(i.mostProfitableWeekday.netPnl)}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("components_calendar_insights_no_profitable_weekday_yet_f7126f")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {i.weekdays.map((day) => (
                        <HoverHint
                          key={day.index}
                          heading={day.label}
                          content={t("calendar_weekday_hint", {
                            days: day.days.length,
                            trades: day.trades,
                            amount: privateMode
                              ? t("calendar_pnl_hidden")
                              : fmtMoney(day.netPnl, currency),
                          })}
                        >
                          <button
                            type="button"
                            disabled={!day.trades}
                            onClick={() => setWeekday(weekday === day.index ? null : day.index)}
                            aria-pressed={weekday === day.index}
                            aria-label={t("calendar_inspect_weekday", {
                              day: day.label,
                              trades: day.trades,
                              amount: privateMode ? "" : `, ${fmtMoney(day.netPnl, currency)}`,
                            })}
                            className={cn(
                              "grid w-full grid-cols-[2rem_minmax(0,1fr)_5.75rem] items-center gap-2 rounded-md px-2 py-2 text-left text-xs outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:bg-transparent",
                              weekday === day.index && "bg-accent",
                            )}
                          >
                            <span>{day.label.slice(0, 3)}</span>
                            <span aria-hidden="true" className="relative h-4">
                              <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                              <span
                                className={cn(
                                  "absolute top-1 h-2 rounded-sm",
                                  day.netPnl > 0
                                    ? "bg-profit"
                                    : day.netPnl < 0
                                      ? "bg-loss"
                                      : "bg-muted-foreground",
                                )}
                                style={{
                                  left:
                                    day.netPnl < 0
                                      ? `${50 - (Math.abs(day.netPnl) / peak) * 50}%`
                                      : "50%",
                                  width:
                                    day.netPnl === 0
                                      ? "2px"
                                      : `${(Math.abs(day.netPnl) / peak) * 50}%`,
                                }}
                              />
                            </span>
                            <span className="text-right">
                              {day.trades ? money(day.netPnl) : "—"}
                            </span>
                          </button>
                        </HoverHint>
                      ))}
                    </div>
                    {selected && (
                      <div className="mt-3 border-t pt-3" aria-live="polite">
                        <p className="mb-2 text-xs font-medium">
                          {selected.label} · {selected.trades}{" "}
                          {t("components_calendar_insights_trades_across_c580cb")}{" "}
                          {selected.days.length} {t("components_calendar_insights_days_5548ae")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selected.days.map((day) => (
                            <Link
                              key={day.date}
                              href={href(day.date)}
                              className="rounded-md border px-2 py-1.5 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {dateLabel(day.date)}{" "}
                              <span className="text-muted-foreground">
                                · {day.trades} {t("components_calendar_insights_trades_cf7b32")}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {i.tradingDays < 5 && (
                <p className="px-1 text-xs text-muted-foreground">
                  {t("components_calendar_insights_small_sample_611d0c")} {i.tradingDays}{" "}
                  {t("components_calendar_insights_trading_day_e139d9")}
                  {i.tradingDays === 1 ? "" : t("components_calendar_insights_s_a0f149")}
                  {t("components_calendar_insights_weekday_results_and_consistency__924129")}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
