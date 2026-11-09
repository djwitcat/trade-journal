"use client";
import { useTranslations } from "next-intl";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";

import type { AnalysisFilters, FilterKey } from "@luxalgo/journal-core";
import { useApi } from "@/lib/use-api";
import { MonetaryField } from "./privacy";
import { ChevronDown, CircleHelp } from "lucide-react";
import { HoverHint } from "./ui/tooltip";
import { DatePicker } from "./ui/date-picker";
const FIELD_HINTS: Record<string, string> = {
  components_filter_fields_from_3f6605: "from",
  components_filter_fields_to_ae79ea: "to",
  components_filter_fields_strategy_69fb26: "strategy",
  components_filter_fields_symbols_comma_separated_9094f1: "symbols",
  components_filter_fields_exclude_symbols_e7db14: "excludeSymbols",
  components_filter_fields_required_tags_comma_separated_297338: "tags",
  components_filter_fields_required_mistakes_69cb98: "mistakes",
  components_filter_fields_review_status_0fe6b8: "review",
};
export const fieldClass = "h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm";
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useTranslations("extracted");
  const hint = Object.entries(FIELD_HINTS).find(([key]) => label.startsWith(t(key)))?.[1];
  return (
    <label className="journal-filter-field grid min-w-0 gap-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        {label}
        {hint && (
          <HoverHint heading={label} content={t(`filter_hint_${hint}`)}>
            <span
              tabIndex={0}
              aria-label={t("filter_about_label", { label })}
              className="inline-flex cursor-help rounded-sm text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CircleHelp aria-hidden="true" className="h-3 w-3" />
            </span>
          </HoverHint>
        )}
      </span>
      {children}
    </label>
  );
}
export function FilterFields({
  value,
  onChange,
}: {
  value: AnalysisFilters;
  onChange: (v: AnalysisFilters) => void;
}) {
  const t = useTranslations("extracted");
  const { data: accounts } = useApi<{
    accounts: { id: string; name: string; archivedAt: string | null }[];
  }>("/api/accounts");
  const { data: playbooks } = useApi<{ playbooks: { id: string; name: string }[] }>(
    "/api/playbooks",
  );
  const set = (key: FilterKey, v: string) => onChange({ ...value, [key]: v });
  const input = (key: FilterKey, label: string, type = "text") => (
    <Field key={key} label={label}>
      <MonetaryField sensitive={/^(entry|exit|pnl)(Min|Max)$/.test(key)}>
        {type === "date" ? (
          <DatePicker
            value={value[key] ?? ""}
            onValueChange={(next) => set(key, next)}
            label={label}
          />
        ) : (
          <input
            className={fieldClass}
            aria-label={label}
            type={type}
            step={type === "number" ? "any" : undefined}
            value={value[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
          />
        )}
      </MonetaryField>
    </Field>
  );
  const select = (key: FilterKey, label: string, choices: [string, string][]) => (
    <Field key={key} label={label}>
      <span className="journal-filter-select relative block min-w-0">
        <OptionSelect
          className={fieldClass}
          value={value[key] ?? ""}
          onValueChange={(next) => set(key, next)}
        >
          <option value="">{t("components_filter_fields_all_6a7208")}</option>
          {choices.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </OptionSelect>
      </span>
    </Field>
  );
  return (
    <div className="journal-filter-fields space-y-5">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3">
        {input("from", t("components_filter_fields_from_3f6605"), "date")}
        {input("to", t("components_filter_fields_to_ae79ea"), "date")}
        {select(
          "playbookId",
          t("components_filter_fields_strategy_69fb26"),
          (playbooks?.playbooks ?? []).map((p) => [p.id, p.name]),
        )}
        {input("symbol", t("components_filter_fields_symbols_comma_separated_9094f1"))}
        {input("excludeSymbol", t("components_filter_fields_exclude_symbols_e7db14"))}
        {input("tag", t("components_filter_fields_required_tags_comma_separated_297338"))}
        {input("mistake", t("components_filter_fields_required_mistakes_69cb98"))}
        {select("direction", t("components_filter_fields_direction_fd8e45"), [
          ["long", t("filter_choice_long")],
          ["short", t("filter_choice_short")],
        ])}
        {select("status", t("components_filter_fields_outcome_d3f061"), [
          ["closed", t("filter_choice_closed")],
          ["open", t("filter_choice_open")],
          ["win", t("filter_choice_win")],
          ["loss", t("filter_choice_loss")],
          ["breakeven", t("filter_choice_breakeven")],
        ])}
        {select("reviewed", t("components_filter_fields_review_status_0fe6b8"), [
          ["yes", t("filter_choice_reviewed")],
          ["no", t("filter_choice_unreviewed")],
        ])}
        {select(
          "assetClass",
          t("components_filter_fields_asset_class_7c4cc7"),
          ["equity", "futures", "forex", "option", "crypto", "cfd", "other"].map((v) => [
            v,
            t(`filter_asset_${v}`),
          ]),
        )}
      </div>
      <fieldset className="journal-filter-accounts rounded-lg border p-3">
        <legend className="px-1 text-xs text-muted-foreground">
          {t("components_filter_fields_accounts_none_selected_means_all_1a952a")}
        </legend>
        <div className="flex flex-wrap gap-3">
          {accounts?.accounts
            .filter((a) => !a.archivedAt)
            .map((a) => (
              <label key={a.id} className="journal-filter-choice flex items-center gap-2 text-xs">
                <Checkbox
                  checked={(value.accounts ?? "").split(",").includes(a.id)}
                  onCheckedChange={(checked) => {
                    const ids = new Set((value.accounts ?? "").split(",").filter(Boolean));
                    if (checked === true) ids.add(a.id);
                    else ids.delete(a.id);
                    set("accounts", [...ids].join(","));
                  }}
                />
                {a.name}
              </label>
            ))}
        </div>
      </fieldset>
      <details className="journal-filter-advanced">
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>{t("components_filter_fields_size_price_risk_and_time_a7fcd6")}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </summary>
        <div className="journal-filter-advanced-grid mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
          {(
            [
              ["quantity", t("filter_advanced_quantity")],
              ["entry", t("filter_advanced_entry")],
              ["exit", t("filter_advanced_exit")],
              ["duration", t("filter_advanced_duration")],
              ["r", t("filter_advanced_r")],
              ["plannedR", t("filter_advanced_plannedR")],
              ["pnl", t("filter_advanced_pnl")],
              ["rating", t("filter_advanced_rating")],
            ] as const
          ).flatMap(([k, l]) => [
            input(`${k}Min` as FilterKey, t("filter_min", { label: l }), "number"),
            input(`${k}Max` as FilterKey, t("filter_max", { label: l }), "number"),
          ])}
          {input("entryAfter", t("components_filter_fields_entry_after_c0d75c"), "time")}
          {input("entryBefore", t("components_filter_fields_entry_before_fca3e8"), "time")}
          {input("exitAfter", t("components_filter_fields_exit_after_d73d61"), "time")}
          {input("exitBefore", t("components_filter_fields_exit_before_e18d37"), "time")}
        </div>
        <div className="journal-filter-weekdays mt-3 flex flex-wrap gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
            <label key={day} className="journal-filter-choice flex items-center gap-2 text-xs">
              <Checkbox
                checked={(value.weekdays ?? "").split(",").includes(String(i))}
                onCheckedChange={(checked) => {
                  const days = new Set((value.weekdays ?? "").split(",").filter(Boolean));
                  if (checked === true) days.add(String(i));
                  else days.delete(String(i));
                  set("weekdays", [...days].join(","));
                }}
              />
              {t(`filter_weekday_${day}`)}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
