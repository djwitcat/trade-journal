"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Settings2, X } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { HelpHint } from "./ui/tooltip";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OptionSelect } from "./ui/option-select";
import { AI_DEFAULT_MODELS, type AiSettingsPayload } from "@/lib/ai-settings";
import {
  AI_IMPORT_HELP,
  type AiImportOptions as Options,
  type AiImportProvider,
} from "@/lib/ai-import";

export function AiImportOptions({
  enabled,
  onEnabledChange,
  value,
  onChange,
  settings,
  disabled,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  value: Options;
  onChange: (value: Options) => void;
  settings?: AiSettingsPayload;
  disabled: boolean;
}) {
  const t = useTranslations("extracted");
  const [open, setOpen] = useState(false);
  const connection = settings?.aiConnections[value.provider];
  return (
    <Popover.Root open={open && enabled} onOpenChange={setOpen}>
      <div className="flex shrink-0 items-center gap-1.5">
        <Checkbox
          id="ai-import-enabled"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked === true);
            setOpen(checked === true);
          }}
        />
        <Label
          htmlFor="ai-import-enabled"
          className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground"
        >
          {t("components_ai_import_options_parse_with_ai_5ca4c0")}
        </Label>
        <HelpHint heading={t("components_ai_import_options_statement_parsing")}>
          {AI_IMPORT_HELP}
        </HelpHint>
        {enabled && (
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("components_ai_import_options_ai_parsing_settings_a78ed9")}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Settings2 className="size-3.5" />
            </button>
          </Popover.Trigger>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label={t("components_ai_import_options_ai_parsing_settings_a78ed9")}
          className="z-50 w-[360px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("components_ai_import_options_ai_parsing_settings_a78ed9")}
            </span>
            <Popover.Close
              aria-label={t("components_ai_import_options_close_ai_parsing_settings_6ec277")}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </Popover.Close>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="import-ai-provider">
                  {t("components_ai_import_options_ai_provider_f81714")}
                </Label>
                <OptionSelect
                  id="import-ai-provider"
                  value={value.provider}
                  disabled={disabled}
                  onValueChange={(provider) => {
                    const next = provider as AiImportProvider;
                    onChange({
                      provider: next,
                      model: settings?.aiConnections[next].model ?? AI_DEFAULT_MODELS[next],
                      apiKey: "",
                    });
                  }}
                >
                  <option value="openai">{t("components_ai_import_options_openai_a19ee5")}</option>
                  <option value="anthropic">
                    {t("components_ai_import_options_anthropic_b780a2")}
                  </option>
                </OptionSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="import-ai-model">
                  {t("components_ai_import_options_model_id_c7eb22")}
                </Label>
                <Input
                  id="import-ai-model"
                  value={value.model}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...value, model: e.target.value })}
                  placeholder={AI_DEFAULT_MODELS[value.provider]}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="import-ai-key">
                {t(`ai_provider_${value.provider}`)}{" "}
                {t("components_ai_import_options_api_key_cf678c")}
              </Label>
              <Input
                id="import-ai-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={value.apiKey ?? ""}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, apiKey: e.target.value })}
                placeholder={
                  connection?.configured
                    ? t("components_ai_import_options_saved_key_hint")
                    : t("components_ai_import_options_enter_key")
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("components_ai_import_options_keys_entered_here_are_used_for_t_6a7444")}{" "}
                <a href="/settings#ai-settings" className="underline">
                  {t("components_ai_import_options_settings_c7f73b")}
                </a>
                .
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("components_ai_import_options_your_file_will_be_sent_to_4a1465")}{" "}
              {t(`ai_provider_${value.provider}`)}{" "}
              {t("components_ai_import_options_when_you_select_8b602f")}{" "}
              <strong>{t("components_ai_import_options_preview_with_ai_9b5927")}</strong>
              {t("components_ai_import_options_provider_charges_apply_review_th_d965f9")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("components_ai_import_options_csv_tsv_html_xml_txt_and_pdf_up__2e1435")}
            </p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
