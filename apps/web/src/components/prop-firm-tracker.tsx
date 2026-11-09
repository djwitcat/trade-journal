"use client";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Landmark,
  Plus,
  Download,
  Upload,
} from "lucide-react";
import { FilterBar } from "./filter-bar";
import { Field } from "./filter-fields";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { OptionSelect } from "./ui/option-select";
import { DatePicker } from "./ui/date-picker";
import { EquityArea } from "./charts/equity-area";
import { usePrivacy } from "./privacy";
import { useApi } from "@/lib/use-api";
import { PropCashSummary, PropCashComparison } from "./prop-cash-overview";
import { createPropDemo } from "@/lib/prop-demo";
import { PropFirmModal, type PropModal } from "./prop-firm-forms";
import {
  cashMovements,
  cashSummary,
  cashTimeline,
  payoutProgress,
  propMoney,
  currencyDigits,
  fromMinor,
  type PropData,
  type PropEntry,
  type CashMovement,
  type PropReceipt,
} from "@/lib/prop-firms";
const PAGE_SIZE = 40;
const inDates = (day: string, from: string, to: string) =>
  (!from || day >= from) && (!to || day <= to);
function downloadCsv(rows: CashMovement[]) {
  const cell = (value: string) => {
    const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const header = "id,entry_id,account_id,firm,currency,date,kind,amount,category,reference";
  const csv = [
    header,
    ...rows.map((row) =>
      [
        row.id,
        row.entryId,
        row.accountId ?? "",
        row.firm,
        row.currency,
        row.date,
        row.kind,
        fromMinor(row.amountMinor, row.currency),
        row.category,
        row.reference,
      ]
        .map(cell)
        .join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "prop-cash-flows.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
export function PropFirmTracker() {
  const t = useTranslations("extracted");
  const { data: savedData, error, loading, refresh } = useApi<PropData>("/api/prop-firms");
  const [demo, setDemo] = useState<PropData | null>(null);
  const [showBreakdowns, setShowBreakdowns] = useState(false);
  const data = demo ?? savedData;
  const privacy = usePrivacy();
  const [tab, setTab] = useState("overview"),
    [firm, setFirm] = useState(""),
    [accountId, setAccountId] = useState(""),
    [currency, setCurrency] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [search, setSearch] = useState(""),
    [showArchived, setShowArchived] = useState(false),
    [showVoided, setShowVoided] = useState(false),
    [page, setPage] = useState(0),
    [modal, setModal] = useState<PropModal | null>(null);
  useEffect(
    () => setPage(0),
    [tab, firm, accountId, currency, from, to, search, showArchived, showVoided],
  );
  useEffect(() => {
    if (privacy) setModal(null);
  }, [privacy]);
  const readOnly = privacy || Boolean(demo);
  const switchDemo = () => {
    setDemo(
      demo ? null : createPropDemo(savedData?.today ?? new Date().toISOString().slice(0, 10)),
    );
    setModal(null);
    setFirm("");
    setAccountId("");
    setCurrency(demo ? "" : "USD");
    setFrom("");
    setTo("");
    setSearch("");
    setPage(0);
    setShowArchived(false);
    setShowVoided(false);
    setTab("overview");
  };
  const allCash = useMemo(() => (data ? cashMovements(data.entries, data.receipts) : []), [data]);
  const payouts = useMemo(
    () => (data ? payoutProgress(data.entries, data.receipts, data.today) : []),
    [data],
  );
  const payoutById = useMemo(() => new Map(payouts.map((row) => [row.entry.id, row])), [payouts]);
  const receiptsById = useMemo(() => {
    const map = new Map<string, PropReceipt[]>();
    for (const row of data?.receipts ?? []) {
      const list = map.get(row.payoutId) ?? [];
      list.push(row);
      map.set(row.payoutId, list);
    }
    return map;
  }, [data]);
  const firms = useMemo(
    () =>
      [
        ...new Set([
          ...(data?.accounts.map((a) => a.firm) ?? []),
          ...(data?.entries.map((e) => e.firm) ?? []),
        ]),
      ].sort(),
    [data],
  );
  const currencies = useMemo(
    () =>
      [
        ...new Set([
          ...(data?.accounts.map((a) => a.currency) ?? []),
          ...(data?.entries.map((e) => e.currency) ?? []),
        ]),
      ].sort(),
    [data],
  );
  const selectedCurrency = currency || (currencies.length === 1 ? currencies[0]! : "");
  const matches = (row: { firm: string; accountId: string | null; currency: string }) =>
    (!firm || row.firm === firm) &&
    (!accountId || row.accountId === accountId) &&
    (!currency || row.currency === currency);
  const cash = useMemo(
    () => allCash.filter((row) => matches(row) && inDates(row.date, from, to)),
    [allCash, firm, accountId, currency, from, to],
  );
  const summaryCash = useMemo(
    () => cash.filter((row) => row.currency === selectedCurrency),
    [cash, selectedCurrency],
  );
  const summary = useMemo(() => cashSummary(summaryCash), [summaryCash]);
  const selectedPayouts = payouts.filter((row) => matches(row.entry));
  const outstanding = selectedPayouts
    .filter((row) => row.entry.currency === selectedCurrency)
    .reduce((sum, row) => sum + row.remaining, 0);
  const overdue = selectedPayouts.filter((row) => row.overdue);
  const accountRows = (data?.accounts ?? []).filter((a) => matches({ ...a, accountId: a.id }));
  const active = accountRows.filter((a) => a.status === "active" && !a.archived);
  const resolved = accountRows.filter(
    (a) =>
      ["evaluation", "verification"].includes(a.program) &&
      ["passed", "breached"].includes(a.status),
  );
  const passed = resolved.filter((a) => a.status === "passed").length;
  const renewals = active
    .filter(
      (a) =>
        a.renewalOn &&
        a.renewalOn <=
          new Date(Date.parse(`${data?.today}T12:00:00Z`) + 30 * 86_400_000)
            .toISOString()
            .slice(0, 10),
    )
    .sort((a, b) => a.renewalOn!.localeCompare(b.renewalOn!));
  const money = (amount: number, code = selectedCurrency) =>
    privacy ? "••••" : code ? propMoney(amount, code) : "—";
  const name = (id: string | null) =>
    data?.accounts.find((a) => a.id === id)?.name ?? t("prop_shared_firm_cost");
  const query = search.toLowerCase().trim();
  const entries = (data?.entries ?? [])
    .filter(
      (e) =>
        matches(e) &&
        (showVoided || !e.voided) &&
        inDates(e.occurredOn, from, to) &&
        (!query ||
          `${e.firm} ${name(e.accountId)} ${e.kind} ${e.category} ${e.reference}`
            .toLowerCase()
            .includes(query)),
    )
    .sort(
      (a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
    );
  const listedPayouts = selectedPayouts
    .filter(
      (row) =>
        (row.entry.status === "requested" ||
          row.entry.status === "approved" ||
          inDates(row.entry.occurredOn, from, to)) &&
        (!query ||
          `${row.entry.firm} ${name(row.entry.accountId)} ${row.entry.status} ${row.entry.reference}`
            .toLowerCase()
            .includes(query)),
    )
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        b.entry.occurredOn.localeCompare(a.entry.occurredOn),
    );
  const listedAccounts = accountRows.filter(
    (a) =>
      (showArchived || !a.archived) &&
      (!query || `${a.firm} ${a.name} ${a.program} ${a.status}`.toLowerCase().includes(query)),
  );
  const cashByAccount = useMemo(() => {
    const groups = new Map<string, CashMovement[]>();
    for (const row of cash) {
      const key = row.accountId ?? "";
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    return groups;
  }, [cash]);
  const byFirm = [...new Set(summaryCash.map((row) => row.firm))]
    .map((value) => ({
      firm: value,
      ...cashSummary(summaryCash.filter((row) => row.firm === value)),
    }))
    .sort((a, b) => b.net - a.net);
  const byCategory = EXPENSE_ROWS(summaryCash);
  const months = [...new Set(summaryCash.map((row) => row.date.slice(0, 7)))]
    .sort()
    .reverse()
    .map((month) => ({
      month,
      ...cashSummary(summaryCash.filter((row) => row.date.startsWith(month))),
    }));
  const rowCount =
    tab === "accounts"
      ? listedAccounts.length
      : tab === "payouts"
        ? listedPayouts.length
        : entries.length;
  const safePage = Math.min(page, Math.max(0, Math.ceil(rowCount / PAGE_SIZE) - 1));
  const slice = <T,>(rows: T[]) => rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const entryActions = (entry: PropEntry) => (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={readOnly}
        onClick={() => setModal({ kind: "detail", type: "entry", id: entry.id })}
      >
        {t("components_prop_firm_tracker_details_dc3dec")}
      </Button>
      {!entry.voided && (
        <Button
          size="sm"
          variant="ghost"
          disabled={readOnly}
          onClick={() => setModal({ kind: "entry", entry, type: entry.kind })}
        >
          {t("components_prop_firm_tracker_edit_530164")}
        </Button>
      )}
      {!entry.voided && entry.kind === "expense" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={readOnly}
          onClick={() => setModal({ kind: "entry", type: "refund", expense: entry })}
        >
          {t("components_prop_firm_tracker_refund_e17c8a")}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={readOnly}
        onClick={() =>
          setModal({
            kind: "change",
            action: "entry.void",
            id: entry.id,
            revision: entry.revision,
            value: !entry.voided,
            name: entry.voided ? t("prop_restore_entry") : t("prop_void_entry"),
          })
        }
      >
        {entry.voided ? t("prop_restore") : t("prop_void")}
      </Button>
    </div>
  );
  return (
    <div>
      <FilterBar
        title={t("components_prop_firm_tracker_prop_firms_8c2eca")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!data || readOnly}
              onClick={() => setModal({ kind: "account" })}
            >
              <Plus className="h-4 w-4" />
              {t("components_prop_firm_tracker_track_account_4ebee1")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data || readOnly}
              onClick={() => setModal({ kind: "entry", type: "expense" })}
            >
              <ArrowUpRight className="h-4 w-4" />
              {t("components_prop_firm_tracker_add_expense_d83567")}
            </Button>
            <Button
              size="sm"
              disabled={!data || readOnly}
              onClick={() => setModal({ kind: "entry", type: "payout" })}
            >
              <ArrowDownLeft className="h-4 w-4" />
              {t("components_prop_firm_tracker_track_payout_483821")}
            </Button>
          </div>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {t("components_prop_firm_tracker_spending_payouts_4ef6f2")}
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {t("components_prop_firm_tracker_see_what_you_paid_what_came_back_297b51")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={switchDemo}>
              {demo ? t("prop_exit_demo") : t("prop_load_demo")}
            </Button>
            <details className="relative">
              <summary className="cursor-pointer rounded-md border px-3 py-2 text-xs font-medium">
                {t("components_prop_firm_tracker_data_tools_57bf2b")}
              </summary>
              <div className="absolute right-0 z-20 mt-2 flex w-48 flex-col gap-1 rounded-lg border bg-card p-2 shadow-lg">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!data || readOnly}
                  onClick={() => setModal({ kind: "import" })}
                >
                  <Upload className="h-4 w-4" />
                  {t("components_prop_firm_tracker_import_csv_eeec98")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!cash.length || readOnly}
                  onClick={() => downloadCsv(cash)}
                >
                  <Download className="h-4 w-4" />
                  {t("components_prop_firm_tracker_export_cash_csv_d00fa8")}
                </Button>
              </div>
            </details>
          </div>
        </div>
        {demo && (
          <div
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"
          >
            <span className="font-medium">
              {t("components_prop_firm_tracker_demo_preview_32e988")}
            </span>
            <span className="ml-2 text-muted-foreground">
              {t("components_prop_firm_tracker_simulated_records_read_only_noth_0a78a0")}
            </span>
          </div>
        )}
        {privacy && (
          <p className="rounded-lg border p-3 text-sm text-muted-foreground">
            {t("components_prop_firm_tracker_privacy_mode_hides_amounts_chart_941534")}
          </p>
        )}
        {error && !demo && (
          <p
            role="alert"
            className="rounded-lg border border-destructive p-3 text-sm text-destructive"
          >
            {error}{" "}
            <Button variant="ghost" onClick={refresh}>
              {t("components_prop_firm_tracker_retry_9f5cd8")}
            </Button>
          </p>
        )}
        {loading && !data && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("components_prop_firm_tracker_loading_your_prop_cash_records_1f8fe3")}
          </p>
        )}
        {data && (
          <>
            {!data.accounts.length && !data.entries.length && (
              <Card>
                <CardContent className="flex flex-wrap items-center gap-5 py-7">
                  <Landmark className="h-10 w-10 text-muted-foreground" />
                  <div className="max-w-2xl">
                    <h3 className="font-semibold">
                      {t("components_prop_firm_tracker_start_with_an_account_or_an_expe_79e102")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("components_prop_firm_tracker_add_the_firm_and_attempt_you_wan_14b959")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <details className="rounded-xl border bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm">
                <span className="font-medium">
                  {t("components_prop_firm_tracker_filters_96e578")}
                </span>
                <span className="ml-3 text-xs text-muted-foreground">
                  {firm || t("prop_all_firms")} ·{" "}
                  {accountId ? name(accountId) : t("prop_all_accounts")} ·{" "}
                  {from || to
                    ? t("prop_date_range", {
                        from: from || t("prop_start"),
                        to: to || t("prop_today"),
                      })
                    : t("prop_all_dates")}
                  {selectedCurrency ? ` · ${selectedCurrency}` : ` · ${t("prop_choose_currency")}`}
                </span>
              </summary>
              <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-5">
                <Field label={t("prop_filter_firm")}>
                  <OptionSelect
                    value={firm}
                    onValueChange={(value) => {
                      setFirm(value);
                      setAccountId("");
                    }}
                  >
                    <option value="">{t("components_prop_firm_tracker_all_firms_f46304")}</option>
                    {firms.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </OptionSelect>
                </Field>
                <Field label={t("prop_filter_account")}>
                  <OptionSelect value={accountId} onValueChange={setAccountId}>
                    <option value="">
                      {t("components_prop_firm_tracker_all_accounts_shared_costs_daeb61")}
                    </option>
                    {data.accounts
                      .filter((a) => !firm || a.firm === firm)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.archived ? t("prop_archived_suffix") : ""}
                        </option>
                      ))}
                  </OptionSelect>
                </Field>
                <Field label={t("prop_filter_currency")}>
                  <OptionSelect value={currency} onValueChange={setCurrency}>
                    <option value="">
                      {currencies.length > 1
                        ? t("prop_choose_currency_for_totals")
                        : t("prop_all_currencies")}
                    </option>
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </OptionSelect>
                </Field>
                <Field label={t("prop_filter_cash_from")}>
                  <DatePicker
                    label={t("prop_filter_cash_from_date")}
                    value={from}
                    max={to || data.today}
                    onValueChange={setFrom}
                  />
                </Field>
                <Field label={t("prop_filter_cash_through")}>
                  <DatePicker
                    label={t("prop_filter_cash_through_date")}
                    value={to}
                    min={from}
                    max={data.today}
                    onValueChange={setTo}
                  />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 xl:col-span-5">
                  <p className="text-xs text-muted-foreground">
                    {t("components_prop_firm_tracker_dates_apply_to_cash_received_or__2a2f32")}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFirm("");
                      setAccountId("");
                      setCurrency("");
                      setFrom("");
                      setTo("");
                      setSearch("");
                    }}
                  >
                    {t("components_prop_firm_tracker_clear_filters_412226")}
                  </Button>
                </div>
              </div>
            </details>
            {from && to && from > to && (
              <p role="alert" className="text-sm text-destructive">
                {t("components_prop_firm_tracker_the_start_date_must_be_on_or_bef_97c5e5")}
              </p>
            )}
            {currencies.length > 1 && !selectedCurrency && (
              <Card>
                <CardContent className="py-4">
                  <p className="mb-3 text-sm">
                    {t("components_prop_firm_tracker_currencies_are_never_added_toget_46afc5")}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {currencies.map((c) => (
                      <p key={c} className="text-sm">
                        <strong>{c}</strong> {t("components_prop_firm_tracker_net_cash_df0c37")}{" "}
                        {money(cashSummary(cash.filter((r) => r.currency === c)).net, c)}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <PropCashSummary summary={summary} currency={selectedCurrency} privacy={privacy} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  {t("components_prop_firm_tracker_awaiting_payout_1d1fc1")}
                </span>
                <strong className="tabular-nums">{money(outstanding)}</strong>
                <span className="text-xs text-muted-foreground">
                  {overdue.length ? `${overdue.length} overdue · ` : ""}
                  {t("components_prop_firm_tracker_all_dates_excluded_from_received_a0355a")}
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setTab("payouts")}>
                {t("components_prop_firm_tracker_view_payout_requests_0d6950")}
              </Button>
            </div>
            <div
              role="tablist"
              aria-label={t("components_prop_firm_tracker_prop_tracker_sections_392b27")}
              className="flex gap-2 overflow-x-auto"
            >
              {["overview", "accounts", "payouts", "ledger"].map((v) => (
                <Button
                  key={v}
                  role="tab"
                  aria-selected={tab === v}
                  variant={tab === v ? "secondary" : "outline"}
                  onClick={() => setTab(v)}
                >
                  {t(`prop_enum_${v}`)}
                </Button>
              ))}
            </div>
            {tab === "overview" ? (
              <div className="space-y-4">
                <PropCashComparison months={months} currency={selectedCurrency} privacy={privacy} />
                <details
                  className="rounded-xl border bg-card"
                  open={showBreakdowns}
                  onToggle={(event) => setShowBreakdowns(event.currentTarget.open)}
                >
                  <summary className="cursor-pointer p-4">
                    <span className="text-sm font-medium">
                      {t("components_prop_firm_tracker_detailed_breakdowns_3d0e5f")}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("components_prop_firm_tracker_net_cash_trend_firm_returns_expe_67a4d8")}
                    </span>
                  </summary>
                  {showBreakdowns && (
                    <div className="space-y-4 border-t p-3 sm:p-4">
                      <div className="grid gap-4 xl:grid-cols-3">
                        <Card className="xl:col-span-2">
                          <CardHeader>
                            <CardTitle>
                              {t("components_prop_firm_tracker_net_cash_over_time_aa27c3")}
                              {selectedCurrency ? ` · ${selectedCurrency}` : ""}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {privacy ? (
                              <Empty>
                                {t(
                                  "components_prop_firm_tracker_chart_hidden_in_privacy_mode_7fcde6",
                                )}
                              </Empty>
                            ) : !selectedCurrency ? (
                              <Empty>
                                {t(
                                  "components_prop_firm_tracker_choose_a_currency_to_plot_cash_r_8245a0",
                                )}
                              </Empty>
                            ) : summaryCash.length ? (
                              <EquityArea
                                curve="stepAfter"
                                currency={selectedCurrency}
                                valueLabel={t("prop_net_cash_period")}
                                data={cashTimeline(summaryCash).map((p) => ({
                                  t: p.date,
                                  cumNetPnl: p.net / 10 ** currencyDigits(selectedCurrency),
                                }))}
                              />
                            ) : (
                              <Empty>
                                {t(
                                  "components_prop_firm_tracker_record_spending_or_a_payout_rece_f428a4",
                                )}
                              </Empty>
                            )}
                            <p className="mt-3 text-xs text-muted-foreground">
                              {t(
                                "components_prop_firm_tracker_starts_at_zero_for_the_selected__77e3c2",
                              )}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {t("components_prop_firm_tracker_account_progress_all_dates_e7b5de")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span>
                                {t(
                                  "components_prop_firm_tracker_active_evaluations_verifications_7a1bb9",
                                )}
                              </span>
                              <strong>
                                {
                                  active.filter((a) =>
                                    ["evaluation", "verification"].includes(a.program),
                                  ).length
                                }
                              </strong>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>
                                {t("components_prop_firm_tracker_active_funded_live_76d73f")}
                              </span>
                              <strong>
                                {
                                  active.filter((a) =>
                                    ["funded", "instant_funded", "live"].includes(a.program),
                                  ).length
                                }
                              </strong>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>
                                {t("components_prop_firm_tracker_resolved_phase_pass_rate_e73bfa")}
                              </span>
                              <strong>
                                {resolved.length
                                  ? `${Math.round((passed / resolved.length) * 100)}%`
                                  : "—"}
                              </strong>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {passed} {t("components_prop_firm_tracker_passed_d76156")}{" "}
                              {resolved.length}{" "}
                              {t(
                                "components_prop_firm_tracker_passed_or_breached_evaluation_ph_d72a81",
                              )}
                            </p>
                            <p className="border-t pt-4 text-xs text-muted-foreground">
                              {t(
                                "components_prop_firm_tracker_link_accounts_to_journal_trades__f1fa64",
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {t("components_prop_firm_tracker_returns_by_firm_f5f2f6")}
                              {selectedCurrency ? ` · ${selectedCurrency}` : ""}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {byFirm.length ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b text-xs text-muted-foreground">
                                      <th className="py-2">
                                        {t("components_prop_firm_tracker_firm_257145")}
                                      </th>
                                      <th>{t("components_prop_firm_tracker_net_spend_19bf6f")}</th>
                                      <th>
                                        {t("components_prop_firm_tracker_payout_cash_ac083c")}
                                      </th>
                                      <th>{t("components_prop_firm_tracker_net_return_6252b6")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {byFirm.map((row) => (
                                      <tr key={row.firm} className="border-b last:border-0">
                                        <td className="py-3 pr-3">{row.firm}</td>
                                        <td className="pr-3">{money(row.netSpend)}</td>
                                        <td className="pr-3">{money(row.received)}</td>
                                        <td>{money(row.net)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <Empty>
                                {t(
                                  "components_prop_firm_tracker_no_cash_movements_in_this_select_818b0c",
                                )}
                              </Empty>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              {t("components_prop_firm_tracker_spending_breakdown_a295d0")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {byCategory.length ? (
                              byCategory.map((row) => (
                                <div key={row.category}>
                                  <div className="flex justify-between gap-3 text-sm">
                                    <span>{t(`prop_enum_${row.category}`)}</span>
                                    <span>{money(row.amount)}</span>
                                  </div>
                                  {!privacy && (
                                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full bg-foreground/60"
                                        style={{
                                          width: `${summary.spent ? (row.amount / summary.spent) * 100 : 0}%`,
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <Empty>
                                {t(
                                  "components_prop_firm_tracker_no_recorded_expenses_in_this_sel_04da96",
                                )}
                              </Empty>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {t(
                                "components_prop_firm_tracker_gross_spending_by_category_refun_7b1ec9",
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {t(
                              "components_prop_firm_tracker_upcoming_renewals_next_30_days_o_33d3fd",
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {renewals.length ? (
                            <div className="space-y-3">
                              {renewals.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {a.firm} · {a.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {a.renewalOn} ·{" "}
                                      {a.renewalMinor === null
                                        ? t("prop_amount_not_set")
                                        : money(a.renewalMinor, a.currency)}
                                      {a.renewalOn! < data.today
                                        ? t("prop_review_overdue_renewal")
                                        : ""}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={readOnly}
                                    onClick={() =>
                                      setModal({
                                        kind: "entry",
                                        type: "expense",
                                        accountId: a.id,
                                        category: "subscription",
                                      })
                                    }
                                  >
                                    {t("components_prop_firm_tracker_record_charge_b1c7c3")}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Empty>
                              {t("components_prop_firm_tracker_no_renewals_scheduled_193bc6")}
                            </Empty>
                          )}
                          <p className="mt-3 text-xs text-muted-foreground">
                            {t(
                              "components_prop_firm_tracker_reminders_do_not_create_expenses_8d15af",
                            )}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {t("components_prop_firm_tracker_monthly_cash_review_51ad9f")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {months.length ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b text-xs text-muted-foreground">
                                    <th className="py-2">
                                      {t("components_prop_firm_tracker_month_082bc3")}
                                    </th>
                                    <th>{t("components_prop_firm_tracker_spent_c0d3c9")}</th>
                                    <th>{t("components_prop_firm_tracker_refunded_d6fbc7")}</th>
                                    <th>{t("components_prop_firm_tracker_payout_cash_ac083c")}</th>
                                    <th>{t("components_prop_firm_tracker_net_9bb81c")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {months.map((row) => (
                                    <tr key={row.month} className="border-b last:border-0">
                                      <td className="py-3">{row.month}</td>
                                      <td>{money(row.spent)}</td>
                                      <td>{money(row.refunds)}</td>
                                      <td>{money(row.received)}</td>
                                      <td>{money(row.net)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Empty>
                              {t("components_prop_firm_tracker_no_settled_cash_yet_a1c684")}
                            </Empty>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </details>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    aria-label={t("components_prop_firm_tracker_search_prop_records_07d6b3")}
                    className="max-w-sm"
                    placeholder={t(
                      "components_prop_firm_tracker_search_firm_account_reference_or_8b58da",
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {tab === "accounts" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                      />
                      {t("components_prop_firm_tracker_show_archived_accounts_0ca9c7")}
                    </label>
                  )}
                  {tab === "ledger" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showVoided}
                        onChange={(e) => setShowVoided(e.target.checked)}
                      />
                      {t("components_prop_firm_tracker_show_voided_records_713d47")}
                    </label>
                  )}
                  <p className="ml-auto text-xs text-muted-foreground">
                    {rowCount} {t("components_prop_firm_tracker_records_86761b")}
                  </p>
                </div>
                {tab === "accounts" && (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {slice(listedAccounts).map((a) => {
                      const accountSummary = cashSummary(
                        (cashByAccount.get(a.id) ?? []).filter(
                          (row) => row.currency === a.currency,
                        ),
                      );
                      return (
                        <Card key={a.id}>
                          <CardContent className="space-y-4 py-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">{a.name}</h3>
                                <p className="text-xs text-muted-foreground">
                                  {a.firm} · {t(`prop_enum_${a.program}`)}
                                  {a.sizeMinor !== null
                                    ? ` · ${money(a.sizeMinor, a.currency)} nominal`
                                    : ""}
                                </p>
                              </div>
                              <span className="rounded-md border px-2 py-1 text-xs">
                                {a.archived ? "Archived · " : ""}
                                {t(`prop_enum_${a.status}`)}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("components_prop_firm_tracker_net_spend_19bf6f")}
                                </p>
                                {money(accountSummary.netSpend, a.currency)}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("components_prop_firm_tracker_payout_cash_ac083c")}
                                </p>
                                {money(accountSummary.received, a.currency)}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("components_prop_firm_tracker_net_return_6252b6")}
                                </p>
                                {money(accountSummary.net, a.currency)}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t("components_prop_firm_tracker_opened_c4f1f5")} {a.openedOn}
                              {a.closedOn ? ` · Resolved ${a.closedOn}` : ""}
                              {a.parentId ? ` · Follows ${name(a.parentId)}` : ""}
                              {t(
                                "components_prop_firm_tracker_cash_follows_the_selected_dates_65c647",
                              )}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={readOnly}
                                onClick={() =>
                                  setModal({ kind: "detail", type: "account", id: a.id })
                                }
                              >
                                {t("components_prop_firm_tracker_details_receipts_df59c3")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={readOnly}
                                onClick={() => setModal({ kind: "account", account: a })}
                              >
                                {t("components_prop_firm_tracker_edit_530164")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={readOnly}
                                onClick={() => setModal({ kind: "account", parent: a })}
                              >
                                {t("components_prop_firm_tracker_next_attempt_phase_eb26cb")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={readOnly}
                                onClick={() =>
                                  setModal({
                                    kind: "change",
                                    action: "account.archive",
                                    id: a.id,
                                    revision: a.revision,
                                    value: !a.archived,
                                    name: a.archived
                                      ? t("prop_restore_account")
                                      : t("prop_archive_account"),
                                  })
                                }
                              >
                                {a.archived ? t("prop_restore") : t("prop_archive")}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {tab === "payouts" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t("components_prop_firm_tracker_open_requests_always_remain_visi_65bb60")}
                    </p>
                    {slice(listedPayouts).map((row) => (
                      <Card key={row.entry.id}>
                        <CardContent className="space-y-4 py-5">
                          <div className="flex flex-wrap justify-between gap-3">
                            <div>
                              <h3 className="font-medium">
                                {row.entry.firm} · {name(row.entry.accountId)}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {t("components_prop_firm_tracker_requested_c26bf6")}{" "}
                                {row.entry.occurredOn}
                                {row.entry.dueOn ? ` · Expected ${row.entry.dueOn}` : ""}
                              </p>
                            </div>
                            <span
                              className={`rounded-md border px-2 py-1 text-xs ${row.overdue ? "border-destructive text-destructive" : ""}`}
                            >
                              {row.overdue
                                ? "Overdue · "
                                : row.partial
                                  ? "Partially received · "
                                  : ""}
                              {t(`prop_enum_${row.entry.status}`)}
                            </span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("components_prop_firm_tracker_expected_net_152b5f")}
                              </p>
                              {money(row.expected, row.entry.currency)}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("components_prop_firm_tracker_actual_received_171e71")}
                              </p>
                              {money(row.actual, row.entry.currency)}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("components_prop_firm_tracker_outstanding_f8ee57")}
                              </p>
                              {money(row.remaining, row.entry.currency)}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("components_prop_firm_tracker_actual_expected_c5c804")}
                              </p>
                              {money(row.variance, row.entry.currency)}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={
                                readOnly || ["rejected", "cancelled"].includes(row.entry.status)
                              }
                              onClick={() => setModal({ kind: "receipt", payout: row.entry })}
                            >
                              {t("components_prop_firm_tracker_record_receipt_reversal_9d85c0")}
                            </Button>
                            {entryActions(row.entry)}
                          </div>
                          <details>
                            <summary className="cursor-pointer text-xs">
                              {t("components_prop_firm_tracker_cash_movements_e0eec5")}{" "}
                              {(receiptsById.get(row.entry.id) ?? []).length}
                            </summary>
                            <div className="mt-2 space-y-2">
                              {(receiptsById.get(row.entry.id) ?? []).map((r) => (
                                <div
                                  key={r.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"
                                >
                                  <span>
                                    {r.occurredOn} · {t(`prop_enum_${r.kind}`)} ·{" "}
                                    {money(r.amountMinor, row.entry.currency)}
                                    {r.voided ? " · Voided" : ""}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={readOnly || row.entry.voided}
                                    onClick={() =>
                                      setModal({
                                        kind: "change",
                                        action: "receipt.void",
                                        id: r.id,
                                        payoutId: r.payoutId,
                                        revision: row.entry.revision,
                                        value: !r.voided,
                                        name: r.voided
                                          ? t("prop_restore_cash_movement")
                                          : t("prop_void_cash_movement"),
                                      })
                                    }
                                  >
                                    {r.voided ? t("prop_restore") : t("prop_void")}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </details>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
                {tab === "ledger" && (
                  <Card>
                    <CardContent className="overflow-x-auto pt-4">
                      <p className="mb-3 text-xs text-muted-foreground">
                        {t("components_prop_firm_tracker_expenses_and_refunds_use_cash_da_328097")}
                      </p>
                      <table className="w-full min-w-[740px] text-left text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="py-2">
                              {t("components_prop_firm_tracker_date_eb9a4b")}
                            </th>
                            <th>{t("components_prop_firm_tracker_firm_account_a356dd")}</th>
                            <th>{t("components_prop_firm_tracker_entry_19172e")}</th>
                            <th>{t("components_prop_firm_tracker_amount_43dc85")}</th>
                            <th>{t("components_prop_firm_tracker_status_bae7d5")}</th>
                            <th>{t("components_prop_firm_tracker_actions_c3cd63")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slice(entries).map((entry) => (
                            <tr
                              key={entry.id}
                              className={`border-b last:border-0 ${entry.voided ? "opacity-60" : ""}`}
                            >
                              <td className="py-3 pr-3">{entry.occurredOn}</td>
                              <td className="pr-3">
                                {entry.firm}
                                <p className="text-xs text-muted-foreground">
                                  {name(entry.accountId)}
                                </p>
                              </td>
                              <td className="pr-3">
                                {t(`prop_enum_${entry.kind}`)}
                                <p className="text-xs text-muted-foreground">
                                  {entry.kind === "expense"
                                    ? t(`prop_enum_${entry.category}`)
                                    : entry.reference}
                                </p>
                              </td>
                              <td className="pr-3 tabular-nums">
                                {money(
                                  entry.kind === "payout"
                                    ? (payoutById.get(entry.id)?.expected ?? 0)
                                    : entry.amountMinor,
                                  entry.currency,
                                )}
                                {entry.kind === "payout" && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("components_prop_firm_tracker_expected_net_152b5f")}
                                  </p>
                                )}
                              </td>
                              <td>
                                {entry.voided
                                  ? t("prop_enum_voided")
                                  : t(`prop_enum_${entry.status}`)}
                              </td>
                              <td>{entryActions(entry)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
                {!rowCount && (
                  <Empty>
                    {t("components_prop_firm_tracker_no_records_match_this_view_119b21")}
                  </Empty>
                )}
                {rowCount > PAGE_SIZE && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      {t("components_prop_firm_tracker_previous_50f942")}
                    </Button>
                    <span className="text-xs">
                      {t("components_prop_firm_tracker_page_fb0627")} {safePage + 1}{" "}
                      {t("components_prop_firm_tracker_of_de04fa")}{" "}
                      {Math.ceil(rowCount / PAGE_SIZE)}
                    </span>
                    <Button
                      variant="outline"
                      disabled={(safePage + 1) * PAGE_SIZE >= rowCount}
                      onClick={() => setPage(safePage + 1)}
                    >
                      {t("components_prop_firm_tracker_next_bc9819")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <details className="rounded-xl border p-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">
                {t("components_prop_firm_tracker_how_these_numbers_work_f79c70")}
              </summary>
              <div className="mt-3 space-y-2">
                <p>{t("components_prop_firm_tracker_net_cash_return_actual_payout_re_aeb91f")}</p>
                <p>{t("components_prop_firm_tracker_amounts_use_each_currency_s_mino_811106")}</p>
                <p>{t("components_prop_firm_tracker_past_attempts_breached_accounts__7259c4")}</p>
                <p>{t("components_prop_firm_tracker_requests_and_reminders_never_mov_2c853a")}</p>
              </div>
            </details>
          </>
        )}
        {modal && data && !readOnly && (
          <PropFirmModal modal={modal} data={data} close={() => setModal(null)} refresh={refresh} />
        )}
      </div>
    </div>
  );
}
function EXPENSE_ROWS(rows: CashMovement[]) {
  const groups = new Map<string, number>();
  for (const row of rows)
    if (row.kind === "expense")
      groups.set(row.category, (groups.get(row.category) ?? 0) + row.amountMinor);
  return [...groups]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
