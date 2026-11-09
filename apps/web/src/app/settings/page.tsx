"use client";

import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ChartCandlestick,
  Database,
  Download,
  Globe,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { JournalDefaultSettings } from "@/components/journal-default-settings";
import { ContractMultiplierSettings, TimeZoneSettings } from "@/components/journal-settings";
import { MarketDataSettings } from "@/components/market-data-settings";
import { AiSettings } from "@/components/ai-settings";
import { CurrencySettings } from "@/components/currency-settings";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { cn } from "@/lib/utils";

const sections = [
  {
    id: "general",
    icon: Globe,
  },
  {
    id: "trading",
    icon: SlidersHorizontal,
  },
  {
    id: "currency-conversion",
    icon: ArrowLeftRight,
  },
  {
    id: "market-data",
    icon: ChartCandlestick,
  },
  {
    id: "ai-settings",
    icon: Sparkles,
  },
  {
    id: "your-data",
    icon: Database,
  },
] as const;
type Section = (typeof sections)[number]["id"];

function sectionForHash(hash: string): Section {
  const id = hash.replace(/^#/, "");
  if (id === "market-csv") return "market-data";
  if (id === "contract-multipliers" || id === "journal-defaults") return "trading";
  return sections.find((section) => section.id === id)?.id ?? "general";
}

export default function SettingsPage() {
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const t = useTranslations("extracted");
  const [active, setActive] = useState<Section>("general");
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restore = () => setActive(sectionForHash(window.location.hash));
    restore();
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, []);

  const openSection = (section: Section) => {
    if (window.location.hash !== `#${section}`)
      window.history.pushState(window.history.state, "", `#${section}`);
    setActive(section);
    top.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div>
      <FilterBar title={t("app_settings_page_settings_c7f73b")} />
      <div
        ref={top}
        className="mx-auto grid max-w-5xl scroll-mt-20 gap-6 p-4 sm:p-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8"
      >
        <nav
          aria-label={t("app_settings_page_settings_sections_2e7109")}
          className="hidden space-y-1 lg:sticky lg:top-20 lg:block lg:self-start"
        >
          {sections.map(({ id, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                openSection(id);
              }}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {t(`settings_section_${id}_label`)}
            </a>
          ))}
        </nav>
        <div className="space-y-2 lg:hidden">
          <Label htmlFor="settings-section" className="text-xs text-muted-foreground">
            {t("app_settings_page_settings_section_402128")}
          </Label>
          <OptionSelect
            id="settings-section"
            value={active}
            onValueChange={(value) => openSection(value as Section)}
          >
            {sections.map(({ id }) => (
              <option key={id} value={id}>
                {t(`settings_section_${id}_label`)}
              </option>
            ))}
          </OptionSelect>
        </div>
        <div className="min-w-0">
          {sections.map(({ id }) => (
            // Keep panels mounted so changing sections preserves unsaved form drafts.
            <section key={id} hidden={active !== id} aria-labelledby={`settings-heading-${id}`}>
              <div className="mb-5 space-y-1.5">
                <h2 id={`settings-heading-${id}`} className="text-xl font-semibold tracking-tight">
                  {t(`settings_section_${id}_label`)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t(`settings_section_${id}_description`)}
                </p>
              </div>
              <div className="space-y-4">
                {id === "general" && <TimeZoneSettings />}
                {id === "trading" && (
                  <>
                    <ContractMultiplierSettings />
                    <JournalDefaultSettings />
                  </>
                )}
                {id === "currency-conversion" && <CurrencySettings />}
                {id === "market-data" && <MarketDataSettings />}
                {id === "ai-settings" && <AiSettings />}
                {id === "your-data" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("app_settings_page_export_your_data_5c782d")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {t("app_settings_page_save_a_full_journal_backup_or_ex_f9a455")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                          <a href="/api/export" download="trade-journal-export.json">
                            <Download aria-hidden="true" />
                            {t("app_settings_page_full_backup_json_6b5d4c")}
                          </a>
                        </Button>
                        <Button variant="outline" asChild>
                          <a href="/api/export?format=csv" download>
                            <Download aria-hidden="true" />
                            {t("app_settings_page_trades_csv_26cf32")}
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
