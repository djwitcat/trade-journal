"use client";
import { useTranslations } from "next-intl";
import { useApi } from "@/lib/use-api";
import { useFilters } from "@/components/filter-bar";
import { MonetaryValue } from "./privacy";
import type { GroupSummary } from "@luxalgo/journal-core";
interface Adherence {
  id: string;
  total: number;
  evaluated: number;
  possible: number;
  rate: number | null;
  currencies: string[];
  followed: GroupSummary;
  broken: GroupSummary;
  unassessed: number;
  rules: {
    rule: string;
    evaluated: number;
    rate: number | null;
    followed: GroupSummary;
    broken: GroupSummary;
  }[];
}
const pct = (n: number | null) => (n === null ? "-" : `${Math.round(n * 100)}%`);
export function AdherenceReport({ bookId }: { bookId: string }) {
  const t = useTranslations("extracted");
  const { query } = useFilters();
  const { data, error } = useApi<{ books: Adherence[] }>(`/api/adherence?${query}`);
  const b = data?.books.find((b) => b.id === bookId);
  if (error)
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  if (!b) return null;
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t("components_adherence_report_rule_adherence_138736")}
        </span>
        <strong className="text-lg">{pct(b.rate)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">
        {b.evaluated}/{b.possible} {t("components_adherence_report_rule_assessments_across_18d0a7")}{" "}
        {b.total} {t("components_adherence_report_filtered_closed_trades_cfdb0c")} {b.unassessed}{" "}
        {t("components_adherence_report_trades_still_need_assessment_855403")}
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          [t("adherence_all_followed"), b.followed],
          [t("adherence_any_broken"), b.broken],
        ].map(([title, stats]) => {
          const s = stats as GroupSummary;
          return (
            <div key={String(title)} className="rounded-md bg-muted/40 p-2">
              <p className="mb-1 font-medium">{String(title)}</p>
              <p>
                {s.trades} {t("components_adherence_report_trades_315a31")} {pct(s.winRate)}{" "}
                {t("components_adherence_report_win_c76ac2")}
              </p>
              {b.currencies.length <= 1 && (
                <p className={s.netPnl >= 0 ? "text-profit" : "text-loss"}>
                  <MonetaryValue>
                    {s.netPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    {b.currencies[0] ?? ""}
                  </MonetaryValue>
                </p>
              )}
            </div>
          );
        })}
      </div>
      {b.currencies.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {t("components_adherence_report_p_l_hidden_for_mixed_currencies_4c3205")}
        </p>
      )}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          {t("components_adherence_report_performance_by_rule_ef321b")}
        </summary>
        <div className="mt-2 space-y-3">
          {b.rules.map((r) => (
            <div key={r.rule} className="border-t pt-2">
              <p className="font-medium">{r.rule}</p>
              <p className="text-muted-foreground">
                {pct(r.rate)} {t("components_adherence_report_followed_04ba11")} {r.evaluated}{" "}
                {t("components_adherence_report_assessments_5305bb")}
              </p>
              <p>
                {t("components_adherence_report_followed_248dc6")} {r.followed.trades}{" "}
                {t("components_adherence_report_trades_294d2c")} {pct(r.followed.winRate)}{" "}
                {t("components_adherence_report_win_broken_224a97")} {r.broken.trades} /{" "}
                {pct(r.broken.winRate)} {t("components_adherence_report_win_c76ac2")}
              </p>
              {b.currencies.length <= 1 && (
                <p>
                  {t("components_adherence_report_net_p_l_d65ad7")}{" "}
                  <MonetaryValue>{r.followed.netPnl.toFixed(2)}</MonetaryValue>{" "}
                  {t("components_adherence_report_followed_c4ef48")}{" "}
                  <MonetaryValue>{r.broken.netPnl.toFixed(2)}</MonetaryValue>{" "}
                  {t("components_adherence_report_broken_0b8a1c")} {b.currencies[0] ?? ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
