"use client";
import { useTranslations } from "next-intl";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fieldClass } from "@/components/filter-fields";
import { postJson, useApi } from "@/lib/use-api";
import { formatInlineSelection, remarkRepairSpacedEmphasis } from "@/lib/note-formatting";
import { tradeLinkLabel, tradeMarkdownLink, type LinkableTrade } from "@/lib/trade-links";
export function Markdown({ children }: { children: string }) {
  return (
    <div className="journal-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkRepairSpacedEmphasis]}
        components={{
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) =>
            href?.startsWith("/trades/") ? (
              <Link href={href}>{children}</Link>
            ) : (
              <a href={href}>{children}</a>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
const BUILT_INS = [
  {
    id: "pre",
  },
  {
    id: "review",
  },
  {
    id: "weekly",
  },
];
export interface RichEditorHandle {
  focus(): void;
}
export function RichEditor({
  value,
  onChange,
  placeholder,
  defaultMode,
  mode,
  onModeChange,
  showModeToggle = true,
  editorRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultMode?: "preview" | "edit";
  mode?: "preview" | "edit";
  onModeChange?: (mode: "preview" | "edit") => void;
  showModeToggle?: boolean;
  editorRef?: Ref<RichEditorHandle>;
}) {
  const t = useTranslations("extracted");
  const ref = useRef<HTMLTextAreaElement>(null),
    [localPreview, setLocalPreview] = useState(() =>
      defaultMode ? defaultMode === "preview" : Boolean(value.trim()),
    ),
    [error, setError] = useState("");
  const preview = mode ? mode === "preview" : localPreview;
  const setPreview = (next: boolean) => {
    setLocalPreview(next);
    onModeChange?.(next ? "preview" : "edit");
  };
  useImperativeHandle(editorRef, () => ({
    focus() {
      setPreview(false);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(value.length, value.length);
      });
    },
  }));
  const { data, refresh } = useApi<{ templates: { id: string; name: string; content: string }[] }>(
    "/api/workspace/templates",
  );
  const [linkOpen, setLinkOpen] = useState(false),
    [search, setSearch] = useState("");
  const {
    data: trades,
    error: tradeError,
    loading: tradesLoading,
  } = useApi<{
    trades: LinkableTrade[];
    hasMore: boolean;
  }>(linkOpen ? `/api/trades/lookup?q=${encodeURIComponent(search)}` : null);
  function insert(before: string, after = "") {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length,
      end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end));
    setPreview(false);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(start + before.length, end + before.length);
    });
  }
  function formatInline(marker: "*" | "**") {
    const next = formatInlineSelection(
      value,
      ref.current?.selectionStart ?? value.length,
      ref.current?.selectionEnd ?? value.length,
      marker,
    );
    onChange(next.value);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {showModeToggle && (
          <Button type="button" variant="outline" size="sm" onClick={() => setPreview(!preview)}>
            {preview
              ? t("components_rich_editor_edit_530164")
              : t("components_rich_editor_preview_f1fbb2")}
          </Button>
        )}
        {!preview && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatInline("**")}
              aria-label={t("components_rich_editor_bold_19e074")}
            >
              {t("components_rich_editor_b_ae4f28")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => formatInline("*")}
              aria-label={t("components_rich_editor_italic_1616e2")}
            >
              <i>{t("components_rich_editor_i_ca73ab")}</i>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insert("\n## ")}
              aria-label={t("components_rich_editor_heading_a3089b")}
            >
              {t("components_rich_editor_h2_462283")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insert("\n- ")}
              aria-label={t("components_rich_editor_bullet_list_660d9f")}
            >
              {t("components_rich_editor_list_a1fffa")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insert("\n- [ ] ")}
              aria-label={t("components_rich_editor_checklist_61b294")}
            >
              {t("components_rich_editor_checklist_61b294")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setLinkOpen(!linkOpen)}>
              {t("components_rich_editor_link_trade_0aef2a")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={t("components_rich_editor_insert_note_template_d7b44b")}
                  className="gap-2 rounded-lg"
                >
                  {t("components_rich_editor_insert_template_11f465")}
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                aria-label={t("components_rich_editor_note_templates_feda9c")}
              >
                {[
                  ...BUILT_INS.map((item) => ({
                    ...item,
                    name: t(`note_template_${item.id}_name`),
                    content: t(`note_template_${item.id}_content`),
                  })),
                  ...(data?.templates ?? []),
                ].map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onSelect={() => onChange(value + (value ? "\n\n" : "") + template.content)}
                  >
                    <FileText
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    {template.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!value}
              onClick={async () => {
                const name = prompt(t("components_rich_editor_name_this_note_template_5a7d7f"));
                if (!name) return;
                try {
                  await postJson("/api/workspace/templates", { name, content: value });
                  refresh();
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              {t("components_rich_editor_save_template_0885fa")}
            </Button>
          </>
        )}
      </div>
      {linkOpen && !preview && (
        <div className="space-y-2 rounded-md border p-2">
          <input
            aria-label={t("components_rich_editor_find_trade_by_symbol_date_or_acc_e48d53")}
            placeholder={t("components_rich_editor_search_symbol_date_or_account_b31e9e")}
            className={fieldClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-40 overflow-y-auto">
            {tradesLoading && (
              <p role="status" className="text-xs text-muted-foreground">
                {t("components_rich_editor_loading_trades_5ca4b4")}
              </p>
            )}
            {tradeError && (
              <p role="alert" className="text-xs text-destructive">
                {tradeError}
              </p>
            )}
            {!tradesLoading &&
              !tradeError &&
              trades?.trades.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="block w-full rounded p-1 text-left text-xs hover:bg-accent"
                  onClick={() => {
                    onChange(value + `\n${tradeMarkdownLink(t)}\n`);
                    setLinkOpen(false);
                    setPreview(true);
                  }}
                >
                  {tradeLinkLabel(t)}
                </button>
              ))}
            {!tradesLoading && !tradeError && trades?.trades.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("components_rich_editor_no_matching_trades_43f76f")}
              </p>
            )}
            {!tradesLoading && !tradeError && trades?.hasMore && (
              <p className="text-xs text-muted-foreground">
                {t("components_rich_editor_showing_the_latest_50_matches_se_52c2e4")}
              </p>
            )}
          </div>
        </div>
      )}
      {preview ? (
        <div className="min-h-40 rounded-md border p-3">
          <Markdown>{value || t("note_nothing_written")}</Markdown>
        </div>
      ) : (
        <textarea
          ref={ref}
          aria-label={t("components_rich_editor_review_notes_40b69a")}
          className={`${fieldClass} min-h-48 resize-y font-mono text-[13px]`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("note_editor_placeholder")}
        />
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
