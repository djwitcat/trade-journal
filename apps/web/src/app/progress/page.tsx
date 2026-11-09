"use client";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/ui/date-picker";
import { OptionSelect } from "@/components/ui/option-select";
import { Checkbox } from "@/components/ui/checkbox";

import { HoverHint } from "@/components/ui/tooltip";
import { Suspense, useState } from "react";
import { FilterBar } from "@/components/filter-bar";
import { Field, fieldClass } from "@/components/filter-fields";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewExport } from "@/components/review-export";
import { useApi, postJson } from "@/lib/use-api";
import { scheduledRules, progressScore, type Routine, type RoutineCheck } from "@/lib/progress";
const STAGES = ["Before trading", "During trading", "After trading"];
export default function ProgressPage() {
  return (
    <Suspense>
      <Progress />
    </Suspense>
  );
}
function Progress() {
  const t = useTranslations("extracted");
  const { data, error, refresh } = useApi<{
    rules: Routine[];
    checks: RoutineCheck[];
    today: string;
  }>("/api/workspace/progress");
  const [date, setDate] = useState(""),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [stage, setStage] = useState(STAGES[0]!),
    [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  const selected = date || data?.today || "",
    rules = data ? scheduledRules(data.rules, selected) : [],
    score = data ? progressScore(data.rules, data.checks, selected) : null;
  const days = data
    ? Array.from({ length: 91 }, (_, i) => {
        const d = new Date(`${data.today}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 90 + i);
        const key = d.toISOString().slice(0, 10);
        return { date: key, ...progressScore(data.rules, data.checks, key) };
      })
    : [];
  async function act(body: unknown, method: "POST" | "DELETE" = "POST") {
    setBusy(true);
    try {
      await postJson("/api/workspace/progress", body, method);
      setFailure("");
      refresh();
      return true;
    } catch (e) {
      setFailure(e instanceof Error ? e.message : t("common_save_failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <FilterBar
        title={t("app_progress_page_progress_1b9027")}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            {t("app_progress_page_add_routine_8fd2d6")}
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          {t("app_progress_page_build_a_repeatable_trading_day_r_3d4b37")}
        </p>
        {(error || failure) && (
          <p role="alert" className="text-sm text-destructive">
            {error || failure}
          </p>
        )}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-6 py-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("app_progress_page_daily_completion_3e2d83")}
                </p>
                <p className="text-4xl font-semibold">
                  {score?.score == null ? "-" : `${Math.round(score.score * 100)}%`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {score?.completed ?? 0} {t("app_progress_page_of_de04fa")} {score?.total ?? 0}{" "}
                  {t("app_progress_page_scheduled_routines_52c5fa")}
                </p>
              </div>
              <Field label={t("app_progress_page_review_date_f3ca33")}>
                <DatePicker
                  label={t("app_progress_page_progress_date_a025c3")}
                  value={selected}
                  max={data?.today}
                  onValueChange={setDate}
                />
              </Field>
            </div>
            <ReviewExport
              document={{
                title: t("progress_export_title", { date: selected }),
                lines: [
                  t("progress_export_completed", {
                    completed: score?.completed ?? 0,
                    total: score?.total ?? 0,
                  }),
                  ...rules.map(
                    (r) =>
                      `${data?.checks.some((c) => c.date === selected && c.ruleId === r.id && c.done) ? "[done]" : "[ ]"} ${r.stage}: ${r.title}`,
                  ),
                ],
              }}
            />
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-3">
          {STAGES.map((s) => (
            <Card key={s}>
              <CardHeader>
                <CardTitle>{t(`progress_stage_${STAGES.indexOf(s)}`)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules
                  .filter((r) => r.stage === s)
                  .map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-3 text-sm">
                        <Checkbox
                          className="mt-1"
                          checked={
                            data?.checks.some(
                              (c) => c.ruleId === r.id && c.date === selected && c.done,
                            ) ?? false
                          }
                          disabled={busy || selected > (data?.today ?? "")}
                          onCheckedChange={(checked) =>
                            void act({ ruleId: r.id, date: selected, done: checked === true })
                          }
                        />
                        {r.title}
                      </label>
                      {!r.archivedAt && (
                        <button
                          className="text-xs text-muted-foreground underline"
                          onClick={() => {
                            if (confirm(t("progress_confirm_archive", { title: r.title })))
                              void act({ id: r.id }, "DELETE");
                          }}
                        >
                          {t("app_progress_page_archive_2621c6")}
                        </button>
                      )}
                    </div>
                  ))}
                {!rules.some((r) => r.stage === s) && (
                  <p className="text-xs text-muted-foreground">
                    {t("app_progress_page_no_routines_scheduled_1e28b3")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("app_progress_page_last_13_weeks_b0d850")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
              {days.map((d) => (
                <HoverHint
                  key={d.date}
                  heading={d.date}
                  content={t("progress_routines_completed", {
                    completed: d.completed,
                    total: d.total,
                  })}
                >
                  <button
                    key={d.date}
                    aria-label={`${d.date}: ${d.completed}/${d.total} complete`}
                    onClick={() => setDate(d.date)}
                    className={`min-h-7 min-w-7 rounded border ${selected === d.date ? "border-foreground" : "border-transparent"}`}
                    style={{
                      background:
                        d.score === null
                          ? "var(--muted)"
                          : `color-mix(in srgb, var(--brand) ${15 + d.score * 75}%, var(--card))`,
                    }}
                  />
                </HoverHint>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("app_progress_page_brighter_squares_mean_a_higher_c_486478")}
            </p>
          </CardContent>
        </Card>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("app_progress_page_add_a_daily_routine_e78d11")}</DialogTitle>
            </DialogHeader>
            <Field label={t("app_progress_page_routine_482273")}>
              <input
                className={fieldClass}
                value={title}
                placeholder={t("app_progress_page_review_the_economic_calendar_edf8fb")}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={t("app_progress_page_when_769bb1")}>
              <OptionSelect
                className={fieldClass}
                value={stage}
                onValueChange={(next) => setStage(next)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {t(`progress_stage_${STAGES.indexOf(s)}`)}
                  </option>
                ))}
              </OptionSelect>
            </Field>
            <div className="flex flex-wrap gap-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                <label key={day} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={weekdays.includes(i)}
                    onCheckedChange={(checked) =>
                      setWeekdays(
                        checked === true ? [...weekdays, i] : weekdays.filter((n) => n !== i),
                      )
                    }
                  />
                  {t(`filter_weekday_${day}`)}
                </label>
              ))}
            </div>
            {failure && (
              <p role="alert" className="text-xs text-destructive">
                {failure}
              </p>
            )}
            <Button
              disabled={!title.trim() || !weekdays.length || busy}
              onClick={async () => {
                if (await act({ title, stage, weekdays })) {
                  setOpen(false);
                  setTitle("");
                }
              }}
            >
              {t("app_progress_page_add_routine_8fd2d6")}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
