"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useApi, postJson } from "@/lib/use-api";
import type { MarketConnection } from "@/lib/market-data";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";
import { providerInfo } from "@/lib/market-providers";
import { MarketCsvSettings } from "./market-csv-settings";

export function MarketDataSettings() {
  const t = useTranslations("extracted");
  const { data, error, refresh } = useApi<{ connections: MarketConnection[] }>(
    "/api/market-data/connections",
  );
  return (
    <Card id="market-data" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t("components_market_data_settings_market_data_bc7eaf")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("components_market_data_settings_connect_historical_prices_for_es_40287c")}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!data && !error && (
          <p className="text-sm text-muted-foreground">
            {t("components_market_data_settings_loading_connections_e2e03e")}
          </p>
        )}
        {data?.connections
          .filter((connection) => connection.id !== "market-csv")
          .map((connection) => (
            <Connection key={connection.id} connection={connection} refresh={refresh} />
          ))}
        <MarketCsvSettings onChange={refresh} />
      </CardContent>
    </Card>
  );
}

function Connection({
  connection,
  refresh,
}: {
  connection: MarketConnection;
  refresh: () => void;
}) {
  const t = useTranslations("extracted");
  const info = providerInfo(connection.id)!;
  const defaults = () =>
    Object.fromEntries(info.fields.map((field) => [field.key, field.defaultValue ?? ""]));
  const [fields, setFields] = useState<Record<string, string>>(defaults);
  const publicSource = info.mode === "public";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const managed = connection.source === "environment";
  const act = async (action: "save" | "remove" | "test" | "enable") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await postJson("/api/market-data/connections", {
        provider: connection.id,
        action,
        ...(action === "save" ? { credentials: fields } : {}),
      });
      setFields(defaults());
      setMessage(
        action === "test"
          ? publicSource
            ? t("components_market_data_settings_public_reachable")
            : t("components_market_data_settings_connection_verified")
          : action === "save"
            ? t("components_market_data_settings_credentials_saved")
            : action === "enable"
              ? t("components_market_data_settings_public_enabled")
              : t("components_market_data_settings_connection_removed"),
      );
      refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("components_market_data_settings_update_failed"),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t(`market_provider_${connection.id}_name`)}</h3>
        <span className="text-xs text-muted-foreground">
          {managed
            ? t("components_market_data_settings_environment_managed")
            : connection.configured
              ? publicSource
                ? t("components_market_data_settings_enabled_no_key")
                : t("components_market_data_settings_credentials_saved_short")
              : t("components_market_data_settings_not_connected")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(`market_provider_${connection.id}_description`)}
      </p>
      {!publicSource && (
        <p className="text-xs text-muted-foreground">
          {t("components_market_data_settings_credentials_are_encrypted_locall_6e4488")}
        </p>
      )}
      {managed && !connection.configured && (
        <p className="text-xs text-destructive">
          {t("components_market_data_settings_complete_all_required_fields_in__e28ba7")}
        </p>
      )}
      {!managed &&
        !publicSource &&
        info.fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`key-${connection.id}-${field.key}`}>
              {t(`market_provider_${connection.id}_${field.key}_label`)}
            </Label>
            {field.options ? (
              <OptionSelect
                id={`key-${connection.id}-${field.key}`}
                value={fields[field.key] ?? ""}
                disabled={busy}
                onValueChange={(value) =>
                  setFields((current) => ({ ...current, [field.key]: value }))
                }
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(
                      `market_provider_${connection.id}_${field.key}_${option.value || "default"}_label`,
                    )}
                  </option>
                ))}
              </OptionSelect>
            ) : (
              <Input
                id={`key-${connection.id}-${field.key}`}
                type="password"
                value={fields[field.key] ?? ""}
                onChange={(event) =>
                  setFields((current) => ({ ...current, [field.key]: event.target.value }))
                }
                placeholder={
                  connection.configured
                    ? t("components_market_data_settings_enter_replacement", {
                        label: t(
                          `market_provider_${connection.id}_${field.key}_label`,
                        ).toLowerCase(),
                      })
                    : t("components_market_data_settings_enter_field", {
                        label: t(
                          `market_provider_${connection.id}_${field.key}_label`,
                        ).toLowerCase(),
                      })
                }
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
            )}
          </div>
        ))}
      <div className="flex flex-wrap gap-2">
        {!managed && !publicSource && (
          <Button
            disabled={busy || info.fields.some((field) => !fields[field.key]?.trim())}
            onClick={() => void act("save")}
          >
            {t("components_market_data_settings_save_credentials_5717c2")}
          </Button>
        )}
        {publicSource && !connection.configured && (
          <Button disabled={busy} onClick={() => void act("enable")}>
            {t("components_market_data_settings_enable_source_74ed84")}
          </Button>
        )}
        {connection.configured && (
          <Button variant="outline" disabled={busy} onClick={() => void act("test")}>
            {t("components_market_data_settings_test_connection_ccf66f")}
          </Button>
        )}
        {connection.configured && !managed && (
          <Button variant="outline" disabled={busy} onClick={() => void act("remove")}>
            {publicSource
              ? t("components_market_data_settings_disable_source")
              : t("components_market_data_settings_remove_credentials")}
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
