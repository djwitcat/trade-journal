"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/use-api";
import { CurrencyPicker } from "./currency-picker";

export interface CreatedAccount {
  id: string;
  name: string;
  kind: string;
  archivedAt: null;
}

/** Shared local account creation for Import, manual entry and account management. */
export function AccountCreateForm({
  kind,
  onCreated,
  onSavingChange,
  className,
  showTitle = true,
}: {
  kind?: "import" | "manual";
  onCreated: (account: CreatedAccount) => void;
  onSavingChange?: (saving: boolean) => void;
  className?: string;
  showTitle?: boolean;
}) {
  const t = useTranslations("extracted");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [balance, setBalance] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accountKind, setAccountKind] = useState<"manual" | "import">("manual");
  const fieldId = useId();
  const create = async () => {
    if (
      saving ||
      !name.trim() ||
      !/^[A-Z]{3}$/.test(currency) ||
      !balance.trim() ||
      !Number.isFinite(Number(balance)) ||
      Number(balance) < 0
    )
      return;
    setSaving(true);
    onSavingChange?.(true);
    setError("");
    try {
      const result = await postJson<{ id: string }>("/api/accounts", {
        name: name.trim(),
        kind: kind ?? accountKind,
        currency,
        initialBalance: Number(balance),
      });
      onCreated({ id: result.id, name: name.trim(), kind: kind ?? accountKind, archivedAt: null });
      setName("");
      setBalance("0");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("components_account_create_form_account_creation_failed_25e00f"),
      );
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };
  return (
    <form
      className={className ?? "space-y-3"}
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving) void create();
      }}
    >
      {showTitle && (
        <h3 className="text-sm font-medium">
          {t("components_account_create_form_create_account_aaf374")}
        </h3>
      )}
      {!kind && (
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-kind`}>
            {t("components_account_create_form_account_type_144b49")}
          </Label>
          <select
            id={`${fieldId}-kind`}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={accountKind}
            disabled={saving}
            onChange={(event) => setAccountKind(event.target.value as "manual" | "import")}
          >
            <option value="manual">
              {t("components_account_create_form_manual_trades_85760d")}
            </option>
            <option value="import">{t("components_account_create_form_file_import_df8b27")}</option>
          </select>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-name`}>
            {t("components_account_create_form_account_name_abe4d6")}
          </Label>
          <Input
            id={`${fieldId}-name`}
            autoFocus
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
            placeholder={t("components_account_create_form_trading_test_account_64d5e6")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-currency`}>
            {t("components_account_create_form_currency_e070de")}
          </Label>
          <CurrencyPicker
            id={`${fieldId}-currency`}
            value={currency}
            onChange={setCurrency}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-balance`}>
            {t("components_account_create_form_starting_balance_7d5451")}
          </Label>
          <Input
            id={`${fieldId}-balance`}
            required
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={
          saving ||
          !name.trim() ||
          !/^[A-Z]{3}$/.test(currency) ||
          !balance.trim() ||
          !Number.isFinite(Number(balance)) ||
          Number(balance) < 0
        }
      >
        {saving
          ? t("components_account_create_form_creating_94d7d8")
          : t("components_account_create_form_create_account_aaf374")}
      </Button>
    </form>
  );
}
