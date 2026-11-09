"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { MonetaryField } from "@/components/privacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postJson } from "@/lib/use-api";

import { AccountPicker } from "./account-picker";
import { fmtNumber } from "@/lib/utils";

interface ManualLeg {
  datetime: string;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  fee: string;
}

export function ManualTradeEntry({ onSaved }: { onSaved: () => void }) {
  const t = useTranslations("extracted");
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [legs, setLegs] = useState<ManualLeg[]>([
    { datetime: "", side: "buy", quantity: "", price: "", fee: "" },
    { datetime: "", side: "sell", quantity: "", price: "", fee: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fieldId = useId();

  const setLeg = (index: number, patch: Partial<ManualLeg>) =>
    setLegs((current) => current.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  const valid =
    accountId &&
    symbol &&
    legs.some((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "");

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await postJson("/api/executions", {
        accountId,
        ...(notes.trim() ? { notes } : {}),
        executions: legs
          .filter((leg) => leg.datetime && Number(leg.quantity) > 0 && leg.price !== "")
          .map((leg) => ({
            symbol,
            side: leg.side,
            quantity: Number(leg.quantity),
            price: Number(leg.price),
            fee: leg.fee === "" ? 0 : Number(leg.fee),
            executedAt: new Date(leg.datetime).toISOString(),
          })),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t save the trade. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset disabled={busy} className="min-w-0 space-y-3">
      <AccountPicker value={accountId} onChange={setAccountId} kind="manual" />
      <div>
        <Label htmlFor={`${fieldId}-symbol`} className="mb-1 block text-xs text-muted-foreground">
          {t("components_manual_trade_entry_symbol_3f84ef")}
        </Label>
        <Input
          id={`${fieldId}-symbol`}
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
          placeholder={t("components_manual_trade_entry_aapl_esz6_btcusdt_b6cd6e")}
        />
      </div>
      <div className="manual-executions space-y-3">
        {legs.map((leg, index) => (
          <fieldset
            key={index}
            className="manual-execution-row grid min-w-0 gap-2 rounded-lg border p-3"
          >
            <legend className="px-1 text-xs text-muted-foreground">
              {t("components_manual_trade_entry_execution_6d525b")} {index + 1}
            </legend>
            <label className="manual-execution-date grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("components_manual_trade_entry_date_time_7eb29d")}
              <Input
                type="datetime-local"
                value={leg.datetime}
                onChange={(event) => setLeg(index, { datetime: event.target.value })}
              />
            </label>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span id={`${fieldId}-execution-side-${index}`}>
                {t("components_manual_trade_entry_side_265283")}
              </span>
              <Select
                value={leg.side}
                onValueChange={(value) => setLeg(index, { side: value as "buy" | "sell" })}
              >
                <SelectTrigger aria-labelledby={`${fieldId}-execution-side-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">
                    {t("components_manual_trade_entry_buy_7ceca5")}
                  </SelectItem>
                  <SelectItem value="sell">
                    {t("components_manual_trade_entry_sell_fa3cf2")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("components_manual_trade_entry_quantity_44f6af")}
              <Input
                placeholder={t("components_manual_trade_entry_qty_77e74d")}
                inputMode="decimal"
                value={leg.quantity}
                onChange={(event) => setLeg(index, { quantity: event.target.value })}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("components_manual_trade_entry_price_3e8248")}
              <MonetaryField>
                <Input
                  placeholder={t("components_manual_trade_entry_price_2097c3")}
                  inputMode="decimal"
                  value={leg.price}
                  onChange={(event) => setLeg(index, { price: event.target.value })}
                />
              </MonetaryField>
            </label>
            <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              {t("components_manual_trade_entry_fee_c6e89c")}
              <MonetaryField>
                <Input
                  placeholder={t("components_manual_trade_entry_fee_9c15cd")}
                  inputMode="decimal"
                  value={leg.fee}
                  onChange={(event) => setLeg(index, { fee: event.target.value })}
                />
              </MonetaryField>
            </label>
          </fieldset>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-notes`}>
          {t("components_manual_trade_entry_notes_optional_4d56ca")}
        </Label>
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={100000}
          rows={4}
          placeholder={t("components_manual_trade_entry_your_setup_why_you_took_the_trad_c749cc")}
          className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          {t("components_manual_trade_entry_markdown_supported_notes_are_sav_3e0300")}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setLegs((current) => [
              ...current,
              { datetime: "", side: "sell", quantity: "", price: "", fee: "" },
            ])
          }
        >
          {t("components_manual_trade_entry_add_execution_93b5c9")}
        </Button>
        <Button size="sm" onClick={save} disabled={!valid || busy}>
          {busy
            ? t("components_manual_trade_entry_saving_56a228")
            : t("components_manual_trade_entry_save_trade_2ba4ec")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("components_manual_trade_entry_dates_and_times_use_your_device__11a940")}{" "}
        {symbol || "the symbol"}{" "}
        {t("components_manual_trade_entry_are_stitched_into_round_trips_au_0de198")}
        {fmtNumber(legs.filter((leg) => leg.datetime).length, 0)}{" "}
        {t("components_manual_trade_entry_legs_so_far_49a770")}
      </p>
    </fieldset>
  );
}
