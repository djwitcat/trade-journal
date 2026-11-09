"use client";

import { useTranslations } from "next-intl";
import type { CalendarPnlPoint } from "@/lib/calendar-insights";
import { cn } from "@/lib/utils";
import { Pnl } from "./pnl";

/** A compact step chart: one step per closed trade, starting from zero each day. */
export function CalendarDayPreview({
  points,
  total,
  trades,
  currency,
  monetary,
}: {
  points: CalendarPnlPoint[];
  total: number;
  trades: number;
  currency: string;
  monetary: boolean;
}) {
  const t = useTranslations("extracted");
  const low = Math.min(0, ...points.map((point) => point.cumNetPnl));
  const high = Math.max(0, ...points.map((point) => point.cumNetPnl));
  const y = (value: number) => (high === low ? 50 : 88 - ((value - low) / (high - low)) * 76);
  const baseline = y(0);
  const steps = points
    .map((point, index) => `H${8 + ((index + 1) / points.length) * 248} V${y(point.cumNetPnl)}`)
    .join(" ");
  const line = `M8 ${baseline} ${steps}`;

  return (
    <div className="w-64 max-w-full">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs">{t("components_calendar_day_preview_running_p_l_6273f8")}</span>
        {monetary ? (
          <Pnl value={total} currency={currency} className="text-sm font-semibold" />
        ) : (
          <span className="text-xs">
            {t("components_calendar_day_preview_multiple_currencies_7c7266")}
          </span>
        )}
      </div>
      {monetary && points.length > 0 ? (
        <>
          <svg
            viewBox="0 0 264 100"
            role="img"
            aria-label={t("calendar_running_pnl_aria", { trades })}
            className={cn(
              "journal-calendar-pnl-preview my-2 block w-full",
              total > 0 ? "text-profit" : total < 0 ? "text-loss" : "text-muted-foreground",
            )}
          >
            <line
              x1="8"
              x2="256"
              y1={baseline}
              y2={baseline}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <path d={`${line} H256 V${baseline} Z`} fill="currentColor" fillOpacity={0.1} />
            <path
              className="journal-calendar-pnl-line"
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              pathLength="1"
            />
            <circle cx="256" cy={y(points.at(-1)!.cumNetPnl)} r="3" fill="currentColor" />
          </svg>
          <div className="flex justify-between text-[10px]">
            <span>{t("components_calendar_day_preview_before_first_close_e31061")}</span>
            <span>{t("components_calendar_day_preview_after_last_close_f2c24d")}</span>
          </div>
          <p className="mt-2 text-[11px]">
            {trades} {t("components_calendar_day_preview_closed_trade_0555ad")}
            {trades === 1 ? "" : t("components_calendar_day_preview_s_a0f149")}{" "}
            {t("components_calendar_day_preview_net_of_fees_80e929")}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs">
          {!monetary
            ? t("components_calendar_day_preview_select_accounts_with_one_currenc_1f0a3b")
            : t("components_calendar_day_preview_no_closed_trades_on_this_day_d2d78c")}
        </p>
      )}
    </div>
  );
}
