"use client";

import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useMemo } from "react";
import {
  clockLabel,
  type PlottedTrade,
  type TradeXAxis,
  type TradeYAxis,
} from "@/lib/trade-explorer";
import { fmtMoney } from "@/lib/utils";
import { usePrivacy } from "../privacy";
import { ChartFrame } from "./chart-frame";
import { tooltipStyle, useVizTokens } from "./tokens";

export function TradeScatter({
  points,
  x,
  y,
  currency,
  timeZone,
  onSelect,
}: {
  points: PlottedTrade[];
  x: TradeXAxis;
  y: TradeYAxis;
  currency: string;
  timeZone: string;
  onSelect: (point: PlottedTrade) => void;
}) {
  const t = useTranslations("extracted");
  const tokens = useVizTokens();
  const privateMode = usePrivacy();
  const groups = useMemo(
    () => [
      points.filter((p) => (p.netPnl ?? 0) > 0),
      points.filter((p) => (p.netPnl ?? 0) < 0),
      points.filter((p) => (p.netPnl ?? 0) === 0),
    ],
    [points],
  );
  const date = useMemo(
    () => new Intl.DateTimeFormat("en", { timeZone, dateStyle: "medium", timeStyle: "short" }),
    [timeZone],
  );
  const yLabel = (n: number) =>
    y === "realizedR" ? `${n.toFixed(2)}R` : privateMode ? "••••" : fmtMoney(n, currency);
  const xLabel = (n: number) =>
    x === "entryMinute"
      ? clockLabel(n)
      : x === "mae" || x === "mfe"
        ? privateMode
          ? "••••"
          : fmtMoney(n, currency)
        : n.toLocaleString(undefined, { maximumFractionDigits: 1, notation: "compact" });
  if (!tokens) return <div className="h-80" />;
  return (
    <ChartFrame height={340}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
          aria-label={t("components_charts_trade_scatter_individual_trade_outcomes_select_00b90f")}
        >
          <CartesianGrid stroke={tokens.gridline} />
          <XAxis
            type="number"
            dataKey="x"
            domain={x === "entryMinute" ? [0, 1440] : [0, "auto"]}
            ticks={x === "entryMinute" ? [0, 360, 720, 1080, 1440] : undefined}
            minTickGap={24}
            tickFormatter={xLabel}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: tokens.baseline }}
          />
          <YAxis
            type="number"
            dataKey="y"
            width={82}
            domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 0)]}
            tickFormatter={yLabel}
            tick={{ fill: tokens.inkMuted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ZAxis range={[44, 44]} />
          <ReferenceLine y={0} stroke={tokens.inkMuted} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: tokens.inkMuted }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PlottedTrade | undefined;
              return active && point ? (
                <div style={{ ...tooltipStyle(tokens), maxWidth: 230, overflowWrap: "anywhere" }}>
                  <p className="font-medium">
                    {point.symbol} · {point.direction}
                  </p>
                  <p className="text-xs">
                    {t("components_charts_trade_scatter_closed_88d86b")}{" "}
                    {date.format(new Date(point.closedAt))}
                  </p>
                  <p>
                    {x === "durationMinutes"
                      ? t("scatter_minutes", {
                          value: point.x.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                        })
                      : x === "entryMinute"
                        ? t("scatter_entry_time", { time: clockLabel(point.x) })
                        : t("scatter_estimated_value", {
                            axis: x.toUpperCase(),
                            value: xLabel(point.x),
                          })}
                  </p>
                  <p>
                    {y === "netPnl"
                      ? t("components_charts_trade_scatter_net_p_l_152aa9")
                      : y === "realizedR"
                        ? t("components_charts_trade_scatter_realized_r_0de477")
                        : t("scatter_estimated_axis", { axis: y.toUpperCase() })}
                    : {yLabel(point.y)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("components_charts_trade_scatter_select_to_inspect_this_trade_09fd76")}
                  </p>
                </div>
              ) : null;
            }}
          />
          {groups.map((data, index) => (
            <Scatter
              key={index}
              data={data}
              name={t(`chart_scatter_group_${index}`)}
              shape="circle"
              fill={[tokens.profitFill, tokens.loss, tokens.inkMuted][index]}
              fillOpacity={0.7}
              stroke={[tokens.profit, tokens.loss, tokens.inkMuted][index]}
              strokeWidth={1}
              isAnimationActive={false}
              onClick={(value: { payload?: PlottedTrade }) => {
                if (value.payload) onSelect(value.payload);
              }}
              cursor="pointer"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
