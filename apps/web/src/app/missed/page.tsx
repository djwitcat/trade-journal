"use client";
import { useTranslations } from "next-intl";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";

import { Suspense, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { Field, fieldClass } from "@/components/filter-fields";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichEditor, Markdown } from "@/components/rich-editor";
import { Attachments } from "@/components/attachments";
import { ReviewExport } from "@/components/review-export";
import { MonetaryValue, MonetaryField } from "@/components/privacy";
import { useApi, postJson } from "@/lib/use-api";
interface Missed {
  id: string;
  symbol: string;
  direction: string;
  observedAt: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  playbookId: string | null;
  notes: string;
  archivedAt: string | null;
}
const blank = () => ({
  symbol: "",
  direction: "long",
  observedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16),
  entry: "",
  stop: "",
  target: "",
  playbookId: "",
  notes: "",
});
export default function MissedPage() {
  return (
    <Suspense>
      <Missed />
    </Suspense>
  );
}
function Missed() {
  const t = useTranslations("extracted");
  const translate = useTranslations("extracted");
  const { data, error, refresh } = useApi<{ trades: Missed[] }>("/api/workspace/missed"),
    { data: books } = useApi<{ playbooks: { id: string; name: string }[] }>("/api/playbooks");
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [draft, setDraft] = useState(blank),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  function edit(t?: Missed) {
    setEditing(t?.id ?? null);
    setDraft(
      t
        ? {
            symbol: t.symbol,
            direction: t.direction,
            observedAt: new Date(
              Date.parse(t.observedAt) - new Date(t.observedAt).getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16),
            entry: t.entry?.toString() ?? "",
            stop: t.stop?.toString() ?? "",
            target: t.target?.toString() ?? "",
            playbookId: t.playbookId ?? "",
            notes: t.notes,
          }
        : blank(),
    );
    setFailure("");
    setOpen(true);
  }
  const rows =
    data?.trades.filter(
      (t) =>
        Boolean(t.archivedAt) === archived &&
        `${t.symbol} ${t.notes}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const formField = (
    key: "symbol" | "observedAt" | "entry" | "stop" | "target",
    label: string,
    type = "text",
  ) => (
    <Field label={label}>
      <MonetaryField sensitive={type === "number"}>
        <input
          className={fieldClass}
          type={type}
          step={type === "number" ? "any" : undefined}
          value={draft[key]}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      </MonetaryField>
    </Field>
  );
  return (
    <div>
      <FilterBar
        title={translate("app_missed_page_missed_trades_63202b")}
        actions={
          <Button size="sm" onClick={() => edit()}>
            {translate("app_missed_page_log_opportunity_0bd9bf")}
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          {translate("app_missed_page_record_setups_you_watched_but_di_cc3abc")}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <input
            aria-label={translate("app_missed_page_search_missed_trades_c603d6")}
            className={`${fieldClass} max-w-sm`}
            placeholder={translate("app_missed_page_search_symbol_or_notes_2af9c5")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={archived}
              onCheckedChange={(checked) => setArchived(checked === true)}
            />
            {translate("app_missed_page_show_archived_5084ee")}
          </label>
        </div>
        {(error || failure) && (
          <p role="alert" className="text-sm text-destructive">
            {error || failure}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    {t.symbol} · {t.direction}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => edit(t)}>
                      {translate("app_missed_page_edit_530164")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await postJson(
                            "/api/workspace/missed",
                            { id: t.id, restore: !!t.archivedAt },
                            "DELETE",
                          );
                          refresh();
                        } catch (e) {
                          setFailure(String(e));
                        }
                      }}
                    >
                      {t.archivedAt
                        ? translate("app_missed_page_restore_3cbe6d")
                        : translate("app_missed_page_archive_2621c6")}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.observedAt).toLocaleString()} ·{" "}
                  {books?.playbooks.find((b) => b.id === t.playbookId)?.name ??
                    translate("app_missed_page_no_strategy_91fdad")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-5 text-sm">
                  {[
                    [translate("missed_entry"), t.entry],
                    [translate("missed_stop"), t.stop],
                    [translate("missed_target"), t.target],
                  ].map(([label, value]) => (
                    <span key={label}>
                      <span className="text-muted-foreground">{label}: </span>
                      <MonetaryValue>{value ?? "-"}</MonetaryValue>
                    </span>
                  ))}
                </div>
                <Markdown>{t.notes || translate("missed_no_review")}</Markdown>
                <ReviewExport
                  containsFinancialData
                  document={{
                    title: translate("missed_export_title", { symbol: t.symbol }),
                    subtitle: `${t.direction} · ${t.observedAt}`,
                    lines: [
                      translate("missed_observation_only"),
                      translate("missed_export_plan", {
                        entry: t.entry ?? "-",
                        stop: t.stop ?? "-",
                        target: t.target ?? "-",
                      }),
                      "",
                      t.notes,
                    ],
                  }}
                />
                <Attachments type="missed" id={t.id} />
              </CardContent>
            </Card>
          ))}
        </div>
        {data && !rows.length && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {translate("app_missed_page_no_816c52")}{" "}
            {archived ? t("app_missed_page_archived_48f0f9") : ""}
            {translate("app_missed_page_opportunities_here_yet_a9af79")}
          </p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? t("app_missed_page_edit_opportunity_d255c9")
                  : t("app_missed_page_log_a_missed_opportunity_7d7408")}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {formField("symbol", t("app_missed_page_symbol_3f84ef"))}
              <Field label={t("app_missed_page_direction_fd8e45")}>
                <OptionSelect
                  className={fieldClass}
                  value={draft.direction}
                  onValueChange={(next) => setDraft({ ...draft, direction: next })}
                >
                  <option value="long">{translate("app_missed_page_long_11eda6")}</option>
                  <option value="short">{translate("app_missed_page_short_0fe7d8")}</option>
                </OptionSelect>
              </Field>
              {formField(
                "observedAt",
                t("app_missed_page_observed_at_device_time_29ef2e"),
                "datetime-local",
              )}
              <Field label={t("app_missed_page_strategy_69fb26")}>
                <OptionSelect
                  className={fieldClass}
                  value={draft.playbookId}
                  onValueChange={(next) => setDraft({ ...draft, playbookId: next })}
                >
                  <option value="">{translate("app_missed_page_no_strategy_91fdad")}</option>
                  {books?.playbooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </OptionSelect>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {formField("entry", t("app_missed_page_planned_entry_f07fa5"), "number")}
              {formField("stop", t("app_missed_page_planned_stop_b5d4c4"), "number")}
              {formField("target", t("app_missed_page_planned_target_537ade"), "number")}
            </div>
            <RichEditor
              defaultMode="edit"
              value={draft.notes}
              onChange={(notes) => setDraft({ ...draft, notes })}
              placeholder={translate("app_missed_page_why_did_you_miss_it_what_will_yo_6da986")}
            />
            {failure && (
              <p role="alert" className="text-xs text-destructive">
                {failure}
              </p>
            )}
            <Button
              disabled={busy || !draft.symbol.trim() || !draft.observedAt}
              onClick={async () => {
                setBusy(true);
                try {
                  await postJson("/api/workspace/missed", {
                    ...draft,
                    id: editing,
                    observedAt: new Date(draft.observedAt).toISOString(),
                    entry: draft.entry === "" ? null : Number(draft.entry),
                    stop: draft.stop === "" ? null : Number(draft.stop),
                    target: draft.target === "" ? null : Number(draft.target),
                  });
                  setOpen(false);
                  refresh();
                  setFailure("");
                } catch (e) {
                  setFailure(e instanceof Error ? e.message : translate("common_save_failed"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {translate("app_missed_page_save_opportunity_3a926b")}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
