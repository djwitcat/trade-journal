"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CurrencyPicker } from "./currency-picker";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  DEFAULT_CONVERSION,
  currencyName,
  parseCurrencyConversion,
  type CurrencyConversion,
} from "@/lib/currencies";
import { postJson, useApi } from "@/lib/use-api";

export function CurrencySettings() {
  const t = useTranslations("extracted");
  const settings = useApi<{ currencyConversion: CurrencyConversion }>("/api/settings");
  const accounts = useApi<{ accounts: { currency: string }[] }>("/api/accounts");
  const [enabled, setEnabled] = useState(false);
  const [reportingCurrency, setReportingCurrency] = useState(DEFAULT_CONVERSION.reportingCurrency);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!settings.data) return;
    const config = settings.data.currencyConversion;
    setEnabled(config.enabled);
    setReportingCurrency(config.reportingCurrency);
    setRates(
      Object.fromEntries(Object.entries(config.rates).map(([code, rate]) => [code, String(rate)])),
    );
  }, [settings.data]);
  const currencies = [
    ...new Set([
      reportingCurrency,
      ...(accounts.data?.accounts.map((account) => account.currency) ?? []),
      ...Object.keys(rates),
    ]),
  ].sort();
  const dirty = () => {
    setSaved(false);
    setError("");
  };
  const save = async () => {
    setError("");
    setSaved(false);
    try {
      const parsedRates = Object.fromEntries(
        Object.entries(rates)
          .filter(([code, value]) => code !== reportingCurrency && value.trim() !== "")
          .map(([code, value]) => [code, Number(value)]),
      );
      const config = parseCurrencyConversion({ enabled, reportingCurrency, rates: parsedRates });
      const missing = currencies.filter(
        (code) => code !== reportingCurrency && !config.rates[code],
      );
      if (enabled && missing.length)
        throw new Error(t("currency_missing_rates", { currencies: missing.join(", ") }));
      setBusy(true);
      await postJson("/api/settings", { currencyConversion: config }, "PATCH");
      setSaved(true);
      settings.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("currency_save_failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card id="currency-conversion" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t("components_currency_settings_currency_conversion_3bde41")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("components_currency_settings_combine_accounts_using_your_own__6bb24f")}
        </p>
        <fieldset disabled={busy || !settings.data || !accounts.data} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked);
                dirty();
              }}
            />
            {t("components_currency_settings_convert_dashboard_and_calendar_t_c2739a")}
          </label>
          <div className="space-y-1">
            <Label htmlFor="reporting-currency">
              {t("components_currency_settings_reporting_currency_8b1716")}
            </Label>
            <CurrencyPicker
              id="reporting-currency"
              value={reportingCurrency}
              extraCodes={currencies}
              onChange={(code) => {
                setReportingCurrency(code);
                setRates({});
                dirty();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("components_currency_settings_changing_the_reporting_currency__7b8bf0")}
            </p>
          </div>
          <div className="space-y-3">
            {currencies.map((code) => (
              <div key={code} className="space-y-1">
                <Label htmlFor={`conversion-${code}`}>{currencyName(code)}</Label>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tnum">1 {code} =</span>
                  <Input
                    id={`conversion-${code}`}
                    type="number"
                    step="any"
                    min="0"
                    className="w-40"
                    aria-label={t("currency_rate_aria", { code })}
                    value={code === reportingCurrency ? "1" : (rates[code] ?? "")}
                    disabled={code === reportingCurrency}
                    onChange={(event) => {
                      setRates((current) => ({ ...current, [code]: event.target.value }));
                      dirty();
                    }}
                  />
                  <span>{reportingCurrency}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("components_currency_settings_these_are_fixed_baseline_rates_n_7eeb60")}
          </p>
          <Button onClick={save} disabled={busy}>
            {busy
              ? t("components_currency_settings_saving_56a228")
              : t("components_currency_settings_save_conversion_settings_592e90")}
          </Button>
        </fieldset>
        {(error || settings.error || accounts.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error || settings.error || accounts.error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("components_currency_settings_conversion_settings_saved_dashbo_a9216f")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
