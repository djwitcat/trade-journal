"use client";
import { useTranslations } from "next-intl";
import { OptionSelect } from "@/components/ui/option-select";

import { MonetaryField } from "./privacy";
import { useEffect, useState } from "react";
import { useApi, postJson } from "@/lib/use-api";
import {
  EMPTY_DEFAULTS,
  type JournalDefaults,
  type FeeRule,
  type RiskRule,
} from "@/lib/journal-defaults";
import { Field, fieldClass } from "@/components/filter-fields";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function JournalDefaultSettings() {
  const t = useTranslations("extracted");
  const { data, error } = useApi<JournalDefaults>("/api/workspace/defaults"),
    { data: accounts } = useApi<{ accounts: { id: string; name: string }[] }>("/api/accounts");
  const [draft, setDraft] = useState(EMPTY_DEFAULTS),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  const matchFields = (r: FeeRule | RiskRule, update: (r: FeeRule | RiskRule) => void) => (
    <>
      <Field label={t("components_journal_default_settings_account_85dfa3")}>
        <OptionSelect
          className={fieldClass}
          value={r.accountId}
          onValueChange={(next) => update({ ...r, accountId: next })}
        >
          <option value="">{t("components_journal_default_settings_all_accounts_6a19f2")}</option>
          {accounts?.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </OptionSelect>
      </Field>
      <Field label={t("components_journal_default_settings_symbol_blank_all_a14cc5")}>
        <input
          className={fieldClass}
          value={r.symbol}
          placeholder={t("components_journal_default_settings_e_g_es_d3e087")}
          onChange={(e) => update({ ...r, symbol: e.target.value.toUpperCase() })}
        />
      </Field>
    </>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("components_journal_default_settings_breakeven_fees_and_risk_defaults_0aff5c")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("components_journal_default_settings_breakeven_range_3a43c9")}>
            <MonetaryField sensitive={draft.breakevenMode === "money"}>
              <input
                type="number"
                step="any"
                min="0"
                className={fieldClass}
                value={draft.breakeven}
                onChange={(e) => setDraft({ ...draft, breakeven: Number(e.target.value) })}
              />
            </MonetaryField>
          </Field>
          <Field label={t("components_journal_default_settings_range_unit_9c66a4")}>
            <OptionSelect
              className={fieldClass}
              value={draft.breakevenMode}
              onValueChange={(next) =>
                setDraft({ ...draft, breakevenMode: next as "money" | "percent" })
              }
            >
              <option value="money">
                {t("components_journal_default_settings_account_currency_5844c1")}
              </option>
              <option value="percent">
                {t("components_journal_default_settings_of_entry_notional_581b3d")}
              </option>
            </OptionSelect>
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("components_journal_default_settings_closed_trades_within_this_net_p__9c4834")}
        </p>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            {t("components_journal_default_settings_default_fees_be6cb2")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("components_journal_default_settings_applied_to_new_fills_with_a_zero_5fce7a")}
          </p>
          {draft.feeRules.map((r, i) => {
            const update = (next: FeeRule | RiskRule) =>
              setDraft({
                ...draft,
                feeRules: draft.feeRules.map((old, j) => (j === i ? (next as FeeRule) : old)),
              });
            return (
              <div key={r.id} className="space-y-2 rounded-md border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {matchFields(r, update)}
                  <Field label={t("components_journal_default_settings_fee_amount_de8200")}>
                    <MonetaryField>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className={fieldClass}
                        value={r.amount}
                        onChange={(e) => update({ ...r, amount: Number(e.target.value) })}
                      />
                    </MonetaryField>
                  </Field>
                  <Field label={t("components_journal_default_settings_charge_per_cf4ecd")}>
                    <OptionSelect
                      className={fieldClass}
                      value={r.mode}
                      onValueChange={(next) => update({ ...r, mode: next as FeeRule["mode"] })}
                    >
                      <option value="execution">
                        {t("components_journal_default_settings_execution_6d525b")}
                      </option>
                      <option value="unit">
                        {t("components_journal_default_settings_unit_contract_1c9cbe")}
                      </option>
                    </OptionSelect>
                  </Field>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({ ...draft, feeRules: draft.feeRules.filter((x) => x.id !== r.id) })
                  }
                >
                  {t("components_journal_default_settings_remove_fee_rule_87f934")}
                </Button>
              </div>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                feeRules: [
                  ...draft.feeRules,
                  {
                    id: crypto.randomUUID(),
                    accountId: "",
                    symbol: "",
                    amount: 0,
                    mode: "execution",
                  },
                ],
              })
            }
          >
            {t("components_journal_default_settings_add_fee_rule_8c2f09")}
          </Button>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            {t("components_journal_default_settings_stop_and_target_defaults_b456db")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("components_journal_default_settings_distances_from_weighted_entry_ad_47b2db")}
          </p>
          {draft.riskRules.map((r, i) => {
            const update = (next: FeeRule | RiskRule) =>
              setDraft({
                ...draft,
                riskRules: draft.riskRules.map((old, j) => (j === i ? (next as RiskRule) : old)),
              });
            return (
              <div key={r.id} className="space-y-2 rounded-md border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {matchFields(r, update)}
                  <Field label={t("components_journal_default_settings_stop_distance_68a529")}>
                    <MonetaryField sensitive={r.mode === "price"}>
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        className={fieldClass}
                        value={r.stop}
                        onChange={(e) => update({ ...r, stop: Number(e.target.value) })}
                      />
                    </MonetaryField>
                  </Field>
                  <Field label={t("components_journal_default_settings_target_distance_38cb9e")}>
                    <MonetaryField sensitive={r.mode === "price"}>
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        className={fieldClass}
                        value={r.target}
                        onChange={(e) => update({ ...r, target: Number(e.target.value) })}
                      />
                    </MonetaryField>
                  </Field>
                  <Field label={t("components_journal_default_settings_distance_unit_30b76e")}>
                    <OptionSelect
                      className={fieldClass}
                      value={r.mode}
                      onValueChange={(next) => update({ ...r, mode: next as RiskRule["mode"] })}
                    >
                      <option value="price">
                        {t("components_journal_default_settings_price_points_a92abd")}
                      </option>
                      <option value="percent">
                        {t("components_journal_default_settings_of_entry_price_50e1e1")}
                      </option>
                    </OptionSelect>
                  </Field>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({ ...draft, riskRules: draft.riskRules.filter((x) => x.id !== r.id) })
                  }
                >
                  {t("components_journal_default_settings_remove_risk_rule_0de7c3")}
                </Button>
              </div>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                riskRules: [
                  ...draft.riskRules,
                  {
                    id: crypto.randomUUID(),
                    accountId: "",
                    symbol: "",
                    stop: 1,
                    target: 2,
                    mode: "price",
                  },
                ],
              })
            }
          >
            {t("components_journal_default_settings_add_risk_rule_89c463")}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!data}
            onClick={async () => {
              try {
                setStatus(t("components_journal_default_settings_saving_56a228"));
                await postJson("/api/workspace/defaults", draft);
                setStatus(t("components_journal_default_settings_defaults_saved_f091c6"));
              } catch (e) {
                setStatus(
                  e instanceof Error
                    ? e.message
                    : t("components_journal_default_settings_save_failed_aefc63"),
                );
              }
            }}
          >
            {t("components_journal_default_settings_save_defaults_90df04")}
          </Button>
          <span role="status" className="text-xs">
            {status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
