"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  RESOLUTIONS,
  type Resolution,
  type MarketConnection,
  type TradeMarketResult,
} from "@/lib/market-data";
import type { TradePoint } from "@/lib/trade-explorer";
import { providerInfo } from "@/lib/market-providers";
import { useApi } from "@/lib/use-api";
import { Button } from "./ui/button";
import { OptionSelect } from "./ui/option-select";

export function ReportMarketEstimates({
  points,
  currencies,
  onComplete,
}: {
  points: TradePoint[];
  currencies: string[];
  onComplete: () => void;
}) {
  const t = useTranslations("extracted");
  const { data } = useApi<{ connections: MarketConnection[] }>("/api/market-data/connections");
  const available = data?.connections.filter((item) => item.configured) ?? [];
  const [provider, setProvider] = useState("");
  const [dataset, setDataset] = useState("");
  const [resolution, setResolution] = useState<Resolution>("1m");
  const info = providerInfo(provider);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const missing = points.filter((point) => point.mae === null || point.mfe === null);
  const calculate = async () => {
    if (!available.some((item) => item.id === provider) || (info?.datasets && !dataset)) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setIssues([]);
    let saved = 0,
      failed = 0,
      completed = 0,
      consecutiveFailures = 0;
    const problems = new Set<string>();
    try {
      for (const point of missing) {
        if (request.signal.aborted) break;
        setStatus(
          t("market_estimate_calculating", {
            current: completed + 1,
            total: missing.length,
            symbol: point.symbol,
          }),
        );
        try {
          const response = await fetch(`/api/trades/${encodeURIComponent(point.key)}/market-data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider,
              symbol: point.symbol,
              resolution,
              dataset,
              basisConfirmed: true,
              estimateOnly: true,
            }),
            signal: request.signal,
          });
          const body = (await response.json()) as TradeMarketResult & { error?: string };
          if (!response.ok) throw new Error(body.error ?? t("market_history_failed"));
          if (body.estimate.mae === null || body.estimate.mfe === null)
            throw new Error(body.estimate.warnings[0] ?? t("market_estimate_unavailable"));
          saved++;
          consecutiveFailures = 0;
        } catch (cause) {
          if (request.signal.aborted) break;
          failed++;
          consecutiveFailures++;
          problems.add(
            `${point.symbol}: ${cause instanceof Error ? cause.message : t("market_history_failed")}`,
          );
          setIssues([...problems].slice(0, 3));
        }
        completed++;
        // Stop a systemic provider failure instead of repeating it across an entire account.
        if (consecutiveFailures >= 3) break;
      }
    } finally {
      setBusy(false);
      setStatus(
        t("market_estimate_status", {
          stopped: request.signal.aborted ? t("market_estimate_stopped") : "",
          saved,
          failed,
          pending: missing.length - completed,
        }),
      );
      onComplete();
    }
  };
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-medium">
          {t("components_report_market_estimates_mae_mfe_estimates_1bd9fc")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {points.length - missing.length} {t("components_report_market_estimates_of_de04fa")}{" "}
          {points.length}{" "}
          {t("components_report_market_estimates_closed_trades_have_saved_estimat_71b325")}
        </p>
      </div>
      {missing.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm">
            {t("components_report_market_estimates_calculate_missing_estimates_0eae40")}
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("components_report_market_estimates_loads_71697c")} {resolution}{" "}
              {t("components_report_market_estimates_candles_for_this_selection_using_71ffa8")}
            </p>
            {available.length ? (
              <>
                <OptionSelect
                  aria-label={t("components_report_market_estimates_estimate_data_provider_23702e")}
                  value={provider}
                  disabled={busy}
                  onValueChange={(value) => {
                    setProvider(value);
                    setDataset("");
                    setConfirmed(false);
                  }}
                >
                  <option value="" disabled>
                    {t("components_report_market_estimates_choose_a_data_source_444bc8")}
                  </option>
                  {available.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(`market_provider_${item.id}_name`)}
                    </option>
                  ))}
                </OptionSelect>
                <OptionSelect
                  aria-label={t(
                    "components_report_market_estimates_estimate_candle_resolution_4c72d7",
                  )}
                  disabled={busy}
                  value={resolution}
                  onValueChange={(value) => setResolution(value as Resolution)}
                >
                  {Object.keys(RESOLUTIONS).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </OptionSelect>
                {info?.datasets && (
                  <OptionSelect
                    aria-label={t("components_report_market_estimates_estimate_dataset_4b0133")}
                    value={dataset}
                    disabled={busy}
                    onValueChange={(value) => {
                      setDataset(value);
                      setConfirmed(false);
                    }}
                  >
                    {info.datasets.map((item) => (
                      <option key={item.value} value={item.value}>
                        {t(`market_provider_${info.id}_dataset_${item.value || "default"}_label`)}
                      </option>
                    ))}
                  </OptionSelect>
                )}
                <p className="text-xs text-muted-foreground">
                  {info && t(`market_provider_${info.id}_symbol_hint`)}
                </p>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy || currencies.length !== 1}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  {t("components_report_market_estimates_i_confirm_these_symbols_price_ad_9832d6")}
                  {currencies.join(", ") || t("components_report_market_estimates_none_71f8e7")}).
                </label>
                {currencies.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "components_report_market_estimates_select_accounts_with_one_currenc_44b545",
                    )}
                  </p>
                )}
                <Button
                  disabled={
                    busy ||
                    !confirmed ||
                    currencies.length !== 1 ||
                    !available.some((item) => item.id === provider) ||
                    Boolean(info?.datasets && !dataset)
                  }
                  onClick={() => void calculate()}
                >
                  {t("components_report_market_estimates_calculate_8e5903")} {missing.length}{" "}
                  {t("components_report_market_estimates_missing_estimates_ad81b9")}
                </Button>
              </>
            ) : (
              <a className="text-sm underline" href="/settings#market-data">
                {t("components_report_market_estimates_connect_a_market_data_provider_i_8e9683")}
              </a>
            )}
          </div>
        </details>
      )}
      {busy && (
        <Button variant="outline" onClick={() => controller.current?.abort()}>
          {t("components_report_market_estimates_stop_calculation_ee3d81")}
        </Button>
      )}
      {status && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}
      {issues.length > 0 && (
        <ul className="space-y-1 text-xs text-destructive">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
