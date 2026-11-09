"use client";
import { useTranslations } from "next-intl";
import { AiRecap } from "@/components/ai-recap";

import Link from "next/link";
import { Suspense, use, useRef, useState } from "react";
import type { IntradayPoint, TradeMetrics } from "@luxalgo/journal-core";
import { EquityArea } from "@/components/charts/equity-area";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { Pnl } from "@/components/pnl";
import { MonetaryValue } from "@/components/privacy";
import { VoiceNote } from "@/components/voice-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichEditor, type RichEditorHandle } from "@/components/rich-editor";
import { Attachments } from "@/components/attachments";
import { ReviewExport } from "@/components/review-export";
import { useAutosave } from "@/lib/use-autosave";
import { useApi } from "@/lib/use-api";
import { fmtMoney, fmtNumber, fmtPercent } from "@/lib/utils";

interface TradeRowLite {
  key: string;
  symbol: string;
  direction: string;
  status: string;
  netPnl: number;
  quantity: number;
  avgEntry: number;
  avgExit: number | null;
  fees: number;
}

interface DayPayload {
  date: string;
  metrics: TradeMetrics;
  trades: TradeRowLite[];
  intraday: IntradayPoint[];
  note: string;
}

export default function JournalDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  return (
    <Suspense>
      <JournalDay key={date} date={date} />
    </Suspense>
  );
}

function JournalDay({ date }: { date: string }) {
  const t = useTranslations("extracted");
  const { query, values: filters, timeZone } = useFilters();
  const { data, error } = useApi<DayPayload>(`/api/journal/${date}?${query}`);
  const [note, setNote] = useState<string | null>(null);
  const noteEditor = useRef<RichEditorHandle>(null);
  const { save, status: saving, flush } = useAutosave(`/api/journal/${date}`, "PUT");
  const noteValue = note ?? data?.note ?? "";
  const latestNote = useRef(noteValue);
  latestNote.current = noteValue;
  const scheduleSave = (value: string) => {
    latestNote.current = value;
    setNote(value);
    save({ note: value });
  };

  const m = data?.metrics;
  return (
    <div>
      <FilterBar title={`Journal · ${date}`} />
      <div className="grid gap-3 p-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-3 xl:col-span-2">
          {m && m.closedTrades > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("app_journal_date_page_day_stats_afd412")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 2xl:grid-cols-5">
                <Stat label={t("app_journal_date_page_net_p_l_152aa9")}>
                  <Pnl value={m.netPnl} className="font-semibold" />
                </Stat>
                <Stat label={t("app_journal_date_page_trades_597b10")}>{m.closedTrades}</Stat>
                <Stat label={t("app_journal_date_page_winrate_fcc546")}>
                  {fmtPercent(m.winRate)}
                </Stat>
                <Stat label={t("app_journal_date_page_winners_1d50bf")}>{m.wins}</Stat>
                <Stat label={t("app_journal_date_page_losers_6ce799")}>{m.losses}</Stat>
                <Stat label={t("app_journal_date_page_gross_9580a6")}>
                  <MonetaryValue>{fmtMoney(m.grossPnl)}</MonetaryValue>
                </Stat>
                <Stat label={t("app_journal_date_page_fees_72abbc")}>
                  <MonetaryValue>{fmtMoney(m.fees)}</MonetaryValue>
                </Stat>
                <Stat label={t("app_journal_date_page_volume_3b18e8")}>
                  {fmtNumber(m.totalVolume, 0)}
                </Stat>
                <Stat label={t("app_journal_date_page_profit_factor_80e53e")}>
                  {m.profitFactorIsInfinite
                    ? "∞"
                    : m.profitFactor === null
                      ? "–"
                      : fmtNumber(m.profitFactor)}
                </Stat>
                <Stat label={t("app_journal_date_page_expectancy_0958de")}>
                  <MonetaryValue>
                    {m.expectancy === null ? "–" : fmtMoney(m.expectancy)}
                  </MonetaryValue>
                </Stat>
              </CardContent>
            </Card>
          ) : (
            m && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {t("app_journal_date_page_no_closed_trades_this_day_64253f")}
                </CardContent>
              </Card>
            )
          )}

          {data && data.intraday.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("app_journal_date_page_intraday_cumulative_net_p_l_cde517")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EquityArea
                  data={data.intraday.map((p) => ({
                    t: p.t.slice(11, 16),
                    cumNetPnl: p.cumNetPnl,
                  }))}
                  height={200}
                />
              </CardContent>
            </Card>
          )}

          {data && data.trades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("app_journal_date_page_trades_597b10")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.trades.map((trade) => (
                  <Link
                    key={trade.key}
                    href={`/trades/${encodeURIComponent(trade.key)}?${query}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/60"
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
                      <span className="font-medium">{trade.symbol}</span>
                      <span className="text-xs text-muted-foreground">{trade.direction}</span>
                    </span>
                    <span className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                      <span className="tnum text-xs text-muted-foreground">
                        {fmtNumber(trade.quantity, 4)} @{" "}
                        <MonetaryValue>{fmtNumber(trade.avgEntry)}</MonetaryValue>
                        {trade.avgExit !== null && (
                          <>
                            {" "}
                            → <MonetaryValue>{fmtNumber(trade.avgExit)}</MonetaryValue>
                          </>
                        )}
                      </span>
                      <Pnl value={trade.netPnl} />
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          {!data && <Skeleton className="h-64" />}
        </div>

        <Card className="h-fit">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("app_journal_date_page_day_note_e040d5")}</CardTitle>
            <div className="flex items-center gap-2">
              <VoiceNote
                onPrepare={() => noteEditor.current?.focus()}
                onText={(text) =>
                  scheduleSave(
                    noteValue ? `${noteValue}${noteValue.endsWith(" ") ? "" : " "}${text}` : text,
                  )
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("app_journal_date_page_this_note_is_shared_across_accou_bd7fc3")}
            </p>
            <div className="mb-3">
              <AiRecap
                key={`${date}:${timeZone}:${query}`}
                date={date}
                filters={filters}
                timeZone={timeZone}
                disabled={!data || !m?.closedTrades}
                onRecap={({ recap, scope }) => {
                  // Append to the current draft, including edits made while AI was running.
                  const section = `## AI recap\n\n${scope.label.replace(/[\\`*_{}\[\]<>#]/g, "").replace(/[\r\n]+/g, " ")}\n\n${recap}`;
                  scheduleSave(
                    latestNote.current ? `${latestNote.current}\n\n---\n\n${section}` : section,
                  );
                }}
              />
            </div>
            {data ? (
              <RichEditor editorRef={noteEditor} value={noteValue} onChange={scheduleSave} />
            ) : error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <Skeleton className="h-48" />
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span role="status">{saving}</span>
              <Button variant="ghost" size="sm" onClick={() => void flush()}>
                {t("app_journal_date_page_save_now_3989b7")}
              </Button>
            </div>
            <ReviewExport
              containsFinancialData
              document={{
                title: t("journal_export_title", { date }),
                subtitle: query
                  ? t("journal_export_filters", { query })
                  : t("journal_export_all_accounts"),
                lines: [
                  t("journal_export_summary", {
                    trades: m?.closedTrades ?? 0,
                    pnl: m?.netPnl.toFixed(2) ?? "0.00",
                  }),
                  "",
                  noteValue,
                ],
              }}
            />
            <Attachments type="day" id={date} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum">{children}</div>
    </div>
  );
}
