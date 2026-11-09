"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  clockLabel,
  plotTradePoints,
  type PlottedTrade,
  type TradeExplorerResponse,
  type TradeXAxis,
  type TradeYAxis,
} from "@/lib/trade-explorer";
import { useApi } from "@/lib/use-api";
import { ReportMarketEstimates } from "./report-market-estimates";
import { MonetaryValue } from "./privacy";
import { fmtMoney } from "@/lib/utils";
import { Pnl } from "./pnl";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { OptionSelect } from "./ui/option-select";
import { Skeleton } from "./ui/skeleton";

const TradeScatter = dynamic(
  () => import("./charts/trade-scatter").then((module) => module.TradeScatter),
  {
    loading: () => <ScatterLoading />,
  },
);

function ScatterLoading() {
  const t = useTranslations("extracted");
  return (
    <div role="status" aria-label={t("components_trade_explorer_loading_scatter_plot")}>
      <Skeleton className="h-80" />
    </div>
  );
}
const PAGE_SIZE = 25;
const detailHref = (key: string) => `/trades/${encodeURIComponent(key)}`;

export function TradeExplorer({ query }: { query: string }) {
  const t = useTranslations("extracted");
  const { data, error, loading, refresh } = useApi<TradeExplorerResponse>(
    `/api/trade-explorer?${query}`,
  );
  const [x, setX] = useState<TradeXAxis>("durationMinutes");
  const [y, setY] = useState<TradeYAxis>("netPnl");
  const [selected, setSelected] = useState<PlottedTrade | null>(null);
  const [page, setPage] = useState(0);
  const [tableOpen, setTableOpen] = useState(false);
  const points = useMemo(() => plotTradePoints(data?.points ?? [], x, y), [data, x, y]);
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        timeZone: data?.timeZone ?? "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [data?.timeZone],
  );
  if (loading && !data)
    return (
      <div role="status" aria-label={t("components_trade_explorer_loading_trade_explorer_2f27c6")}>
        <Skeleton className="h-96" />
      </div>
    );
  if (error || !data)
    return (
      <div role="alert" className="rounded-xl border p-5">
        <p className="text-sm text-destructive">
          {error ?? t("components_trade_explorer_unable_to_load_trade_explorer_58cb53")}
        </p>
        <Button onClick={refresh} variant="outline" size="sm" className="mt-3">
          {t("components_trade_explorer_try_again_042c86")}
        </Button>
      </div>
    );
  const currency = data.currencies[0] ?? "USD";
  const excursion = x === "mae" || x === "mfe" || y === "mae" || y === "mfe";
  const blocked = (y !== "realizedR" || excursion) && data.currencies.length > 1;
  const xTitle =
    x === "durationMinutes"
      ? t("explorer_duration_minutes")
      : x === "entryMinute"
        ? t("explorer_entry_time", { timezone: data.timeZone })
        : t("explorer_estimated_axis", { axis: x.toUpperCase(), currency });
  const yTitle =
    y === "netPnl"
      ? t("chart_net_pnl_currency", { currency })
      : y === "realizedR"
        ? t("explorer_realized_r")
        : t("explorer_estimated_axis", { axis: y.toUpperCase(), currency });
  const value = (point: PlottedTrade) =>
    y === "mae" || y === "mfe" ? (
      <MonetaryValue>{fmtMoney(point.y, currency)}</MonetaryValue>
    ) : y === "netPnl" ? (
      <Pnl value={point.y} currency={currency} />
    ) : (
      <span className="tabular-nums">
        {point.y > 0 ? "+" : ""}
        {point.y.toFixed(2)}
        {t("components_trade_explorer_r_065765")}
      </span>
    );
  const xValue = (point: PlottedTrade) =>
    x === "mae" || x === "mfe" ? (
      <MonetaryValue>{fmtMoney(point.x, currency)}</MonetaryValue>
    ) : x === "entryMinute" ? (
      clockLabel(point.x)
    ) : (
      t("explorer_minutes_short", {
        value: point.x.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      })
    );
  const pages = Math.ceil(points.length / PAGE_SIZE);
  const shownPage = Math.min(page, Math.max(0, pages - 1));
  const table = (
    <div className="space-y-3 px-4 pb-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <caption className="pb-3 text-left text-muted-foreground">
            {t("components_trade_explorer_all_6a7208")} {points.length}{" "}
            {t("components_trade_explorer_comparable_trades_newest_close_f_8d0b61")}
          </caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 pr-3">
                {t("components_trade_explorer_trade_closed_c0e676")}
              </th>
              <th scope="col" className="px-2 text-right">
                {xTitle}
              </th>
              <th scope="col" className="pl-2 text-right">
                {yTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            {points.slice(shownPage * PAGE_SIZE, (shownPage + 1) * PAGE_SIZE).map((point) => (
              <tr key={point.key} className="border-b last:border-0">
                <th scope="row" className="py-3 pr-3 font-normal">
                  <Link
                    href={detailHref(point.key)}
                    className="rounded underline underline-offset-4"
                  >
                    <span className="break-all font-medium">
                      {point.symbol} · {point.direction}
                    </span>
                    <span className="mt-1 block text-muted-foreground">
                      {date.format(new Date(point.closedAt))}
                    </span>
                  </Link>
                </th>
                <td className="px-2 text-right tabular-nums">{xValue(point)}</td>
                <td className="pl-2 text-right">{value(point)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={shownPage === 0}
            onClick={() => setPage(shownPage - 1)}
          >
            {t("components_trade_explorer_previous_50f942")}
          </Button>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {t("components_trade_explorer_page_fb0627")} {shownPage + 1}{" "}
            {t("components_trade_explorer_of_de04fa")} {pages}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={shownPage === pages - 1}
            onClick={() => setPage(shownPage + 1)}
          >
            {t("components_trade_explorer_next_bc9819")}
          </Button>
        </div>
      )}
    </div>
  );
  return (
    <section className="space-y-4" aria-labelledby="trade-explorer-title" data-trade-explorer>
      <div>
        <h2 id="trade-explorer-title" className="text-lg font-semibold">
          {t("components_trade_explorer_trade_explorer_542f61")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("components_trade_explorer_compare_individual_trades_not_gr_4e5dd0")} {data.timeZone}
        </p>
      </div>
      <ReportMarketEstimates
        points={data.points}
        currencies={data.currencies}
        onComplete={refresh}
      />
      <div
        className="flex flex-wrap gap-2"
        aria-label={t("components_trade_explorer_scatter_plot_presets_1ca471")}
      >
        {(
          [
            ["durationMinutes", "netPnl"],
            ["mae", "netPnl"],
            ["mfe", "netPnl"],
            ["mae", "mfe"],
          ] as const
        ).map(([nextX, nextY]) => (
          <Button
            key={`${nextX}_${nextY}`}
            size="sm"
            variant={x === nextX && y === nextY ? "secondary" : "outline"}
            onClick={() => {
              setX(nextX);
              setY(nextY);
              setSelected(null);
              setPage(0);
            }}
          >
            {t(`explorer_preset_${nextX}_${nextY}`)}
          </Button>
        ))}
      </div>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle>
                {excursion
                  ? t("explorer_axes_title", { x: xTitle, y: yTitle })
                  : t("explorer_outcomes_title", {
                      axis:
                        x === "durationMinutes"
                          ? t("explorer_holding_time")
                          : t("explorer_entry_time_short"),
                    })}
              </CardTitle>
              <p className="mt-2 text-xs text-muted-foreground">
                {blocked
                  ? t("explorer_closed_trades", { count: data.points.length })
                  : t("explorer_comparable_trades", {
                      count: points.length,
                      total: data.points.length,
                    })}{" "}
                {t("components_trade_explorer_one_point_per_trade_d3745f")}{" "}
                {excursion
                  ? t("components_trade_explorer_gross_excursion_estimates_net_p__d3d34a")
                  : t("components_trade_explorer_after_fees_1ca1f3")}
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-3 sm:w-auto">
              <div className="min-w-0 flex-1 sm:w-44">
                <label
                  htmlFor="trade-x-axis"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  {t("components_trade_explorer_x_axis_edc0fc")}
                </label>
                <OptionSelect
                  id="trade-x-axis"
                  value={x}
                  onValueChange={(value) => {
                    setX(value as TradeXAxis);
                    setSelected(null);
                    setPage(0);
                  }}
                >
                  <option value="durationMinutes">
                    {t("components_trade_explorer_duration_minutes_10c3d1")}
                  </option>
                  <option value="entryMinute">
                    {t("components_trade_explorer_entry_time_2d6dc1")}
                  </option>
                  <option value="mae">{t("components_trade_explorer_estimated_mae_dc468f")}</option>
                  <option value="mfe">{t("components_trade_explorer_estimated_mfe_8cbd83")}</option>
                </OptionSelect>
              </div>
              <div className="min-w-0 flex-1 sm:w-44">
                <label
                  htmlFor="trade-y-axis"
                  className="mb-1.5 block text-xs text-muted-foreground"
                >
                  {t("components_trade_explorer_y_axis_be0828")}
                </label>
                <OptionSelect
                  id="trade-y-axis"
                  value={y}
                  onValueChange={(value) => {
                    setY(value as TradeYAxis);
                    setSelected(null);
                    setPage(0);
                  }}
                >
                  <option value="netPnl">{t("components_trade_explorer_net_p_l_152aa9")}</option>
                  <option value="realizedR">
                    {t("components_trade_explorer_realized_r_0de477")}
                  </option>
                  <option value="mae">{t("components_trade_explorer_estimated_mae_dc468f")}</option>
                  <option value="mfe">{t("components_trade_explorer_estimated_mfe_8cbd83")}</option>
                </OptionSelect>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.points.length === 0 ? (
            <div className="py-10 text-center">
              <h3 className="font-medium">
                {t("components_trade_explorer_no_closed_trades_in_this_selecti_5f97a6")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("components_trade_explorer_change_the_date_range_or_filters_5dad92")}
              </p>
            </div>
          ) : blocked ? (
            <p role="note" className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
              {t("components_trade_explorer_these_trades_use_different_curre_c6b83c")}
              {data.currencies.join(", ")}
              {t("components_trade_explorer_select_accounts_with_one_currenc_1d4272")}
            </p>
          ) : (
            <>
              {points.length < data.points.length && (
                <p role="note" className="text-xs leading-relaxed text-muted-foreground">
                  {data.points.length - points.length}{" "}
                  {t("components_trade_explorer_trades_excluded_70d903")}{" "}
                  {y === "realizedR"
                    ? t("components_trade_explorer_realized_r_requires_a_valid_plan_c62dc6")
                    : ""}
                  {excursion
                    ? t("components_trade_explorer_mae_mfe_require_saved_current_ma_e0ecc8")
                    : ""}
                  {t("components_trade_explorer_both_axes_require_valid_values_a_452151")}
                </p>
              )}
              {y === "realizedR" && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("components_trade_explorer_r_net_p_l_planned_risk_from_your_d3af0d")}
                </p>
              )}
              {points.length >= (excursion ? 1 : 8) ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{yTitle}</span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <span aria-hidden="true" className="text-[var(--profit)]">
                          ●
                        </span>{" "}
                        {t("components_trade_explorer_positive_net_p_l_0cbb33")}
                      </span>
                      <span>
                        <span aria-hidden="true" className="text-[var(--loss)]">
                          ●
                        </span>{" "}
                        {t("components_trade_explorer_negative_net_p_l_e4069e")}
                      </span>
                      <span>
                        <span aria-hidden="true">●</span>{" "}
                        {t("components_trade_explorer_zero_net_p_l_aeba3b")}
                      </span>
                    </span>
                  </div>
                  <TradeScatter
                    points={points}
                    x={x}
                    y={y}
                    currency={currency}
                    timeZone={data.timeZone}
                    onSelect={setSelected}
                  />
                  <p className="text-center text-xs text-muted-foreground">{xTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("components_trade_explorer_select_a_point_to_inspect_its_tr_48841f")}
                  </p>
                  <div aria-live="polite">
                    {selected && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium break-all">
                            {selected.symbol} · {selected.direction} · {value(selected)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {xValue(selected)} {t("components_trade_explorer_closed_b56678")}{" "}
                            {date.format(new Date(selected.closedAt))}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={detailHref(selected.key)}
                            className="rounded text-sm underline underline-offset-4"
                          >
                            {t("components_trade_explorer_open_trade_bb1b4a")}
                          </Link>
                          <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                            {t("components_trade_explorer_dismiss_70afe9")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  {points.length === 0
                    ? t("components_trade_explorer_no_trades_have_the_data_required_8aa676")
                    : t("components_trade_explorer_fewer_than_8_comparable_trades_r_298611")}
                </p>
              )}
              {points.length > 0 && points.length < 20 && (
                <p className="text-xs text-muted-foreground">
                  {t("components_trade_explorer_small_sample_treat_apparent_patt_e5c244")}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {!blocked &&
        points.length > 0 &&
        (points.length < 8 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("components_trade_explorer_comparable_trades_7775d5")}</CardTitle>
            </CardHeader>
            {table}
          </Card>
        ) : (
          <details
            className="rounded-xl border bg-card"
            onToggle={(event) => setTableOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium">
              {t("components_trade_explorer_explore_all_a47b25")} {points.length}{" "}
              {t("components_trade_explorer_trades_cf7b32")}
            </summary>
            {tableOpen && table}
          </details>
        ))}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("components_trade_explorer_duration_is_elapsed_time_from_fi_3ecd72")}
      </p>
    </section>
  );
}
