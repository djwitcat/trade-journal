"use client";

import { useTranslations } from "next-intl";
import type { ImportReview, ImportReviewOptions } from "@/lib/import-review";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/utils";

export function ImportReconciliation({
  review,
  options,
  onChange,
  onReview,
  busy,
}: {
  review?: ImportReview;
  options: ImportReviewOptions;
  onChange: (next: ImportReviewOptions) => void;
  onReview: () => void;
  busy: boolean;
}) {
  const t = useTranslations("extracted");
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-sm font-medium">
        {t("components_import_reconciliation_review_ninjatrader_import_c14d63")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("components_import_reconciliation_keep_each_source_account_separat_361e89")}
      </p>
      {review && (
        <>
          {review.sources.map((source) => (
            <label key={source.key} className="block space-y-1 text-sm">
              <span>{source.label}</span>
              <select
                aria-label={t("import_source_mapping_aria", { source: source.label })}
                disabled={busy || source.saved}
                className="block w-full rounded-md border bg-background p-2 text-sm"
                value={options.sourceMappings?.[source.key] ?? source.selected ?? ""}
                onChange={(event) =>
                  onChange({
                    ...options,
                    sourceMappings: { ...options.sourceMappings, [source.key]: event.target.value },
                  })
                }
              >
                <option value="">
                  {t("components_import_reconciliation_choose_the_source_this_file_belo_3cfcc6")}
                </option>
                {review.savedSources.map((saved) => (
                  <option key={saved.id} value={saved.id}>
                    {saved.name}
                  </option>
                ))}
                <option value="new">
                  {t("components_import_reconciliation_create_a_separate_source_account_06dc71")}
                </option>
              </select>
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            {t("components_import_reconciliation_if_an_account_or_connection_was__dfeaf7")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" role="status">
            <span>
              {review.inserted} {t("components_import_reconciliation_new_fills_094e87")}
            </span>
            <span>
              {review.duplicates} {t("components_import_reconciliation_duplicate_fills_1d5df1")}
            </span>
            <span>
              {review.corrections.length}{" "}
              {t("components_import_reconciliation_fee_corrections_a9e509")}
            </span>
          </div>
          {review.multipliers.map((item) => (
            <p key={item.symbol} className="text-xs">
              {item.symbol} {t("components_import_reconciliation_multiplier_5f4d25")}{" "}
              {item.value ??
                t("components_import_reconciliation_missing_configure_in_settings_e7a4b6")}
            </p>
          ))}
          {review.multipliers.some((item) => item.value === null) && (
            <a className="text-sm underline" href="/settings" target="_blank" rel="noreferrer">
              {t("components_import_reconciliation_open_settings_then_review_again_15d823")}
            </a>
          )}
          {review.totals && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {t("components_import_reconciliation_destination_account_after_import_7ff184")}
                {review.currency})
              </p>
              <p>
                {review.totals.closedTrades}{" "}
                {t("components_import_reconciliation_closed_trades_f88312")}{" "}
                {review.totals.openTrades}{" "}
                {t("components_import_reconciliation_open_trades_b248b0")}
              </p>
              <p>
                {t("components_import_reconciliation_closed_trade_net_p_amp_l_e139d4")}{" "}
                {fmtMoney(review.totals.netPnl, review.currency)}{" "}
                {t("components_import_reconciliation_fees_07999a")}{" "}
                {fmtMoney(review.totals.fees, review.currency)}
              </p>
            </div>
          )}
          {review.needsCompleteHistory && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!options.completeHistory}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...options, completeHistory: event.target.checked })
                }
              />
              <span>
                {t("components_import_reconciliation_this_export_includes_every_execu_47b747")}
              </span>
            </label>
          )}
          {!!review.corrections.length && (
            <div className="space-y-2">
              {review.corrections.slice(0, 10).map((correction, index) => (
                <p key={index} className="text-xs">
                  {correction.symbol} · {correction.executedAt}
                  {t("components_import_reconciliation_commission_617767")}{" "}
                  {fmtMoney(correction.oldFee, review.currency)} →{" "}
                  {fmtMoney(correction.newFee, review.currency)}
                </p>
              ))}
              {review.corrections.length > 10 && (
                <p className="text-xs">
                  {t("components_import_reconciliation_plus_2d05d0")}{" "}
                  {review.corrections.length - 10}{" "}
                  {t("components_import_reconciliation_more_fee_corrections_5e9990")}
                </p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!options.approveFeeCorrections}
                  disabled={busy}
                  onChange={(event) =>
                    onChange({ ...options, approveFeeCorrections: event.target.checked })
                  }
                />
                <span>
                  {t("components_import_reconciliation_apply_these_commission_correctio_a71c32")}
                </span>
              </label>
            </div>
          )}
          {review.warnings.map((message) => (
            <p key={message} className="text-xs text-muted-foreground">
              {message}
            </p>
          ))}
          {review.conflicts.map((message) => (
            <p key={message} role="alert" className="text-xs text-loss">
              {message}
            </p>
          ))}
        </>
      )}
      <Button variant="outline" disabled={busy} onClick={onReview}>
        {busy
          ? t("components_import_reconciliation_reviewing_142db0")
          : t("components_import_reconciliation_review_import_9b66fe")}
      </Button>
      {review?.token && (
        <p className="text-xs text-muted-foreground">
          {t("components_import_reconciliation_review_complete_import_will_save_d7a0ba")}
        </p>
      )}
    </div>
  );
}
