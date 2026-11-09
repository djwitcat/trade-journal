"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  columnVisibilityFeature,
  tableFeatures,
  useTable,
  sortFns,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpDown, Check, Columns3, Download, Tag, Trash2 } from "lucide-react";
import { dayKeyOf, netReturnOnEntry, type TradeMetrics } from "@luxalgo/journal-core";
import { FilterBar, useFilters } from "@/components/filter-bar";
import { Pnl } from "@/components/pnl";
import { MonetaryValue } from "@/components/privacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Loading from "@/app/loading";
import { postJson, useApi } from "@/lib/use-api";
import { cn, fmtDuration, fmtMoney, fmtNumber, fmtPercent } from "@/lib/utils";

interface TradeRow {
  key: string;
  accountId: string;
  symbol: string;
  assetClass: string | null;
  contractMultiplier: number | null;
  direction: "long" | "short";
  status: string;
  openedAt: string;
  closedAt: string | null;
  quantity: number;
  avgEntry: number;
  avgExit: number | null;
  grossPnl: number;
  fees: number;
  netPnl: number;
  executionCount: number;
  durationMs: number | null;
  rating: number | null;
  tags: string[];
  mistakes: string[];
  reviewed: boolean;
}

const features = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const EMPTY_TRADES: TradeRow[] = [];

export default function TradesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Trades />
    </Suspense>
  );
}

function Trades() {
  const t = useTranslations("extracted");
  const { query } = useFilters();
  const { data, error, refresh } = useApi<{
    trades: TradeRow[];
    metrics: TradeMetrics;
    timeZone: string;
  }>(`/api/trades?view=list&${query}`);
  const router = useRouter();
  const timeZone = data?.timeZone ?? "UTC";
  const [tagInput, setTagInput] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  useEffect(() => setPage(0), [query]);

  const columns = useMemo<ColumnDef<typeof features, TradeRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => table.toggleAllRowsSelected(value === true)}
            aria-label={t("app_trades_page_select_all_matching_trades_0e8a29")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(value === true)}
            onClick={(event) => event.stopPropagation()}
            aria-label={t("app_trades_page_select_trade_5dca15")}
          />
        ),
      },
      {
        id: "closedAt",
        accessorKey: "closedAt",
        header: t("app_trades_page_close_date_bdfb24"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {getValue<string | null>()
              ? dayKeyOf(getValue<string>(), timeZone)
              : t("app_trades_page_open_5fc7e3")}
          </span>
        ),
      },
      {
        id: "symbol",
        accessorKey: "symbol",
        header: t("app_trades_page_symbol_3f84ef"),
        cell: ({ row, getValue }) => (
          <span className="flex items-center gap-2 font-medium">
            {getValue<string>()}
            <span className="text-xs text-muted-foreground">{row.original.direction}</span>
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("app_trades_page_status_bae7d5"),
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <Badge variant={status === "win" ? "profit" : status === "loss" ? "loss" : "secondary"}>
              {status.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: t("app_trades_page_volume_3b18e8"),
        cell: ({ getValue }) => <span className="tnum">{fmtNumber(getValue<number>(), 4)}</span>,
      },
      {
        id: "avgEntry",
        accessorKey: "avgEntry",
        header: t("app_trades_page_entry_19172e"),
        cell: ({ getValue }) => (
          <span className="tnum">
            <MonetaryValue>{fmtNumber(getValue<number>())}</MonetaryValue>
          </span>
        ),
      },
      {
        id: "avgExit",
        accessorKey: "avgExit",
        header: t("app_trades_page_exit_f83b6f"),
        cell: ({ getValue }) => (
          <span className="tnum">
            <MonetaryValue>
              {getValue<number | null>() === null ? "–" : fmtNumber(getValue<number>()!)}
            </MonetaryValue>
          </span>
        ),
      },
      {
        id: "netPnl",
        accessorKey: "netPnl",
        header: t("app_trades_page_net_p_l_152aa9"),
        cell: ({ getValue }) => <Pnl value={getValue<number>()} />,
      },
      {
        id: "roi",
        accessorFn: (row) => netReturnOnEntry(row) ?? undefined,
        sortUndefined: "last",
        sortDescFirst: true,
        sortFn: "basic",
        header: t("app_trades_page_net_roi_e2d010"),
        cell: ({ getValue }) => (
          <span className="tnum">{fmtPercent(getValue<number | undefined>() ?? null, 2)}</span>
        ),
      },
      {
        id: "fees",
        accessorKey: "fees",
        header: t("app_trades_page_fees_72abbc"),
        cell: ({ getValue }) => (
          <span className="tnum text-muted-foreground">
            <MonetaryValue>{fmtMoney(getValue<number>())}</MonetaryValue>
          </span>
        ),
      },
      {
        id: "durationMs",
        accessorKey: "durationMs",
        header: t("app_trades_page_duration_137000"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{fmtDuration(getValue<number | null>())}</span>
        ),
      },
      {
        id: "executionCount",
        accessorKey: "executionCount",
        header: t("app_trades_page_execs_3daebf"),
        cell: ({ getValue }) => (
          <span className="tnum text-muted-foreground">{getValue<number>()}</span>
        ),
      },
      {
        id: "tags",
        accessorKey: "tags",
        enableSorting: false,
        header: t("app_trades_page_tags_848eed"),
        cell: ({ getValue }) => (
          <span className="flex max-w-40 flex-wrap gap-1">
            {getValue<string[]>().map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </span>
        ),
      },
      {
        id: "rating",
        accessorKey: "rating",
        header: t("app_trades_page_rating_6437b7"),
        cell: ({ getValue }) => {
          const rating = getValue<number | null>();
          return (
            <span className="text-muted-foreground">
              {rating === null ? "–" : "★".repeat(rating)}
            </span>
          );
        },
      },
      {
        id: "reviewed",
        accessorKey: "reviewed",
        header: t("app_trades_page_reviewed_31ef85"),
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <Check className="h-4 w-4 text-profit" />
          ) : (
            <span className="text-muted-foreground">–</span>
          ),
      },
    ],
    [timeZone],
  );

  const table = useTable({
    features,
    columns,
    data: data?.trades ?? EMPTY_TRADES,
    getRowId: (row) => row.key,
    initialState: {
      sorting: [{ id: "closedAt", desc: true }],
      columnVisibility: { fees: false, executionCount: false, rating: false },
    },
  });

  const selectedKeys = table.getSelectedRowModel().rows.map((row) => row.original.key);
  const sortedRows = table.getRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const bulk = async (action: string, extra?: Record<string, unknown>) => {
    await postJson("/api/trades/bulk", { keys: selectedKeys, action, ...extra });
    table.resetRowSelection();
    refresh();
  };

  const m = data?.metrics;
  return (
    <div>
      <FilterBar
        title={t("app_trades_page_trades_597b10")}
        actions={
          <div className="flex items-center gap-2">
            <a href={`/api/export?format=csv&${query}`} download>
              <Button variant="outline" size="sm">
                <Download />
                {t("app_trades_page_csv_328118")}
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => setShowColumns((value) => !value)}>
              <Columns3 />
              {t("app_trades_page_columns_cf723c")}
            </Button>
          </div>
        }
      />
      <div className="space-y-3 p-4">
        {m && (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("app_trades_page_net_cumulative_p_l_881fbd")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Pnl value={m.netPnl} className="text-xl font-semibold" />
                <span className="ml-2 text-xs text-muted-foreground">
                  {m.closedTrades} {t("app_trades_page_trades_cf7b32")}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("app_trades_page_profit_factor_80e53e")}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xl font-semibold tnum">
                  {m.profitFactorIsInfinite
                    ? "∞"
                    : m.profitFactor === null
                      ? "–"
                      : fmtNumber(m.profitFactor)}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("app_trades_page_trade_win_328ebd")}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xl font-semibold tnum">{fmtPercent(m.winRate)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("app_trades_page_avg_win_loss_5de6a5")}</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-xl font-semibold tnum">
                  {m.avgWinLossRatio === null ? "–" : fmtNumber(m.avgWinLossRatio)}
                </span>
              </CardContent>
            </Card>
          </div>
        )}

        {showColumns && (
          <Card>
            <CardContent className="flex flex-wrap gap-3 py-3">
              {table
                .getAllLeafColumns()
                .filter((column) => column.id !== "select")
                .map((column) => (
                  <label key={column.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(value === true)}
                    />
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </label>
                ))}
            </CardContent>
          </Card>
        )}

        {selectedKeys.length > 0 && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 py-2">
              <span className="text-sm text-muted-foreground">
                {selectedKeys.length} {t("app_trades_page_selected_835f3b")}
              </span>
              <Button variant="outline" size="sm" onClick={() => bulk("review")}>
                <Check />
                {t("app_trades_page_mark_reviewed_277c92")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulk("unreview")}>
                {t("app_trades_page_unreview_b66f58")}
              </Button>
              <div className="flex max-w-full flex-wrap items-center gap-1">
                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder={t("app_trades_page_tag_5e9b60")}
                  className="h-8 w-28 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!tagInput}
                  onClick={() => {
                    void bulk("tag", { tag: tagInput });
                    setTagInput("");
                  }}
                >
                  <Tag />
                  {t("app_trades_page_tag_982963")}
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(t("trades_confirm_bulk_delete", { count: selectedKeys.length })))
                    void bulk("delete");
                }}
              >
                <Trash2 />
                {t("app_trades_page_delete_f6fdbe")}
              </Button>
            </CardContent>
          </Card>
        )}

        {error ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{error}</p>
            <Button variant="outline" onClick={refresh}>
              {t("app_trades_page_try_again_042c86")}
            </Button>
          </div>
        ) : !data ? (
          <Skeleton className="h-96" />
        ) : (
          <Card>
            <div className="relative min-w-0 max-w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-9 whitespace-nowrap px-2 text-left text-xs font-medium text-muted-foreground"
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              onClick={(event) => {
                                setPage(0);
                                header.column.getToggleSortingHandler()?.(event);
                              }}
                            >
                              <table.FlexRender header={header} />
                              <ArrowUpDown
                                className={cn(
                                  "h-3 w-3",
                                  header.column.getIsSorted() && "text-foreground",
                                )}
                              />
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/trades/${encodeURIComponent(row.original.key)}?${query}`)
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-2 py-2 align-middle">
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-16 text-center text-muted-foreground"
                      >
                        {t("app_trades_page_no_trades_match_these_filters_6c66fd")}{" "}
                        <Link href="/import" className="underline">
                          {t("app_trades_page_import_some_b29ae6")}
                        </Link>
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {sortedRows.length > pageSize && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
                <span>
                  {currentPage * pageSize + 1}–
                  {Math.min((currentPage + 1) * pageSize, sortedRows.length)}{" "}
                  {t("app_trades_page_of_de04fa")} {fmtNumber(sortedRows.length, 0)}{" "}
                  {t("app_trades_page_trades_cf7b32")}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    {t("app_trades_page_previous_50f942")}
                  </Button>
                  <span>
                    {t("app_trades_page_page_fb0627")} {currentPage + 1}{" "}
                    {t("app_trades_page_of_de04fa")} {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage + 1 === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {t("app_trades_page_next_bc9819")}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
