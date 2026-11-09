"use client";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { OptionSelect } from "./ui/option-select";
import { DatePicker } from "./ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Field, fieldClass } from "./filter-fields";
import { Attachments } from "./attachments";
import { useApi, postJson } from "@/lib/use-api";
import { decodeImportFile } from "@/lib/decode-import";
import {
  fromMinor,
  PROP_PROGRAMS,
  PROP_STATES,
  PAYOUT_STATES,
  EXPENSE_CATEGORIES,
  type PropAccount,
  type PropEntry,
  type PropData,
  type PropAudit,
} from "@/lib/prop-firms";
export type PropModal =
  | { kind: "account"; account?: PropAccount; parent?: PropAccount }
  | {
      kind: "entry";
      entry?: PropEntry;
      type: PropEntry["kind"];
      accountId?: string;
      category?: string;
      expense?: PropEntry;
    }
  | { kind: "receipt"; payout: PropEntry }
  | { kind: "detail"; type: "account" | "entry"; id: string }
  | {
      kind: "change";
      action: string;
      id: string;
      revision: number;
      payoutId?: string;
      value: boolean;
      name: string;
    }
  | { kind: "import" };
type Props = { modal: PropModal; data: PropData; close: () => void; refresh: () => void };
export function PropFirmModal(props: Props) {
  const { modal, close } = props;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-w-2xl">
        {modal.kind === "account" ? (
          <AccountForm {...props} modal={modal} />
        ) : modal.kind === "entry" ? (
          <EntryForm {...props} modal={modal} />
        ) : modal.kind === "receipt" ? (
          <ReceiptForm {...props} modal={modal} />
        ) : modal.kind === "change" ? (
          <ChangeForm {...props} modal={modal} />
        ) : modal.kind === "import" ? (
          <ImportForm {...props} />
        ) : (
          <Detail {...props} modal={modal} />
        )}
      </DialogContent>
    </Dialog>
  );
}
function useSave(close: () => void, refresh: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const save = async (body: unknown) => {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/prop-firms", body);
      refresh();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, save };
}
function Form({
  title,
  description,
  busy,
  error,
  children,
  submit,
}: {
  title: string;
  description: string;
  busy: boolean;
  error: string;
  children: ReactNode;
  submit: () => void;
}) {
  const t = useTranslations("extracted");
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) submit();
        }}
      >
        <fieldset disabled={busy} className="space-y-4">
          {children}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? t("components_prop_firm_forms_saving_56a228")
            : t("components_prop_firm_forms_save_record_506b9b")}
        </Button>
      </form>
    </>
  );
}
const blankAccount = (today: string, parent?: PropAccount) => ({
  firm: parent?.firm ?? "",
  name: "",
  program: "evaluation",
  status: "active",
  currency: parent?.currency ?? "",
  size: parent?.sizeMinor == null ? "" : fromMinor(parent.sizeMinor, parent.currency),
  parentId: parent?.id ?? "",
  journalAccountId: "",
  openedOn: today,
  closedOn: "",
  renewalOn: "",
  renewalAmount: "",
  notes: "",
  reason: "",
});
function AccountForm({
  modal,
  data,
  close,
  refresh,
}: Props & { modal: Extract<PropModal, { kind: "account" }> }) {
  const t = useTranslations("extracted");
  const old = modal.account;
  const [id] = useState(() => old?.id ?? crypto.randomUUID());
  const [values, set] = useState(() =>
    old
      ? {
          firm: old.firm,
          name: old.name,
          program: old.program,
          status: old.status,
          currency: old.currency,
          size: old.sizeMinor == null ? "" : fromMinor(old.sizeMinor, old.currency),
          parentId: old.parentId ?? "",
          journalAccountId: old.journalAccountId ?? "",
          openedOn: old.openedOn,
          closedOn: old.closedOn ?? "",
          renewalOn: old.renewalOn ?? "",
          renewalAmount: old.renewalMinor == null ? "" : fromMinor(old.renewalMinor, old.currency),
          notes: old.notes,
          reason: "",
        }
      : blankAccount(data.today, modal.parent),
  );
  const { data: journal } = useApi<{ accounts: { id: string; name: string }[] }>(
    "/api/accounts?summary=1",
  );
  const { busy, error, save } = useSave(close, refresh);
  const input = (key: keyof typeof values, title: string, required = false) => (
    <Field label={title}>
      <Input
        value={values[key]}
        required={required}
        onChange={(e) =>
          set({
            ...values,
            [key]: key === "currency" ? e.target.value.toUpperCase() : e.target.value,
          })
        }
      />
    </Field>
  );
  return (
    <Form
      title={
        old
          ? t("components_prop_firm_forms_edit_prop_account_3a2170")
          : modal.parent
            ? t("components_prop_firm_forms_track_next_attempt_or_phase_edf78b")
            : t("components_prop_firm_forms_track_a_prop_account_fb2e8e")
      }
      description={t("components_prop_firm_forms_keep_each_evaluation_reset_attem_fc701d")}
      busy={busy}
      error={error}
      submit={() =>
        void save({ action: "account.save", id, revision: old?.revision ?? 0, ...values })
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {input("firm", t("components_prop_firm_forms_firm_name_81c2cf"), true)}
        {input("name", t("components_prop_firm_forms_account_attempt_name_8d1ebf"), true)}
        <Field label={t("components_prop_firm_forms_program_9d6800")}>
          <OptionSelect
            value={values.program}
            onValueChange={(program) => set({ ...values, program })}
          >
            {PROP_PROGRAMS.map((v) => (
              <option key={v} value={v}>
                {t(`prop_enum_${v}`)}
              </option>
            ))}
          </OptionSelect>
        </Field>
        <Field label={t("components_prop_firm_forms_status_bae7d5")}>
          <OptionSelect
            value={values.status}
            onValueChange={(status) =>
              set({
                ...values,
                status,
                closedOn: status === "active" ? "" : values.closedOn || data.today,
                renewalOn: status === "active" ? values.renewalOn : "",
              })
            }
          >
            {PROP_STATES.map((v) => (
              <option key={v} value={v}>
                {t(`prop_enum_${v}`)}
              </option>
            ))}
          </OptionSelect>
        </Field>
        {input("currency", t("components_prop_firm_forms_currency_code_28a6fb"), true)}
        {input("size", t("components_prop_firm_forms_nominal_account_size_optional_dadb3f"))}
        <Field label={t("components_prop_firm_forms_opened_on_b9db19")}>
          <DatePicker
            label={t("components_prop_firm_forms_prop_account_opening_date_5ef424")}
            value={values.openedOn}
            max={data.today}
            onValueChange={(openedOn) => set({ ...values, openedOn })}
          />
        </Field>
        {values.status !== "active" && (
          <Field label={t("components_prop_firm_forms_resolved_on_6632fb")}>
            <DatePicker
              label={t("components_prop_firm_forms_prop_account_closing_date_e3f5d7")}
              value={values.closedOn}
              max={data.today}
              onValueChange={(closedOn) => set({ ...values, closedOn })}
            />
          </Field>
        )}
        <Field label={t("components_prop_firm_forms_previous_attempt_phase_19af1c")}>
          <OptionSelect
            value={values.parentId}
            onValueChange={(parentId) => set({ ...values, parentId })}
          >
            <option value="">{t("components_prop_firm_forms_none_6eef66")}</option>
            {data.accounts
              .filter(
                (a) =>
                  a.id !== id &&
                  a.firm.toLowerCase() === values.firm.trim().toLowerCase() &&
                  a.currency === values.currency,
              )
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </OptionSelect>
        </Field>
        <Field label={t("components_prop_firm_forms_link_journal_account_optional_f74940")}>
          <OptionSelect
            value={values.journalAccountId}
            onValueChange={(journalAccountId) => set({ ...values, journalAccountId })}
          >
            <option value="">{t("components_prop_firm_forms_no_journal_link_0084fb")}</option>
            {journal?.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </OptionSelect>
        </Field>
      </div>
      <details>
        <summary className="cursor-pointer text-sm">
          {t("components_prop_firm_forms_renewal_reminder_d33419")}
        </summary>
        <p className="my-2 text-xs text-muted-foreground">
          {t("components_prop_firm_forms_a_reminder_only_record_an_expens_790af9")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("components_prop_firm_forms_next_renewal_4dcc98")}>
            <DatePicker
              label={t("components_prop_firm_forms_next_renewal_date_89b2d1")}
              value={values.renewalOn}
              onValueChange={(renewalOn) => set({ ...values, renewalOn })}
            />
          </Field>
          {input("renewalAmount", t("components_prop_firm_forms_expected_renewal_amount_caa1f3"))}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => set({ ...values, renewalOn: "", renewalAmount: "" })}
        >
          {t("components_prop_firm_forms_clear_reminder_41888e")}
        </Button>
      </details>
      <Field label={t("components_prop_firm_forms_notes_rules_breach_reason_5e2e3d")}>
        <textarea
          className={`${fieldClass} h-24 py-2`}
          value={values.notes}
          onChange={(e) => set({ ...values, notes: e.target.value })}
        />
      </Field>
      {old && input("reason", t("components_prop_firm_forms_reason_for_change_213a56"), true)}
    </Form>
  );
}
function EntryForm({
  modal,
  data,
  close,
  refresh,
}: Props & { modal: Extract<PropModal, { kind: "entry" }> }) {
  const t = useTranslations("extracted");
  const old = modal.entry,
    expense = modal.expense;
  const [id] = useState(() => old?.id ?? crypto.randomUUID());
  const initialAccount = data.accounts.find(
    (a) => a.id === (old?.accountId ?? expense?.accountId ?? modal.accountId),
  );
  const [values, set] = useState({
    accountId: old?.accountId ?? expense?.accountId ?? initialAccount?.id ?? "",
    firm: old?.firm ?? expense?.firm ?? initialAccount?.firm ?? "",
    currency: old?.currency ?? expense?.currency ?? initialAccount?.currency ?? "",
    category: old?.category ?? modal.category ?? "evaluation",
    amount: old ? fromMinor(old.amountMinor, old.currency) : "",
    splitPercent: old ? (old.splitBps / 100).toFixed(2) : "",
    fee: old ? fromMinor(old.feeMinor, old.currency) : "0",
    occurredOn: old?.occurredOn ?? data.today,
    dueOn: old?.dueOn ?? "",
    status: old?.status ?? "requested",
    parentId: old?.parentId ?? expense?.id ?? "",
    reference: old?.reference ?? "",
    notes: old?.notes ?? "",
    reason: "",
  });
  const kind = old?.kind ?? modal.type,
    payout = kind === "payout",
    refund = kind === "refund";
  const { busy, error, save } = useSave(close, refresh);
  const input = (key: keyof typeof values, title: string, required = false, disabled = false) => (
    <Field label={title}>
      <Input
        required={required}
        disabled={disabled}
        value={values[key]}
        onChange={(e) =>
          set({
            ...values,
            [key]: key === "currency" ? e.target.value.toUpperCase() : e.target.value,
          })
        }
      />
    </Field>
  );
  return (
    <Form
      title={
        old
          ? t("prop_edit_kind", { kind: t(`prop_enum_${kind}`) })
          : payout
            ? t("components_prop_firm_forms_log_a_payout_request_90eda9")
            : refund
              ? t("components_prop_firm_forms_record_an_expense_refund_bae1d0")
              : t("components_prop_firm_forms_record_prop_spending_968e59")
      }
      description={
        payout
          ? t("components_prop_firm_forms_a_request_is_not_income_record_a_f18107")
          : t("components_prop_firm_forms_record_cash_that_actually_change_501ac9")
      }
      busy={busy}
      error={error}
      submit={() =>
        void save({ action: "entry.save", id, revision: old?.revision ?? 0, kind, ...values })
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("components_prop_firm_forms_prop_account_35b345")}>
          <OptionSelect
            disabled={Boolean(old || refund)}
            value={values.accountId}
            onValueChange={(accountId) => {
              const a = data.accounts.find((a) => a.id === accountId);
              set({ ...values, accountId, firm: a?.firm ?? "", currency: a?.currency ?? "" });
            }}
          >
            <option value="">
              {payout
                ? t("components_prop_firm_forms_choose_a_funded_account_67fd01")
                : t("components_prop_firm_forms_shared_firm_expense_801aec")}
            </option>
            {data.accounts
              .filter((a) => !payout || ["funded", "instant_funded", "live"].includes(a.program))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firm} · {a.name}
                  {a.archived ? t("components_prop_firm_forms_archived_128aef") : ""}
                </option>
              ))}
          </OptionSelect>
        </Field>
        {input(
          "firm",
          t("components_prop_firm_forms_firm_257145"),
          true,
          Boolean(values.accountId || old || refund),
        )}
        {input(
          "currency",
          t("components_prop_firm_forms_currency_e070de"),
          true,
          Boolean(values.accountId || old || refund),
        )}
        {!payout && !refund && (
          <Field label={t("components_prop_firm_forms_expense_category_a78210")}>
            <OptionSelect
              value={values.category}
              onValueChange={(category) => set({ ...values, category })}
            >
              {EXPENSE_CATEGORIES.map((v) => (
                <option key={v} value={v}>
                  {t(`prop_enum_${v}`)}
                </option>
              ))}
            </OptionSelect>
          </Field>
        )}
        {input("amount", payout ? t("prop_gross_requested_amount") : t("prop_actual_amount"), true)}
        {payout && (
          <>
            {input("splitPercent", t("components_prop_firm_forms_your_share_e61090"), true)}
            {input(
              "fee",
              t("components_prop_firm_forms_fees_withheld_from_your_share_124aaa"),
              true,
            )}
            <p className="col-span-full text-xs text-muted-foreground">
              {t("components_prop_firm_forms_if_your_amount_is_already_after__606715")}
            </p>
          </>
        )}
        <Field
          label={
            payout
              ? t("components_prop_firm_forms_request_date_f1ea5c")
              : t("components_prop_firm_forms_cash_date_cca069")
          }
        >
          <DatePicker
            label={
              payout
                ? t("components_prop_firm_forms_payout_request_date_aa23a0")
                : t("components_prop_firm_forms_transaction_date_4680ef")
            }
            value={values.occurredOn}
            max={data.today}
            onValueChange={(occurredOn) => set({ ...values, occurredOn })}
          />
        </Field>
        {payout && (
          <>
            <Field label={t("components_prop_firm_forms_expected_payment_date_optional_deb3ff")}>
              <DatePicker
                label={t("components_prop_firm_forms_expected_payout_date_4c0256")}
                value={values.dueOn}
                onValueChange={(dueOn) => set({ ...values, dueOn })}
              />
            </Field>
            <Field label={t("components_prop_firm_forms_payout_status_0dbe36")}>
              <OptionSelect
                value={values.status}
                onValueChange={(status) =>
                  set({ ...values, status: status as PropEntry["status"] })
                }
              >
                {PAYOUT_STATES.filter((s) => old || s !== "completed").map((v) => (
                  <option key={v} value={v}>
                    {t(`prop_enum_${v}`)}
                  </option>
                ))}
              </OptionSelect>
            </Field>
          </>
        )}
        {input("reference", t("components_prop_firm_forms_invoice_payment_reference_8878ee"))}
      </div>
      <Field label={t("components_prop_firm_forms_notes_704400")}>
        <textarea
          className={`${fieldClass} h-20 py-2`}
          value={values.notes}
          onChange={(e) => set({ ...values, notes: e.target.value })}
        />
      </Field>
      {refund && (
        <p className="text-xs text-muted-foreground">
          {t("components_prop_firm_forms_linked_expense_36c89f")} {values.parentId}
          {t("components_prop_firm_forms_refunds_reduce_costs_and_are_sho_0137dd")}
        </p>
      )}
      {old && input("reason", t("components_prop_firm_forms_reason_for_change_213a56"), true)}
    </Form>
  );
}
function ReceiptForm({
  modal,
  data,
  close,
  refresh,
}: Props & { modal: Extract<PropModal, { kind: "receipt" }> }) {
  const t = useTranslations("extracted");
  const { payout } = modal;
  const [id] = useState(() => crypto.randomUUID());
  const [values, set] = useState({
    kind: "receipt",
    amount: "",
    occurredOn: data.today,
    reference: "",
    notes: "",
  });
  const { busy, error, save } = useSave(close, refresh);
  return (
    <Form
      title={t("components_prop_firm_forms_record_payout_cash_movement_a877de")}
      description={t("prop_receipt_description", { currency: payout.currency })}
      busy={busy}
      error={error}
      submit={() =>
        void save({
          action: "receipt.add",
          id,
          payoutId: payout.id,
          revision: payout.revision,
          ...values,
        })
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("components_prop_firm_forms_movement_dc8127")}>
          <OptionSelect value={values.kind} onValueChange={(kind) => set({ ...values, kind })}>
            <option value="receipt">{t("components_prop_firm_forms_money_received_bb9cec")}</option>
            <option value="reversal">
              {t("components_prop_firm_forms_money_returned_reversed_2211d6")}
            </option>
          </OptionSelect>
        </Field>
        <Field label={t("prop_actual_amount_currency", { currency: payout.currency })}>
          <Input
            required
            value={values.amount}
            onChange={(e) => set({ ...values, amount: e.target.value })}
          />
        </Field>
        <Field label={t("components_prop_firm_forms_settlement_date_181540")}>
          <DatePicker
            label={t("components_prop_firm_forms_settlement_date_181540")}
            value={values.occurredOn}
            max={data.today}
            onValueChange={(occurredOn) => set({ ...values, occurredOn })}
          />
        </Field>
        <Field label={t("components_prop_firm_forms_bank_reference_44d0df")}>
          <Input
            value={values.reference}
            onChange={(e) => set({ ...values, reference: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("components_prop_firm_forms_notes_704400")}>
        <textarea
          className={`${fieldClass} h-20 py-2`}
          value={values.notes}
          onChange={(e) => set({ ...values, notes: e.target.value })}
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        {t("components_prop_firm_forms_keep_the_request_open_for_partia_4f54ca")}
      </p>
    </Form>
  );
}
function ChangeForm({
  modal,
  close,
  refresh,
}: Props & { modal: Extract<PropModal, { kind: "change" }> }) {
  const t = useTranslations("extracted");
  const [reason, setReason] = useState("");
  const { busy, error, save } = useSave(close, refresh);
  return (
    <Form
      title={modal.name}
      description={
        modal.action === "account.archive"
          ? t("components_prop_firm_forms_archiving_hides_the_account_from_b6301d")
          : t("components_prop_firm_forms_voided_records_stay_in_the_audit_589dbd")
      }
      busy={busy}
      error={error}
      submit={() =>
        void save({
          action: modal.action,
          id: modal.id,
          revision: modal.revision,
          payoutId: modal.payoutId,
          [modal.action === "account.archive" ? "archived" : "voided"]: modal.value,
          reason,
        })
      }
    >
      <Field label={t("components_prop_firm_forms_reason_f219cc")}>
        <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Form>
  );
}
function Detail({ modal, data }: Props & { modal: Extract<PropModal, { kind: "detail" }> }) {
  const t = useTranslations("extracted");
  const account = modal.type === "account" ? data.accounts.find((a) => a.id === modal.id) : null;
  const entry = modal.type === "entry" ? data.entries.find((e) => e.id === modal.id) : null;
  const { data: history } = useApi<{ history: PropAudit[] }>(
    `/api/prop-firms?type=${modal.type}&history=${encodeURIComponent(modal.id)}`,
  );
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {account?.name ??
            t("prop_kind_details", {
              kind: entry?.kind ? t(`prop_enum_${entry.kind}`) : t("prop_entry"),
            })}
        </DialogTitle>
        <DialogDescription>
          {account?.firm ?? entry?.firm} · {modal.id}
        </DialogDescription>
      </DialogHeader>
      <p className="whitespace-pre-wrap text-sm">
        {account?.notes || entry?.notes || t("components_prop_firm_forms_no_notes_added_bf91b9")}
      </p>
      {account && (
        <>
          <p className="break-all text-xs text-muted-foreground">
            {t("components_prop_firm_forms_account_id_for_csv_imports_691c10")} {account.id}
          </p>
          {account.parentId && (
            <p className="text-sm">
              {t("components_prop_firm_forms_previous_attempt_phase_edf48b")}{" "}
              {data.accounts.find((a) => a.id === account.parentId)?.name ?? account.parentId}
            </p>
          )}
          {account.journalAccountId && (
            <a
              className="text-sm underline"
              href={`/trades?accounts=${encodeURIComponent(account.journalAccountId)}`}
            >
              {t("components_prop_firm_forms_open_linked_journal_trades_733f0d")}
            </a>
          )}
        </>
      )}
      <Attachments type={modal.type === "account" ? "prop-account" : "prop-entry"} id={modal.id} />
      <details>
        <summary className="cursor-pointer text-sm">
          {t("components_prop_firm_forms_edit_history_latest_100_changes_de3a65")}
        </summary>
        <div className="mt-3 space-y-3">
          {history?.history.map((item) => (
            <details key={item.id} className="rounded-md border p-2 text-xs">
              <summary className="cursor-pointer">
                {item.createdAt} ·{" "}
                {item.reason.startsWith("CSV import")
                  ? t("components_prop_firm_forms_csv_import_41b55f")
                  : item.reason}
              </summary>
              <p className="my-2 font-medium">{t("components_prop_firm_forms_before_74f396")}</p>
              <pre className="whitespace-pre-wrap break-all">
                {item.beforeJson
                  ? JSON.stringify(JSON.parse(item.beforeJson), null, 2)
                  : t("components_prop_firm_forms_new_record_c6e295")}
              </pre>
              <p className="my-2 font-medium">{t("components_prop_firm_forms_after_79ba5e")}</p>
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(JSON.parse(item.afterJson), null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </details>
    </>
  );
}
function ImportForm({ close, refresh }: Props) {
  const t = useTranslations("extracted");
  const [content, setContent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      imported: number;
      skipped: number;
      sample: Record<string, string>[];
    } | null>(null);
  const act = async (action: "preview" | "import") => {
    setBusy(true);
    setError("");
    try {
      const data = await postJson<typeof result>("/api/prop-firms/csv", { action, content });
      if (action === "preview") setResult(data);
      else {
        refresh();
        close();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("components_prop_firm_forms_import_prop_cash_csv_a64094")}</DialogTitle>
        <DialogDescription>
          {t("components_prop_firm_forms_import_settled_expenses_refunds__b47e0d")}
        </DialogDescription>
      </DialogHeader>
      <a className="text-sm underline" href="/prop-cash-template.csv" download>
        {t("components_prop_firm_forms_download_generic_cash_header_tem_a4e136")}
      </a>
      <p className="text-xs text-muted-foreground">
        {t("components_prop_firm_forms_use_kind_expense_refund_or_payou_b2a0f8")}
      </p>
      <Input
        type="file"
        aria-label={t("components_prop_firm_forms_prop_cash_csv_file_ba61da")}
        accept=".csv,text/csv"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          setContent("");
          setResult(null);
          setError("");
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            setError(t("components_prop_firm_forms_csv_too_large"));
            return;
          }
          try {
            setContent(decodeImportFile(await file.arrayBuffer()));
          } catch {
            setError(t("components_prop_firm_forms_csv_read_failed"));
          }
        }}
      />
      <Button variant="outline" disabled={!content || busy} onClick={() => void act("preview")}>
        {busy
          ? t("components_prop_firm_forms_validating_c07434")
          : t("components_prop_firm_forms_validate_preview_76ff54")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <>
          <p className="text-sm">
            {result.imported} {t("components_prop_firm_forms_new_records_9f8329")} {result.skipped}{" "}
            {t("components_prop_firm_forms_already_imported_8de16b")}
          </p>
          <div className="space-y-2">
            {result.sample.map((row) => (
              <p key={row.id} className="rounded border p-2 text-xs">
                {row.date} · {row.firm} · {row.kind} · {row.amount} {row.currency}
              </p>
            ))}
          </div>
          <Button disabled={busy || result.imported === 0} onClick={() => void act("import")}>
            {t("components_prop_firm_forms_import_d6fbc9")} {result.imported}{" "}
            {t("components_prop_firm_forms_records_86761b")}
          </Button>
        </>
      )}
    </>
  );
}
