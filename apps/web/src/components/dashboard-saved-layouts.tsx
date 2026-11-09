"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState, type CSSProperties } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, LayoutTemplate, Save, Search, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  dashboardLayoutPresets,
  normalizeArrangement,
  visibleCardIds,
  type DashboardArrangement,
} from "@/lib/dashboard-layout";

export function DashboardSavedLayouts({
  layouts,
  current,
  ids,
  onLoad,
  onSave,
}: {
  layouts: Record<string, DashboardArrangement>;
  current: DashboardArrangement;
  ids: string[];
  onLoad(name: string, arrangement: DashboardArrangement): void;
  onSave(name: string): boolean;
}) {
  const t = useTranslations("extracted");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const names = Object.keys(layouts);
  const presets = dashboardLayoutPresets(ids);
  const presetName = (id: string) => t(`components_dashboard_preset_${id}_name`);
  const presetDescription = (id: string) => t(`components_dashboard_preset_${id}_description`);
  const matchingPresets = presets.filter((preset) =>
    `${presetName(preset.id)} ${presetDescription(preset.id)}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const matches = names.filter((name) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setQuery("");
        setSaved("");
      }}
    >
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="dashboard-customize-trigger"
          aria-label={t("components_dashboard_saved_layouts_dashboard_layouts_96fec2")}
        >
          <LayoutTemplate /> {t("components_dashboard_saved_layouts_layouts_28e6f5")}{" "}
          <ChevronDown className="dashboard-customize-chevron" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="dashboard-customize-panel dashboard-layout-panel"
          align="start"
          sideOffset={10}
          collisionPadding={12}
          aria-labelledby={titleId}
        >
          <div className="dashboard-customize-heading">
            <h2 id={titleId}>{t("components_dashboard_saved_layouts_dashboard_layouts_96fec2")}</h2>
            <span className="dashboard-customize-count">
              {names.length} {t("components_dashboard_saved_layouts_saved_c75c31")}
            </span>
            <Popover.Close
              className="dashboard-customize-icon-button"
              aria-label={t("components_dashboard_saved_layouts_close_dashboard_layouts_cf6d41")}
            >
              <X size={15} />
            </Popover.Close>
          </div>
          {names.length + presets.length > 4 && (
            <div className="dashboard-customize-search">
              <Search size={14} aria-hidden="true" />
              <input
                aria-label={t("components_dashboard_saved_layouts_find_a_layout_e7ebe8")}
                placeholder={t("components_dashboard_saved_layouts_find_a_layout_1d6cba")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          )}
          <div
            ref={listRef}
            className="dashboard-customize-results"
            onKeyDown={(event) => {
              const buttons = Array.from(
                listRef.current?.querySelectorAll<HTMLButtonElement>("[data-saved-layout]") ?? [],
              );
              const index = buttons.indexOf(event.target as HTMLButtonElement);
              if (index < 0) return;
              const next = {
                ArrowDown: index + 1,
                ArrowUp: index - 1,
                Home: 0,
                End: buttons.length - 1,
              }[event.key];
              if (next !== undefined) {
                event.preventDefault();
                buttons[(next + buttons.length) % buttons.length]?.focus();
              }
            }}
          >
            <div className="dashboard-customize-list">
              {matchingPresets.length > 0 && (
                <>
                  <div className="px-3 pb-2 pt-2">
                    <h3 className="text-[11px] font-medium text-muted-foreground">
                      {t("components_dashboard_saved_layouts_presets_e709e7")}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t(
                        "components_dashboard_saved_layouts_choose_a_focus_then_make_it_your_b2af76",
                      )}
                    </p>
                  </div>
                  {matchingPresets.map((preset) => {
                    const active = JSON.stringify(preset.arrangement) === JSON.stringify(current);
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        data-saved-layout
                        className="dashboard-customize-option dashboard-layout-option"
                        aria-label={t("components_dashboard_saved_layouts_apply_preset", {
                          name: presetName(preset.id),
                        })}
                        aria-pressed={active}
                        onClick={() => {
                          onLoad(preset.name, preset.arrangement);
                          setOpen(false);
                        }}
                      >
                        <span className="dashboard-customize-card-icon">
                          <LayoutTemplate size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium">
                            {presetName(preset.id)}
                            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                              {visibleCardIds(preset.arrangement).length}{" "}
                              {t("components_dashboard_saved_layouts_cards_c8d375")}
                            </span>
                            {preset.id === "overview" && (
                              <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                {t("components_dashboard_saved_layouts_default_808d7d")}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                            {presetDescription(preset.id)}
                          </span>
                        </span>
                        {active && (
                          <Check size={15} className="shrink-0 text-brand" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
              {matches.length > 0 && (
                <h3 className="px-3 pb-2 pt-3 text-[11px] font-medium text-muted-foreground">
                  {t("components_dashboard_saved_layouts_your_saved_layouts_177b65")}
                </h3>
              )}
              {matches.map((name, index) => {
                const layout = normalizeArrangement(layouts[name], ids);
                const active = JSON.stringify(layout) === JSON.stringify(current);
                return (
                  <button
                    key={name}
                    type="button"
                    data-saved-layout
                    className="dashboard-customize-option dashboard-layout-option"
                    style={{ "--option-index": Math.min(index, 7) } as CSSProperties}
                    aria-label={t("dashboard_load_layout", { name })}
                    aria-pressed={active}
                    onClick={() => {
                      onLoad(name, layout);
                      setOpen(false);
                    }}
                  >
                    <span className="dashboard-customize-card-icon">
                      <LayoutTemplate size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{name}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {visibleCardIds(layout).length}{" "}
                        {t("components_dashboard_saved_layouts_cards_c8d375")}
                        {active ? " · Current layout" : ""}
                      </span>
                    </span>
                    {active && (
                      <Check size={15} className="shrink-0 text-brand" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
              {!matches.length && !matchingPresets.length && (
                <div className="dashboard-customize-empty">
                  <LayoutTemplate size={24} aria-hidden="true" />
                  <p>{t("components_dashboard_saved_layouts_no_matching_layouts_a6373d")}</p>
                </div>
              )}
            </div>
          </div>
          <form
            className="dashboard-layout-save"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              if (!onSave(name.trim())) return;
              setSaved(t("components_dashboard_saved_layouts_saved_named", { name: name.trim() }));
              setName("");
              setQuery("");
            }}
          >
            <label
              htmlFor={`${titleId}-name`}
              className="text-[11px] font-medium text-muted-foreground"
            >
              {t("components_dashboard_saved_layouts_save_current_layout_aa4b06")}
            </label>
            <div className="flex min-w-0 items-center gap-2">
              <Input
                id={`${titleId}-name`}
                aria-label={t("components_dashboard_saved_layouts_layout_name_3f83da")}
                placeholder={t("components_dashboard_saved_layouts_e_g_weekly_review_ab5bf9")}
                value={name}
                maxLength={80}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved("");
                }}
                className="h-9 rounded-xl text-xs"
              />
              <Button
                size="sm"
                type="submit"
                className="h-9 shrink-0 rounded-xl"
                disabled={!name.trim()}
              >
                <Save className="h-3.5 w-3.5" />
                {t("components_dashboard_saved_layouts_save_efc007")}
              </Button>
            </div>
            {saved && (
              <p role="status" className="text-[11px] text-muted-foreground">
                {saved}
              </p>
            )}
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
