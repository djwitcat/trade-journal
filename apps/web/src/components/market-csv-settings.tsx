"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MAX_CSV_BYTES, type MarketCsvDataset } from "@/lib/market-csv";
import { RESOLUTIONS, type MarketBar, type Resolution } from "@/lib/market-data";
import { postJson, useApi } from "@/lib/use-api";
import { decodeImportFile } from "@/lib/decode-import";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";
import { MonetaryValue } from "./privacy";
interface Preview {
  count: number;
  from: string;
  to: string;
  sample: MarketBar[];
}
export function MarketCsvSettings({ onChange }: { onChange: () => void }) {
  const t = useTranslations("extracted");
  const {
    data,
    refresh,
    error: listError,
  } = useApi<{ datasets: MarketCsvDataset[] }>("/api/market-data/csv");
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [symbol, setSymbol] = useState("");
  const [resolution, setResolution] = useState<Resolution | "">("");
  const [currency, setCurrency] = useState("");
  const [priceBasis, setPriceBasis] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const change = () => {
    setPreview(null);
    setMessage("");
    setError("");
  };
  const act = async (action: "preview" | "import" | "remove", id?: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = await postJson<Preview>("/api/market-data/csv", {
        action,
        id,
        ...file,
        symbol,
        resolution,
        currency,
        priceBasis,
      });
      if (action === "preview") setPreview(body);
      else {
        setPreview(null);
        setMessage(action === "import" ? t("market_csv_imported") : t("market_csv_removed"));
        refresh();
        onChange();
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("components_market_csv_settings_request_failed"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3" id="market-csv">
      <h3 className="text-sm font-medium">
        {t("components_market_csv_settings_market_data_csv_a1d25b")}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("components_market_csv_settings_upload_one_instrument_and_candle_49c27b")}
      </p>
      <a className="text-xs underline" href="/market-data-template.csv" download>
        {t("components_market_csv_settings_download_generic_csv_header_temp_7306ff")}
      </a>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="candle-file">
            {t("components_market_csv_settings_candle_csv_a5833f")}
          </Label>
          <Input
            id="candle-file"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            disabled={busy}
            onChange={async (event) => {
              const selected = event.target.files?.[0];
              change();
              setFile(null);
              if (!selected) return;
              if (selected.size > MAX_CSV_BYTES) {
                setError(t("components_market_csv_settings_file_too_large"));
                return;
              }
              setBusy(true);
              try {
                setFile({
                  name: selected.name,
                  content: decodeImportFile(await selected.arrayBuffer()),
                });
              } catch {
                setError(t("components_market_csv_settings_read_failed"));
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="candle-symbol">
            {t("components_market_csv_settings_instrument_symbol_554d2b")}
          </Label>
          <Input
            id="candle-symbol"
            value={symbol}
            disabled={busy}
            placeholder={t("components_market_csv_settings_exact_symbol_used_in_your_file_34c4f8")}
            onChange={(event) => {
              change();
              setSymbol(event.target.value.trim());
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="candle-resolution">
            {t("components_market_csv_settings_candle_resolution_c7fa26")}
          </Label>
          <OptionSelect
            id="candle-resolution"
            value={resolution}
            disabled={busy}
            onValueChange={(value) => {
              change();
              setResolution(value as Resolution);
            }}
          >
            <option value="" disabled>
              {t("components_market_csv_settings_choose_the_file_s_resolution_11d3fb")}
            </option>
            {Object.keys(RESOLUTIONS).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </OptionSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="candle-currency">
            {t("components_market_csv_settings_quote_currency_e60880")}
          </Label>
          <Input
            id="candle-currency"
            value={currency}
            disabled={busy}
            maxLength={12}
            onChange={(event) => {
              change();
              setCurrency(event.target.value.toUpperCase());
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="candle-basis">
            {t("components_market_csv_settings_price_basis_12d3cc")}
          </Label>
          <OptionSelect
            id="candle-basis"
            value={priceBasis}
            disabled={busy}
            onValueChange={(value) => {
              change();
              setPriceBasis(value);
            }}
          >
            <option value="" disabled>
              {t("components_market_csv_settings_choose_the_file_s_price_basis_9be2b1")}
            </option>
            <option value="raw">{t("components_market_csv_settings_unadjusted_raw_62e98c")}</option>
            <option value="split">
              {t("components_market_csv_settings_split_adjusted_ea29a5")}
            </option>
            <option value="adjusted">
              {t("components_market_csv_settings_other_adjusted_61437e")}
            </option>
            <option value="midpoint">{t("components_market_csv_settings_midpoint_af7648")}</option>
            <option value="bid">{t("components_market_csv_settings_bid_ce75bf")}</option>
            <option value="ask">{t("components_market_csv_settings_ask_356277")}</option>
          </OptionSelect>
        </div>
      </div>
      <Button
        variant="outline"
        disabled={busy || !file || !symbol || !currency || !resolution || !priceBasis}
        onClick={() => void act("preview")}
      >
        {t("components_market_csv_settings_validate_preview_candles_982915")}
      </Button>
      {preview && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs">
            {preview.count.toLocaleString()} {t("components_market_csv_settings_candles_3f4fc7")}{" "}
            {preview.from} {t("components_market_csv_settings_to_4374aa")} {preview.to}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="text-left">
                {t("components_market_csv_settings_first_candles_utc_62fc8f")}
              </caption>
              <thead>
                <tr>
                  {(["time", "open", "high", "low", "close"] as const).map((key) => (
                    <th key={key} className="p-2">
                      {t(`market_csv_column_${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((bar) => (
                  <tr key={bar.time}>
                    <td className="p-2">{new Date(bar.time).toISOString()}</td>
                    {[bar.open, bar.high, bar.low, bar.close].map((value, index) => (
                      <td key={index} className="p-2">
                        <MonetaryValue>{value}</MonetaryValue>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button disabled={busy} onClick={() => void act("import")}>
            {t("components_market_csv_settings_import_market_candles_08ecc0")}
          </Button>
        </div>
      )}
      {(error || listError) && (
        <p role="alert" className="text-xs text-destructive">
          {error || listError}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
      {data?.datasets.map((dataset) => (
        <div
          key={dataset.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0 text-xs">
            <p className="break-all font-medium">
              {dataset.name} · {dataset.symbol} · {dataset.resolution}
            </p>
            <p className="text-muted-foreground">
              {dataset.count.toLocaleString()} {t("components_market_csv_settings_candles_3f4fc7")}{" "}
              {dataset.currency} · {dataset.priceBasis} · {dataset.from.slice(0, 10)} –{" "}
              {dataset.to.slice(0, 10)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void act("remove", dataset.id)}
          >
            {t("components_market_csv_settings_remove_dataset_20584d")}
          </Button>
        </div>
      ))}
    </div>
  );
}
