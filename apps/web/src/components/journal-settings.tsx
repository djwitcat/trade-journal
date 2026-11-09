"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { postJson, useApi } from "@/lib/use-api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { TimeZonePicker } from "./timezone-picker";

interface SettingsPayload {
  timeZone: string;
  importTimeZone: string;
  multipliers: Record<string, number>;
}

export function TimeZoneSettings() {
  const t = useTranslations("extracted");
  const { data, error, refresh } = useApi<SettingsPayload>("/api/settings");
  const [timeZone, setTimeZone] = useState("");
  const [importTimeZone, setImportTimeZone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (data) {
      setTimeZone(data.timeZone);
      setImportTimeZone(data.importTimeZone);
    }
  }, [data]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    setFailure("");
    try {
      await postJson("/api/settings", { timeZone, importTimeZone }, "PATCH");
      setSaved(true);
      refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : t("components_journal_settings_save_failed_0a4444"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("components_journal_settings_timezones_791214")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={busy || !data} className="space-y-4">
          <div>
            <Label htmlFor="display-timezone" className="mb-1 block text-xs text-muted-foreground">
              {t("components_journal_settings_display_timezone_iana_032a49")}
            </Label>
            <TimeZonePicker
              id="display-timezone"
              label={t("components_journal_settings_display_timezone_2425c3")}
              value={timeZone}
              onValueChange={(value) => {
                setTimeZone(value);
                setSaved(false);
              }}
              disabled={busy || !data}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("components_journal_settings_trade_times_calendars_journal_da_eb8865")}
            </p>
            <button
              className="mt-1 text-xs text-muted-foreground underline"
              onClick={() => {
                setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
                setSaved(false);
              }}
            >
              {t("components_journal_settings_use_this_device_s_timezone_050422")}
              {Intl.DateTimeFormat().resolvedOptions().timeZone})
            </button>
          </div>
          <div>
            <Label htmlFor="import-timezone" className="mb-1 block text-xs text-muted-foreground">
              {t("components_journal_settings_default_import_timezone_iana_fd9cd6")}
            </Label>
            <TimeZonePicker
              id="import-timezone"
              label={t("components_journal_settings_default_import_timezone_5ae50d")}
              value={importTimeZone}
              onValueChange={(value) => {
                setImportTimeZone(value);
                setSaved(false);
              }}
              disabled={busy || !data}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("components_journal_settings_used_for_timestamps_without_an_o_4eac97")}
            </p>
          </div>
          <Button onClick={save}>
            {busy
              ? t("components_journal_settings_saving_56a228")
              : t("components_journal_settings_save_timezones_3050a9")}
          </Button>
        </fieldset>
        {(failure || error) && (
          <p role="alert" className="text-sm text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("components_journal_settings_timezones_saved_ef9338")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ContractMultiplierSettings() {
  const t = useTranslations("extracted");
  const { data, error, refresh } = useApi<SettingsPayload>("/api/settings");
  const [multipliers, setMultipliers] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (data)
      setMultipliers(
        Object.entries(data.multipliers)
          .map(([symbol, multiplier]) => `${symbol}=${multiplier}`)
          .join("\n"),
      );
  }, [data]);

  const save = async () => {
    setSaved(false);
    setFailure("");
    const parsed: Record<string, number> = {};
    for (const [index, line] of multipliers.split("\n").entries()) {
      if (!line.trim()) continue;
      const [symbol, value, extra] = line.split("=").map((part) => part.trim());
      if (
        !symbol ||
        !value ||
        extra !== undefined ||
        !Number.isFinite(Number(value)) ||
        Number(value) <= 0 ||
        Object.hasOwn(parsed, symbol.toUpperCase())
      ) {
        setFailure(t("journal_multiplier_line_error", { line: index + 1 }));
        return;
      }
      parsed[symbol.toUpperCase()] = Number(value);
    }
    setBusy(true);
    try {
      await postJson("/api/settings", { multipliers: parsed }, "PATCH");
      setSaved(true);
      refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : t("components_journal_settings_save_failed_0a4444"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="contract-multipliers" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t("components_journal_settings_contract_multipliers_39c1d3")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={busy || !data} className="space-y-4">
          <div>
            <Label
              htmlFor="contract-multiplier-values"
              className="mb-1 block text-xs text-muted-foreground"
            >
              {t("components_journal_settings_futures_options_one_per_line_sym_25bf6c")}
            </Label>
            <textarea
              id="contract-multiplier-values"
              value={multipliers}
              onChange={(event) => {
                setMultipliers(event.target.value);
                setSaved(false);
              }}
              placeholder={t("components_journal_settings_multipliers_placeholder")}
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("components_journal_settings_use_the_exact_symbol_shown_on_yo_f9589b")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("components_journal_settings_saving_multipliers_recalculates__8cfefd")}
          </p>
          <Button onClick={save}>
            {busy
              ? t("components_journal_settings_saving_56a228")
              : t("components_journal_settings_save_multipliers_bdf7fc")}
          </Button>
        </fieldset>
        {(failure || error) && (
          <p role="alert" className="text-sm text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("components_journal_settings_contract_multipliers_saved_ad8f1d")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
