"use client";
import { useTranslations } from "next-intl";
import { HoverHint } from "./ui/tooltip";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CalendarMonth } from "@luxalgo/journal-core";
import { cn, fmtMoney } from "@/lib/utils";
import { Pnl } from "./pnl";
import { MonetaryValue, usePrivacy } from "./privacy";
import type { CalendarPnlPoint } from "@/lib/calendar-insights";
import { CalendarDayPreview } from "./calendar-day-preview";

const compactFormatters = new Map<string, Intl.NumberFormat>();
const compactMoney = (value: number, currency: string) => {
  let formatter = compactFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
      signDisplay: "exceptZero",
    });
    compactFormatters.set(currency, formatter);
  }
  return formatter.format(value);
};

/**
 * The P&L calendar — an HTML grid, not a chart. Each traded day prints its
 * signed P&L and trade count; the background tint scales with magnitude
 * (lightness carries magnitude, which survives CVD; the number carries sign).
 */
export function CalendarPnl({
  calendar,
  currency = "USD",
  monetary = true,
  runningPnl,
}: {
  calendar: CalendarMonth;
  currency?: string;
  monetary?: boolean;
  runningPnl?: Record<string, CalendarPnlPoint[]>;
}) {
  const t = useTranslations("extracted");
  const maxAbs = Math.max(
    1,
    ...calendar.weeks.flatMap((week) => week.days.map((day) => Math.abs(day?.netPnl ?? 0))),
  );
  return (
    <div className="journal-calendar min-w-0 w-full">
      <div className="journal-calendar-grid grid gap-1 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
          <div key={weekday} className="px-1 pb-1 text-muted-foreground">
            {weekday}
          </div>
        ))}
        <div className="journal-calendar-week-heading px-1 pb-1 text-right text-muted-foreground">
          {t("components_calendar_pnl_week_f82be6")}
        </div>
        {calendar.weeks.map((week, weekIndex) => (
          <CalendarWeekRow
            key={weekIndex}
            week={week}
            maxAbs={maxAbs}
            currency={currency}
            monetary={monetary}
            runningPnl={runningPnl}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span className="text-muted-foreground">
          {calendar.tradingDays} {t("components_calendar_pnl_trading_days_ff1460")}{" "}
          {monetary && (
            <>
              · {calendar.winningDays} {t("components_calendar_pnl_green_bc74f4")}
            </>
          )}
        </span>
        <span>
          {t("components_calendar_pnl_month_bb80ce")}{" "}
          {monetary ? (
            <Pnl value={calendar.monthNetPnl} currency={currency} className="font-semibold" />
          ) : (
            <span className="text-muted-foreground">
              {t("components_calendar_pnl_multiple_currencies_7c7266")}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function CalendarWeekRow({
  week,
  maxAbs,
  currency,
  monetary,
  runningPnl,
}: {
  week: CalendarMonth["weeks"][number];
  maxAbs: number;
  currency: string;
  monetary: boolean;
  runningPnl?: Record<string, CalendarPnlPoint[]>;
}) {
  const t = useTranslations("extracted");
  const search = useSearchParams();
  const privacy = usePrivacy();
  return (
    <>
      {week.days.map((day, dayIndex) => {
        if (!day) return <div key={dayIndex} className="journal-calendar-day rounded-md" />;
        const traded = day.trades > 0;
        const intensity = traded ? 0.1 + 0.38 * (Math.abs(day.netPnl) / maxAbs) : 0;
        const performance = !monetary
          ? "neutral"
          : day.netPnl > 0
            ? "profit"
            : day.netPnl < 0
              ? "loss"
              : "neutral";
        return (
          <HoverHint
            key={day.date}
            heading={day.date}
            content={
              runningPnl ? (
                <CalendarDayPreview
                  points={runningPnl[day.date] ?? []}
                  total={day.netPnl}
                  trades={day.trades}
                  currency={currency}
                  monetary={monetary}
                />
              ) : (
                t("calendar_day_summary", {
                  amount: !monetary
                    ? t("calendar_multiple_currencies")
                    : privacy
                      ? t("calendar_pnl_hidden")
                      : fmtMoney(day.netPnl, currency),
                  count: day.trades,
                })
              )
            }
          >
            <Link
              key={day.date}
              href={`/journal/${day.date}?${search}`}
              aria-label={t("calendar_day_aria", {
                date: day.date,
                amount: !monetary
                  ? t("calendar_multiple_currencies")
                  : privacy
                    ? t("calendar_pnl_hidden")
                    : fmtMoney(day.netPnl, currency),
                count: day.trades,
              })}
              className={cn(
                "journal-calendar-day journal-calendar-day-link min-w-0 rounded-md border",
                !traded && "border-transparent bg-muted/30",
              )}
              data-performance={performance}
              style={
                traded && monetary
                  ? {
                      backgroundColor: `color-mix(in oklab, ${
                        performance === "profit"
                          ? "var(--profit-fill)"
                          : performance === "loss"
                            ? "var(--loss)"
                            : "var(--neutral-mid)"
                      } ${Math.round(intensity * 100)}%, var(--card))`,
                    }
                  : undefined
              }
            >
              <div className="text-muted-foreground">{Number(day.date.slice(8))}</div>
              {traded && (
                <>
                  <div className="journal-calendar-full tnum font-medium">
                    {monetary ? (
                      <MonetaryValue>{fmtMoney(day.netPnl, currency)}</MonetaryValue>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="journal-calendar-compact tnum font-medium">
                    {monetary ? (
                      <MonetaryValue>{compactMoney(day.netPnl, currency)}</MonetaryValue>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="journal-calendar-trades text-muted-foreground">
                    {day.trades} {t("components_calendar_pnl_trade_6f3eb7")}
                    {day.trades === 1 ? "" : "s"}
                  </div>
                </>
              )}
            </Link>
          </HoverHint>
        );
      })}
      <div className="journal-calendar-week flex rounded-md bg-muted/40 p-1.5">
        <span className="journal-calendar-week-label text-muted-foreground">
          {t("components_calendar_pnl_week_total_579cc4")}
        </span>
        {week.weekTrades > 0 ? (
          <>
            {monetary && (
              <Pnl value={week.weekNetPnl} currency={currency} className="font-medium" />
            )}
            <span className="text-muted-foreground">
              {week.weekTrades} {t("components_calendar_pnl_trades_cf7b32")}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </div>
    </>
  );
}
