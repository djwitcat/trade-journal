import { useTranslations } from "next-intl";

/** Immediate feedback while Next loads a destination route. */
export default function Loading() {
  const t = useTranslations("extracted");
  return (
    <div role="status" className="space-y-4 p-4" aria-label={t("app_loading_loading_page")}>
      <span className="sr-only">{t("app_loading_loading_page_ellipsis")}</span>
      <div aria-hidden="true" className="h-6 w-32 rounded-md bg-muted" />
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 rounded-xl border bg-card" />
        ))}
      </div>
    </div>
  );
}
