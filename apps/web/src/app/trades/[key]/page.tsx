"use client";
import { useTranslations } from "next-intl";
import { AiNotice } from "@/components/ai-notice";
import { Checkbox } from "@/components/ui/checkbox";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { netReturnOnEntry } from "@luxalgo/journal-core";
import { FilterBar } from "@/components/filter-bar";
import { Pnl } from "@/components/pnl";
import { MonetaryValue, MonetaryField } from "@/components/privacy";
import { TradeMarketData } from "@/components/trade-market-data";
import { TradeNavigation } from "@/components/trade-navigation";
import { TradeRating } from "@/components/trade-rating";
import { EquityArea } from "@/components/charts/equity-area";
import { VoiceNote } from "@/components/voice-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RichEditor, type RichEditorHandle } from "@/components/rich-editor";
import { Attachments } from "@/components/attachments";
import { ReviewExport } from "@/components/review-export";
import { RuleChecklist } from "@/components/rule-checklist";
import { useAutosave } from "@/lib/use-autosave";
import { postJson, useApi } from "@/lib/use-api";
import { fmtDuration, fmtMoney, fmtNumber, fmtPercent } from "@/lib/utils";
import { tradeKeyFromSegment } from "@/lib/trade-links";
import { formatTimestamp } from "@/lib/timezone";

interface TradeDetail {
  riskAmount: number | null;
  realizedR: number | null;
  plannedR: number | null;
  contractMultiplier: number | null;
  currency: string;
  key: string;
  accountId: string;
  symbol: string;
  assetClass: string | null;
  direction: "long" | "short";
  status: string;
  openedAt: string;
  closedAt: string | null;
  quantity: number;
  avgEntry: number;
  avgExit: number | null;
  grossPnl: number;
  fees: number;
  netPnl: number;
  durationMs: number | null;
  exitsJson: string;
  notes: string | null;
  tagsJson: string | null;
  mistakesJson: string | null;
  playbookId: string | null;
  rating: number | null;
  stopLoss: number | null;
  profitTarget: number | null;
  reviewedAt: string | null;
}

interface ExecutionRow {
  id: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  executedAt: string;
}

export default function TradePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const tradeKey = tradeKeyFromSegment(key);
  return <TradeView key={tradeKey} tradeKey={tradeKey} />;
}

function TradeView({ tradeKey }: { tradeKey: string }) {
  const t = useTranslations("extracted");
  const { data, error, refresh } = useApi<{
    trade: TradeDetail;
    executions: ExecutionRow[];
    timeZone: string;
  }>(`/api/trades/${encodeURIComponent(tradeKey)}`);
  const [aiBusy, setAiBusy] = useState(false);
  const [critique, setCritique] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!data) {
    return (
      <div>
        <FilterBar title={t("app_trades_key_page_trade_b0811e")} />
        <div className="p-4">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : (
            <Skeleton className="h-96" />
          )}
        </div>
      </div>
    );
  }
  const { trade, executions, timeZone } = data;

  const patch = async (body: Record<string, unknown>) => {
    if (Object.keys(body).length)
      await postJson(`/api/trades/${encodeURIComponent(tradeKey)}`, body, "PATCH");
    refresh();
  };

  const runningPnl = (() => {
    const exits = JSON.parse(trade.exitsJson) as {
      executionId: string;
      grossPnl: number;
      quantity: number;
    }[];
    const times = new Map(executions.map((e) => [e.id, e.executedAt]));
    const totalExitQty = exits.reduce((total, exit) => total + exit.quantity, 0);
    let cum = 0;
    return exits
      .map((exit) => ({
        t: times.get(exit.executionId) ?? trade.openedAt,
        pnl: exit.grossPnl - (totalExitQty > 0 ? trade.fees * (exit.quantity / totalExitQty) : 0),
      }))
      .sort((a, b) => Date.parse(a.t) - Date.parse(b.t))
      .map((event) => ({
        t: formatTimestamp(event.t, timeZone).slice(11, 16),
        cumNetPnl: (cum += event.pnl),
      }));
  })();

  const askCritique = async () => {
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await postJson<{ critique: string }>("/api/ai/critique", { key: tradeKey });
      setCritique(result.critique);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : t("trade_ai_failed"));
    } finally {
      setAiBusy(false);
    }
  };

  const riskAmount = trade.riskAmount;

  return (
    <div>
      <FilterBar title={`${trade.symbol} · ${trade.direction.toUpperCase()}`} />
      <TradeNavigation tradeKey={tradeKey} />
      <div className="grid gap-3 p-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-3 xl:col-span-2">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("app_trades_key_page_net_p_l_152aa9")}
                </div>
                <Pnl value={trade.netPnl} className="text-2xl font-semibold" />
              </div>
              <Badge
                variant={
                  trade.status === "win" ? "profit" : trade.status === "loss" ? "loss" : "secondary"
                }
                className="text-sm"
              >
                {trade.status.toUpperCase()}
              </Badge>
              <Meta
                label={t("app_trades_key_page_gross_9580a6")}
                value={fmtMoney(trade.grossPnl)}
                monetary
              />
              <Meta
                label={t("app_trades_key_page_fees_72abbc")}
                value={fmtMoney(trade.fees)}
                monetary
              />
              <Meta
                label={t("app_trades_key_page_volume_3b18e8")}
                value={fmtNumber(trade.quantity, 4)}
              />
              <Meta
                label={t("app_trades_key_page_avg_entry_df4b48")}
                value={fmtNumber(trade.avgEntry)}
                monetary
              />
              <Meta
                label={t("app_trades_key_page_avg_exit_049012")}
                monetary
                value={trade.avgExit === null ? "open" : fmtNumber(trade.avgExit)}
              />
              <Meta
                label={t("app_trades_key_page_duration_137000")}
                value={fmtDuration(trade.durationMs)}
              />
              <Meta
                label={t("app_trades_key_page_net_entry_notional_d8aa65")}
                value={fmtPercent(netReturnOnEntry(trade), 2)}
              />
              <Meta
                label={t("app_trades_key_page_planned_r_c55d9b")}
                value={trade.plannedR === null ? "–" : `${fmtNumber(trade.plannedR)}R`}
              />
              <Meta
                label={t("app_trades_key_page_realized_r_0de477")}
                value={trade.realizedR === null ? "–" : `${fmtNumber(trade.realizedR)}R`}
              />
            </CardContent>
          </Card>

          <TradeMarketData trade={trade} executions={executions} />

          {runningPnl.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("app_trades_key_page_running_p_l_6273f8")}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("app_trades_key_page_times_in_35f535")} {timeZone}
                </p>
              </CardHeader>
              <CardContent>
                <EquityArea data={runningPnl} height={180} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("app_trades_key_page_executions_8999e5")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("app_trades_key_page_times_in_35f535")} {timeZone}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("app_trades_key_page_time_6c82e6")}</TableHead>
                    <TableHead>{t("app_trades_key_page_side_265283")}</TableHead>
                    <TableHead>{t("app_trades_key_page_quantity_44f6af")}</TableHead>
                    <TableHead>{t("app_trades_key_page_price_3e8248")}</TableHead>
                    <TableHead>{t("app_trades_key_page_fee_c6e89c")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions
                    .sort((a, b) => a.executedAt.localeCompare(b.executedAt))
                    .map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="text-muted-foreground">
                          {formatTimestamp(execution.executedAt, timeZone)}
                        </TableCell>
                        <TableCell>
                          <span className={execution.side === "buy" ? "text-profit" : "text-loss"}>
                            {execution.side === "buy" ? "▲ BUY" : "▼ SELL"}
                          </span>
                        </TableCell>
                        <TableCell className="tnum">{fmtNumber(execution.quantity, 4)}</TableCell>
                        <TableCell className="tnum">
                          <MonetaryValue>{fmtNumber(execution.price)}</MonetaryValue>
                        </TableCell>
                        <TableCell className="tnum text-muted-foreground">
                          <MonetaryValue>{fmtMoney(execution.fee)}</MonetaryValue>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-3">
          <AnnotationsCard key={trade.key} trade={trade} onPatch={patch} />
          <RuleChecklist tradeKey={trade.key} playbookId={trade.playbookId} />
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t("app_trades_key_page_ai_review_c8c27c")}</CardTitle>
              <Button variant="outline" size="sm" onClick={askCritique} disabled={aiBusy}>
                <Sparkles />
                {aiBusy ? t("trade_ai_thinking") : t("trade_ai_critique")}
              </Button>
            </CardHeader>
            {aiError && (
              <CardContent>
                <AiNotice
                  error={aiError}
                  onRetry={() => void askCritique()}
                  onDismiss={() => setAiError(null)}
                />
              </CardContent>
            )}
            {critique && (
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{critique}</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  monetary = false,
}: {
  label: string;
  value: string;
  monetary?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tnum text-sm font-medium">
        {monetary ? <MonetaryValue>{value}</MonetaryValue> : value}
      </div>
    </div>
  );
}

function AnnotationsCard({
  trade,
  onPatch,
}: {
  trade: TradeDetail;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations("extracted");
  const [notes, setNotes] = useState(trade.notes ?? "");
  const noteEditor = useRef<RichEditorHandle>(null);
  const [tags, setTags] = useState((JSON.parse(trade.tagsJson ?? "[]") as string[]).join(", "));
  const [mistakes, setMistakes] = useState(
    (JSON.parse(trade.mistakesJson ?? "[]") as string[]).join(", "),
  );
  const [stopLoss, setStopLoss] = useState(trade.stopLoss?.toString() ?? "");
  const [profitTarget, setProfitTarget] = useState(trade.profitTarget?.toString() ?? "");
  const { data: playbookData } = useApi<{ playbooks: { id: string; name: string }[] }>(
    "/api/playbooks",
  );
  const {
    save: debounced,
    status: saveStatus,
    flush,
  } = useAutosave(`/api/trades/${encodeURIComponent(trade.key)}`, "PATCH", () => void onPatch({}));

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("app_trades_key_page_journal_this_trade_6c9224")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <TradeRating value={trade.rating} onChange={(rating) => onPatch({ rating })} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={trade.reviewedAt !== null}
              onCheckedChange={(checked) => void onPatch({ reviewed: checked === true })}
            />
            {t("app_trades_key_page_reviewed_31ef85")}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">
              {t("app_trades_key_page_stop_loss_ecfdc4")}
            </label>
            <MonetaryField>
              <Input
                value={stopLoss}
                onChange={(event) => {
                  setStopLoss(event.target.value);
                  debounced({
                    stopLoss: event.target.value === "" ? null : Number(event.target.value),
                  });
                }}
                placeholder={t("app_trades_key_page_planned_stop_0560e5")}
                inputMode="decimal"
              />
            </MonetaryField>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {t("app_trades_key_page_profit_target_7bec5f")}
            </label>
            <MonetaryField>
              <Input
                value={profitTarget}
                onChange={(event) => {
                  setProfitTarget(event.target.value);
                  debounced({
                    profitTarget: event.target.value === "" ? null : Number(event.target.value),
                  });
                }}
                placeholder={t("app_trades_key_page_planned_target_eb10ae")}
                inputMode="decimal"
              />
            </MonetaryField>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">
            {t("app_trades_key_page_playbook_06645f")}
          </label>
          <Select
            value={trade.playbookId ?? "none"}
            onValueChange={(value) => void onPatch({ playbookId: value === "none" ? null : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("app_trades_key_page_no_playbook_7455d9")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("app_trades_key_page_no_playbook_7455d9")}</SelectItem>
              {playbookData?.playbooks.map((playbook) => (
                <SelectItem key={playbook.id} value={playbook.id}>
                  {playbook.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">
            {t("app_trades_key_page_tags_comma_separated_32bf67")}
          </label>
          <Input
            value={tags}
            onChange={(event) => {
              setTags(event.target.value);
              debounced({ tags: parseList(event.target.value) });
            }}
            placeholder={t("app_trades_key_page_breakout_a_setup_fe0728")}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">
            {t("app_trades_key_page_mistakes_7868f6")}
          </label>
          <Input
            value={mistakes}
            onChange={(event) => {
              setMistakes(event.target.value);
              debounced({ mistakes: parseList(event.target.value) });
            }}
            placeholder={t("app_trades_key_page_chased_entry_moved_stop_6ad6ce")}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              {t("app_trades_key_page_notes_704400")}
            </label>
            <VoiceNote
              onPrepare={() => noteEditor.current?.focus()}
              onText={(text) => {
                const next = notes ? `${notes} ${text}` : text;
                setNotes(next);
                debounced({ notes: next });
              }}
            />
          </div>
          <RichEditor
            editorRef={noteEditor}
            value={notes}
            onChange={(value) => {
              setNotes(value);
              debounced({ notes: value });
            }}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span role="status">{saveStatus}</span>
            <Button variant="ghost" size="sm" onClick={() => void flush()}>
              {t("app_trades_key_page_save_now_3989b7")}
            </Button>
          </div>
          <ReviewExport
            containsFinancialData
            document={{
              title: t("trade_export_title", { symbol: trade.symbol, direction: trade.direction }),
              subtitle: `${trade.openedAt} · ${trade.currency}`,
              lines: [
                t("trade_export_status", { status: trade.status, quantity: trade.quantity }),
                t("trade_export_entry", {
                  entry: trade.avgEntry,
                  exit: trade.avgExit ?? t("trade_export_open"),
                }),
                t("trade_export_pnl", {
                  pnl: trade.netPnl.toFixed(2),
                  fees: trade.fees.toFixed(2),
                }),
                t("trade_export_targets", {
                  stop: stopLoss || t("trade_export_unspecified"),
                  target: profitTarget || t("trade_export_unspecified"),
                }),
                t("trade_export_annotations", {
                  tags: tags || t("trade_export_none"),
                  mistakes: mistakes || t("trade_export_none"),
                }),
                "",
                notes,
              ],
            }}
          />
          <Attachments type="trade" id={trade.key} />
        </div>
      </CardContent>
    </Card>
  );
}
