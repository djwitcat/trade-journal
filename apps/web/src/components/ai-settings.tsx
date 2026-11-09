"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  AI_DEFAULT_MODELS,
  AI_KEY_VARIABLES,
  AI_PROVIDERS,
  type AiProvider,
  type AiSettingsPayload,
} from "@/lib/ai-settings";
import { postJson, useApi } from "@/lib/use-api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";

export function AiSettings() {
  const t = useTranslations("extracted");
  const { data, error, loading, refresh } = useApi<AiSettingsPayload>("/api/settings");
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [model, setModel] = useState(AI_DEFAULT_MODELS.anthropic);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (!data) return;
    setProvider(data.aiProvider);
    setModel(data.aiModel);
    setBaseUrl(data.aiConnections.compatible.baseUrl ?? "");
  }, [data]);

  const connection = data?.aiConnections[provider];
  const environment = connection?.source === "environment";
  const compatible = provider === "compatible";
  const name = t(`ai_provider_${provider}`);
  const disabled = busy || loading || !data;
  const keyHint = environment
    ? t("components_ai_settings_environment_key_hint", {
        variable: AI_KEY_VARIABLES[provider] ?? "",
      })
    : compatible
      ? connection?.source === "saved"
        ? t("components_ai_settings_saved_compatible_key_hint")
        : t("components_ai_settings_optional_key_hint")
      : connection?.configured
        ? t("components_ai_settings_saved_key_hint")
        : t("components_ai_settings_add_key_hint");

  const save = async (remove = false) => {
    setBusy(true);
    setFailure("");
    setSaved("");
    try {
      await postJson(
        "/api/settings",
        remove
          ? {
              [`${provider}Key`]: null,
            }
          : {
              aiProvider: provider,
              aiModel: model.trim(),
              ...(compatible ? { compatibleBaseUrl: baseUrl.trim() } : {}),
              ...(apiKey.trim() ? { [`${provider}Key`]: apiKey.trim() } : {}),
            },
        "PATCH",
      );
      setApiKey("");
      setSaved(
        remove
          ? t("components_ai_settings_key_removed", { name })
          : t("components_ai_settings_settings_saved", { name }),
      );
      refresh();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : t("components_ai_settings_save_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="ai-settings" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{t("components_ai_settings_ai_bring_your_own_key_47e5e7")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("components_ai_settings_use_anthropic_openai_deepseek_or_6b1185")}
        </p>
        {data && (
          <p className="text-xs text-muted-foreground">
            {t("components_ai_settings_active_provider_3e60f1")}{" "}
            {t(`ai_provider_${data.aiProvider}`)} ·{" "}
            {data.aiConfigured
              ? data.aiProvider === "compatible"
                ? t("components_ai_settings_server_configured")
                : t("components_ai_settings_key_configured")
              : t("components_ai_settings_not_configured")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ai-provider">{t("components_ai_settings_provider_7ceee3")}</Label>
            <OptionSelect
              id="ai-provider"
              value={provider}
              disabled={disabled}
              onValueChange={(value) => {
                const next = value as AiProvider;
                setProvider(next);
                setModel(data?.aiConnections[next].model ?? AI_DEFAULT_MODELS[next]);
                setApiKey("");
                setSaved("");
                setFailure("");
              }}
            >
              {AI_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {t(`ai_provider_${id}`)}
                </option>
              ))}
            </OptionSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ai-model">{t("components_ai_settings_model_id_c7eb22")}</Label>
            <Input
              id="ai-model"
              value={model}
              disabled={disabled}
              placeholder={compatible ? "e.g. llama3.1:8b" : AI_DEFAULT_MODELS[provider]}
              onChange={(event) => {
                setModel(event.target.value);
                setSaved("");
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("components_ai_settings_use_a_text_model_available_to_yo_bba972")}
        </p>
        {compatible && (
          <div className="space-y-1">
            <Label htmlFor="ai-base-url">{t("components_ai_settings_server_url_1d5d1e")}</Label>
            <Input
              id="ai-base-url"
              type="url"
              value={baseUrl}
              disabled={disabled}
              placeholder={t("components_ai_settings_http_localhost_11434_v1_1a9858")}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setSaved("");
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t("components_ai_settings_the_api_root_your_server_documen_b52316")}
            </p>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ai-api-key">
            {compatible
              ? t("components_ai_settings_api_key_optional")
              : t("components_ai_settings_provider_api_key", { name })}
          </Label>
          <Input
            id="ai-api-key"
            type="password"
            value={apiKey}
            disabled={disabled || environment}
            onChange={(event) => {
              setApiKey(event.target.value);
              setSaved("");
            }}
            placeholder={
              connection?.source
                ? t("components_ai_settings_key_configured")
                : compatible
                  ? t("components_ai_settings_optional")
                  : provider === "anthropic"
                    ? "sk-ant-…"
                    : "sk-…"
            }
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">{keyHint}</p>
        </div>
        {(error || failure) && (
          <p role="alert" className="text-xs text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-xs text-profit">
            {saved}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              disabled ||
              !model.trim() ||
              (compatible ? !baseUrl.trim() : !apiKey.trim() && !connection?.configured)
            }
            onClick={() => save()}
          >
            {busy
              ? t("components_ai_settings_saving")
              : t("components_ai_settings_save_ai_settings")}
          </Button>
          {connection?.source === "saved" && (
            <Button variant="outline" disabled={disabled} onClick={() => save(true)}>
              {t("components_ai_settings_remove_e96390")} {name}{" "}
              {t("components_ai_settings_key_a62f22")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
