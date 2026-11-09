"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Vela } from "@luxalgo/vela";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import {
  RESOLUTIONS,
  type MarketConnection,
  type ExcursionEstimate,
  type Resolution,
  type TradeMarketResult,
} from "@/lib/market-data";
import { providerInfo } from "@/lib/market-providers";
import type { MarketCsvDataset } from "@/lib/market-csv";
import { replayFrame } from "@/lib/trade-replay";
import { useApi } from "@/lib/use-api";
import { fmtMoney } from "@/lib/utils";
import { TradeChart, type ChartExecution, type ChartTrade } from "./trade-chart";
import { usePrivacy } from "./privacy";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";

export function TradeMarketData({
  trade,
  executions,
}: {
  trade: ChartTrade & { currency: string };
  executions: ChartExecution[];
}) {
  const t = useTranslations("extracted");
  const privacy = usePrivacy();
  const { data: saved, refresh: refreshSaved } = useApi<{
    saved: { estimate: ExcursionEstimate } | null;
  }>(`/api/trades/${encodeURIComponent(trade.key)}/market-data`);
  const { data: connections, error: connectionError } = useApi<{ connections: MarketConnection[] }>(
    "/api/market-data/connections",
  );
  const available = connections?.connections.filter((connection) => connection.configured) ?? [];
  const [provider, setProvider] = useState("");
  const [symbol, setSymbol] = useState(trade.symbol);
  const [dataset, setDataset] = useState("");
  const [resolution, setResolution] = useState<Resolution>("1m");
  const info = providerInfo(provider);
  const { data: csv } = useApi<{ datasets: MarketCsvDataset[] }>(
    info?.mode === "csv" ? "/api/market-data/csv" : null,
  );
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<TradeMarketResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const invalidate = () => {
    controller.current?.abort();
    setBusy(false);
    setResult(null);
    setError("");
  };
  const load = async () => {
    if (!available.some((item) => item.id === provider) || (info?.datasets && !dataset)) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`/api/trades/${encodeURIComponent(trade.key)}/market-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          symbol,
          dataset,
          resolution,
          basisConfirmed: confirmed,
        }),
        signal: request.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? t("market_history_failed"));
      if (!request.signal.aborted) {
        setResult(body);
        refreshSaved();
      }
    } catch (cause) {
      if (!request.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : t("components_trade_market_data_history_request_failed_9e97ce"),
        );
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>{t("components_trade_market_data_market_data_replay_78a21d")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("components_trade_market_data_load_candles_for_this_trade_to_u_8db5ab")}
          </p>
          {connectionError && (
            <p role="alert" className="text-sm text-destructive">
              {connectionError}
            </p>
          )}
          {!available.length && (
            <p className="text-sm text-muted-foreground">
              <a className="underline" href="/settings#market-data">
                {t("components_trade_market_data_connect_a_market_data_provider_i_8e9683")}
              </a>{" "}
              {t("components_trade_market_data_to_use_historical_replay_and_est_e5dbb9")}
            </p>
          )}
          {!trade.closedAt ? (
            <p className="text-sm text-muted-foreground">
              {t("components_trade_market_data_available_after_this_trade_close_02e233")}
            </p>
          ) : (
            available.length > 0 && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="market-provider">
                      {t("components_trade_market_data_data_provider_8eed0c")}
                    </Label>
                    <OptionSelect
                      id="market-provider"
                      value={provider}
                      onValueChange={(value) => {
                        invalidate();
                        setProvider(value);
                        setDataset("");
                        setConfirmed(false);
                      }}
                    >
                      <option value="" disabled>
                        {t("components_trade_market_data_choose_a_data_source_444bc8")}
                      </option>
                      {available.map((item) => (
                        <option key={item.id} value={item.id}>
                          {t(`market_provider_${item.id}_name`)}
                        </option>
                      ))}
                    </OptionSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="market-symbol">
                      {t("components_trade_market_data_provider_symbol_a0fd25")}
                    </Label>
                    <Input
                      id="market-symbol"
                      value={symbol}
                      onChange={(event) => {
                        invalidate();
                        setSymbol(event.target.value);
                        setConfirmed(false);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="market-resolution">
                      {t("components_trade_market_data_candle_resolution_c7fa26")}
                    </Label>
                    <OptionSelect
                      id="market-resolution"
                      value={resolution}
                      onValueChange={(value) => {
                        invalidate();
                        setResolution(value as Resolution);
                      }}
                    >
                      {Object.keys(RESOLUTIONS).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </OptionSelect>
                  </div>
                  {(info?.datasets ||
                    info?.mode === "csv" ||
                    info?.id === "london-strategic-edge") && (
                    <div className="space-y-1">
                      <Label htmlFor="market-dataset">
                        {t("components_trade_market_data_data_feed_dataset_18dedd")}
                      </Label>
                      {info?.datasets || info?.mode === "csv" ? (
                        <OptionSelect
                          id="market-dataset"
                          value={dataset}
                          onValueChange={(value) => {
                            invalidate();
                            setDataset(value);
                            setConfirmed(false);
                          }}
                        >
                          {(
                            info.datasets ?? [
                              {
                                value: "",
                                label: t("components_trade_market_data_automatic_matching_file"),
                              },
                              ...(csv?.datasets ?? []).map((item) => ({
                                value: item.id,
                                label: `${item.name} · ${item.symbol} · ${item.resolution}`,
                              })),
                            ]
                          ).map((item) => (
                            <option key={item.value} value={item.value}>
                              {info?.datasets
                                ? t(
                                    `market_provider_${info.id}_dataset_${item.value || "default"}_label`,
                                  )
                                : item.label}
                            </option>
                          ))}
                        </OptionSelect>
                      ) : (
                        <Input
                          id="market-dataset"
                          value={dataset}
                          placeholder={t(
                            "components_trade_market_data_leave_blank_for_automatic_select_542835",
                          )}
                          onChange={(event) => {
                            invalidate();
                            setDataset(event.target.value);
                            setConfirmed(false);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {info && t(`market_provider_${info.id}_description`)}{" "}
                  {info && t(`market_provider_${info.id}_symbol_hint`)}{" "}
                  {t("components_trade_market_data_option_contract_history_is_not_s_becfe8")}
                </p>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    className="mt-0.5"
                    onChange={(event) => {
                      invalidate();
                      setConfirmed(event.target.checked);
                    }}
                  />
                  <span>
                    {t("components_trade_market_data_calculate_and_save_mae_mfe_estim_82b7b2")}
                    {trade.currency}).
                  </span>
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("components_trade_market_data_unchecked_load_candles_and_repla_672a52")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={
                      busy ||
                      !symbol.trim() ||
                      !available.some((item) => item.id === provider) ||
                      Boolean(info?.datasets && !dataset)
                    }
                    onClick={() => void load()}
                  >
                    {busy
                      ? t("components_trade_market_data_loading_history_02cb12")
                      : confirmed
                        ? t("components_trade_market_data_load_data_save_estimates_ea8539")
                        : t("components_trade_market_data_load_candles_replay_533a43")}
                  </Button>
                  {busy && (
                    <Button variant="outline" onClick={invalidate}>
                      {t("components_trade_market_data_cancel_77dfd2")}
                    </Button>
                  )}
                  {result && (
                    <Button variant="outline" onClick={invalidate}>
                      {t("components_trade_market_data_show_original_chart_ed8c1f")}
                    </Button>
                  )}
                </div>
              </>
            )
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      {!result && saved?.saved && (
        <p className="text-xs text-muted-foreground">
          {t("components_trade_market_data_previously_saved_mae_mfe_estimat_fb4b5d")}
        </p>
      )}
      {result && result.bars.length > 0 ? (
        <HistoricalReplay
          history={result}
          trade={trade}
          executions={executions}
          privacy={privacy}
        />
      ) : (
        <>
          <div
            className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3"
            aria-label={t("components_trade_market_data_market_data_feature_status_8effed")}
          >
            <div>
              <p className="text-xs text-muted-foreground">
                {t("components_trade_market_data_estimated_mae_dc468f")}
              </p>
              <p className="text-sm">
                {busy
                  ? t("components_trade_market_data_loading_candles_710743")
                  : error
                    ? t("components_trade_market_data_data_request_failed_f2253c")
                    : saved?.saved
                      ? privacy
                        ? "••••"
                        : fmtMoney(saved.saved.estimate.mae!, trade.currency)
                      : t("components_trade_market_data_load_market_data_to_calculate_5cf316")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("components_trade_market_data_estimated_mfe_8cbd83")}
              </p>
              <p className="text-sm">
                {busy
                  ? t("components_trade_market_data_loading_candles_710743")
                  : error
                    ? t("components_trade_market_data_data_request_failed_f2253c")
                    : saved?.saved
                      ? privacy
                        ? "••••"
                        : fmtMoney(saved.saved.estimate.mfe!, trade.currency)
                      : t("components_trade_market_data_load_market_data_to_calculate_5cf316")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("components_trade_market_data_trade_replay_87b363")}
              </p>
              <p className="text-sm">
                {busy
                  ? t("components_trade_market_data_loading_candles_710743")
                  : t("components_trade_market_data_available_after_candles_load_ba4725")}
              </p>
            </div>
          </div>
          {result && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("components_trade_market_data_no_candles_were_returned_for_thi_e6bfce")}
            </p>
          )}
          <TradeChart trade={trade} executions={executions} />
        </>
      )}
    </div>
  );
}

export function HistoricalReplay({
  history,
  trade,
  executions,
  privacy,
}: {
  history: TradeMarketResult;
  trade: ChartTrade & { currency: string };
  executions: ChartExecution[];
  privacy: boolean;
}) {
  const t = useTranslations("extracted");
  const [count, setCount] = useState(history.bars.length);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("4");
  useEffect(() => {
    setCount(history.bars.length);
    setPlaying(false);
  }, [history]);
  useEffect(() => {
    if (!playing || privacy) return;
    const timer = window.setInterval(
      () => {
        if (!document.hidden) setCount((current) => Math.min(current + 1, history.bars.length));
      },
      1000 / Number(speed),
    );
    return () => window.clearInterval(timer);
  }, [playing, privacy, speed, history.bars.length]);
  useEffect(() => {
    if (count >= history.bars.length || privacy) setPlaying(false);
  }, [count, privacy, history.bars.length]);
  const complete = count === history.bars.length;
  const frame = useMemo(
    () => replayFrame(history, history.estimate.priceBasisMismatch ? [] : executions, count),
    [history, executions, count],
  );
  return (
    <Card className="journal-replay-enter">
      <CardHeader>
        <CardTitle>{t("components_trade_market_data_historical_candles_1580b9")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {history.provider} · {history.symbol} · {history.resolution} ·{" "}
          {history.bars.length.toLocaleString()}{" "}
          {t("components_trade_market_data_candles_retrieved_a1dfca")}{" "}
          {new Date(history.fetchedAt).toLocaleString()}
        </p>
        {privacy ? (
          <p className="text-sm text-muted-foreground">
            {t("components_trade_market_data_historical_prices_and_excursion__36f43f")}
          </p>
        ) : (
          <>
            {history.estimate.priceBasisMismatch && (
              <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">
                {t("components_trade_market_data_the_market_candles_and_recorded__e3d0b3")}
              </p>
            )}
            <ReplayChart history={history} nextFrame={frame} />
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2"
              role="group"
              aria-label={t("components_trade_market_data_candle_replay_controls_a954b4")}
            >
              <Button
                variant="outline"
                size="icon"
                aria-label={t("components_trade_market_data_restart_replay_065d3d")}
                onClick={() => {
                  setPlaying(false);
                  setCount(1);
                }}
              >
                <RotateCcw />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("components_trade_market_data_previous_candle_75d209")}
                disabled={count <= 1}
                onClick={() => {
                  setPlaying(false);
                  setCount((current) => Math.max(1, current - 1));
                }}
              >
                <ChevronLeft />
              </Button>
              <Button
                className="min-w-24"
                disabled={history.bars.length <= 1}
                onClick={() => {
                  if (complete) setCount(1);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause /> : <Play />}
                {playing
                  ? t("components_trade_market_data_pause_781961")
                  : t("components_trade_market_data_play_5d12bd")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("components_trade_market_data_next_candle_bf64c5")}
                disabled={complete}
                onClick={() => {
                  setPlaying(false);
                  setCount((current) => Math.min(current + 1, history.bars.length));
                }}
              >
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("components_trade_market_data_show_all_candles_6ed032")}
                disabled={complete}
                onClick={() => {
                  setPlaying(false);
                  setCount(history.bars.length);
                }}
              >
                <SkipForward />
              </Button>
              <span className="mx-1 text-xs tabular-nums text-muted-foreground" aria-live="off">
                {count.toLocaleString()} / {history.bars.length.toLocaleString()}
              </span>
              <OptionSelect
                aria-label={t("components_trade_market_data_replay_speed_ac2377")}
                className="ml-auto w-20"
                value={speed}
                onValueChange={setSpeed}
              >
                <option value="1">1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </OptionSelect>
            </div>
            <input
              aria-label={t("components_trade_market_data_replay_position_410c18")}
              type="range"
              min={1}
              max={history.bars.length}
              value={count}
              className="w-full accent-primary"
              onChange={(event) => {
                setPlaying(false);
                setCount(Number(event.target.value));
              }}
            />
            <p className="text-xs text-muted-foreground">
              {count} / {history.bars.length}{" "}
              {t("components_trade_market_data_candles_through_5a99cb")}{" "}
              {new Date(frame.through).toISOString()}{" "}
              {t("components_trade_market_data_utc_candles_are_revealed_at_bar__dbc36c")}
            </p>
          </>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("components_trade_market_data_estimated_mae_adverse_ef62a7")}
            </p>
            <p className="font-medium">
              {privacy
                ? "••••"
                : !complete
                  ? t("components_trade_market_data_hidden_during_replay_48f3b9")
                  : history.estimate.mae === null
                    ? t("components_trade_market_data_unavailable_2c9c1f")
                    : fmtMoney(history.estimate.mae, trade.currency).replace(/^\+/, "")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("components_trade_market_data_estimated_mfe_favorable_353465")}
            </p>
            <p className="font-medium">
              {privacy
                ? "••••"
                : !complete
                  ? t("components_trade_market_data_hidden_during_replay_48f3b9")
                  : history.estimate.mfe === null
                    ? t("components_trade_market_data_unavailable_2c9c1f")
                    : fmtMoney(history.estimate.mfe, trade.currency).replace(/^\+/, "")}
            </p>
          </div>
        </div>
        <details className="text-xs text-muted-foreground" open>
          <summary className="cursor-pointer">
            {t("components_trade_market_data_data_coverage_estimate_limits_57c939")}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {[...history.warnings, ...history.estimate.warnings].map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}

function ReplayChart({
  history,
  nextFrame,
}: {
  history: TradeMarketResult;
  nextFrame: ReturnType<typeof replayFrame<ChartExecution>>;
}) {
  const t = useTranslations("extracted");
  // Chart-local identity also works on HTTP LAN origins without crypto.randomUUID.
  const indicatorType = `replay-fills-${useId()}`;
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<Vela | null>(null);
  const frame = useRef(nextFrame);
  const latest = useRef(nextFrame);
  latest.current = nextFrame;
  const update = useRef<(() => void) | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    setError("");
    setReady(false);
    void (async () => {
      const { Vela, registerNativeIndicator, unregisterNativeIndicator } =
        await import("@luxalgo/vela");
      if (disposed || !host.current) return;
      const type = indicatorType;
      registerNativeIndicator({
        type,
        title: t("market_recorded_fills"),
        paneHint: "price",
        overlay: true,
        inputsSchema: () => [],
        defaultInputs: () => ({}),
        create: () => ({
          start(ctx) {
            ctx.emit({
              labels: frame.current.fills.map((fill, index) => ({
                id: `fill-${index}`,
                paneId: "price",
                xloc: "bar_time" as const,
                x: Date.parse(fill.executedAt),
                y: fill.price,
                yloc: "price" as const,
                text: `${fill.side.toUpperCase()} ${fill.quantity}`,
                style: "label_left" as const,
                color: fill.side === "buy" ? "#087f23" : "#bd2626",
                textColor: "#ffffff",
                size: "small" as const,
                textAlign: "center" as const,
                fontFamily: "default" as const,
                overlay: true,
              })),
            });
            ctx.setStatus("idle");
          },
          onBars() {},
          onViewport() {},
          setInputs() {},
          suspend() {},
          resume() {},
          stop() {},
        }),
      });
      const dark = () => document.documentElement.classList.contains("dark");
      const instance = new Vela(host.current, {
        symbol: history.symbol,
        timeframe: { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "1d": "1D" }[
          history.resolution
        ],
        data: latest.current.bars,
        live: false,
        height: 420,
        theme: dark() ? "dark" : "light",
        priceStyle: "candles",
        volume: true,
        drawings: false,
      });
      chart.current = instance;
      frame.current = latest.current;
      instance.addNativeIndicator(type);
      let updating = false;
      // Coalesce rapid scrubbing/ticks instead of queuing expensive Vela reloads.
      const flush = async () => {
        if (updating || disposed) return;
        updating = true;
        try {
          do {
            frame.current = latest.current;
            await instance.setMarket({ data: frame.current.bars });
          } while (!disposed && frame.current !== latest.current);
        } catch {
          if (!disposed)
            setError(t("components_trade_market_data_the_replay_chart_could_not_be_up_bebad1"));
        } finally {
          updating = false;
        }
      };
      update.current = () => {
        void flush();
      };
      const observer = new MutationObserver(() => instance.setTheme(dark() ? "dark" : "light"));
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      cleanup = () => {
        update.current = null;
        observer.disconnect();
        instance.destroy();
        unregisterNativeIndicator(type);
        if (chart.current === instance) chart.current = null;
      };
      await instance.ready();
      if (!disposed) setReady(true);
    })().catch(() => {
      if (!disposed)
        setError(t("components_trade_market_data_the_historical_chart_could_not_b_702b43"));
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [history, indicatorType]);
  useEffect(() => {
    update.current?.();
  }, [nextFrame, history]);
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div
        className="relative h-[420px] overflow-hidden rounded-lg border"
        aria-busy={!ready && !error}
      >
        {!ready && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted/20 text-sm text-muted-foreground"
            role="status"
          >
            {t("components_trade_market_data_preparing_candle_replay_8fa3b7")}
          </div>
        )}
        <div ref={host} className={`h-full ${ready ? "journal-replay-reveal" : "invisible"}`} />
      </div>
    </>
  );
}
