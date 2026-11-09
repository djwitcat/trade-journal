"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useFilters } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tradePath } from "@/lib/trade-links";
import { useApi } from "@/lib/use-api";

interface TradeNavigationData {
  prevKey: string | null;
  nextKey: string | null;
  position: number | null;
  total: number;
}

export function TradeNavigation({ tradeKey }: { tradeKey: string }) {
  const t = useTranslations("extracted");
  const { query } = useFilters();
  const params = useSearchParams();
  const router = useRouter();
  const scope = params.get("tradeScope") === "account" ? "account" : "all";
  const { data, error, refresh } = useApi<TradeNavigationData>(
    `/api/trades/${encodeURIComponent(tradeKey)}/navigation?${query}&tradeScope=${scope}`,
  );
  const href = (key: string) => `${tradePath(key)}?${params.toString()}`;

  return (
    <nav
      aria-label={t("components_trade_navigation_trade_navigation_e0e255")}
      className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4"
    >
      <Button asChild variant="ghost" size="sm">
        <Link href={`/trades?${query}`}>
          <ArrowLeft /> {t("components_trade_navigation_back_to_trades_9627b0")}
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={scope}
          onValueChange={(value) => {
            const next = new URLSearchParams(params.toString());
            if (value === "account") next.set("tradeScope", "account");
            else next.delete("tradeScope");
            router.replace(`${tradePath(tradeKey)}?${next}`, { scroll: false });
          }}
        >
          <SelectTrigger
            aria-label={t("components_trade_navigation_trade_navigation_scope_949538")}
            className="h-8 w-36 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {query
                ? t("components_trade_navigation_filtered_trades_9edf74")
                : t("components_trade_navigation_all_trades_b1c7ba")}
            </SelectItem>
            <SelectItem value="account">
              {t("components_trade_navigation_same_account_2c30ad")}
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {error ? (
            <button onClick={refresh} className="underline">
              {t("components_trade_navigation_retry_navigation_4a95cc")}
            </button>
          ) : data ? (
            data.position === null ? (
              t("trade_nav_outside_filters")
            ) : (
              t("trade_nav_position", { position: data.position, total: data.total })
            )
          ) : (
            t("trade_nav_loading")
          )}
        </span>
        {data?.prevKey ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={href(data.prevKey)}
              aria-label={t("components_trade_navigation_previous_trade_f6df41")}
              rel="prev"
            >
              <ChevronLeft /> {t("components_trade_navigation_previous_50f942")}
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label={t("components_trade_navigation_previous_trade_f6df41")}
          >
            <ChevronLeft /> {t("components_trade_navigation_previous_50f942")}
          </Button>
        )}
        {data?.nextKey ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={href(data.nextKey)}
              aria-label={t("components_trade_navigation_next_trade_1e3dee")}
              rel="next"
            >
              {t("components_trade_navigation_next_bc9819")} <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-label={t("components_trade_navigation_next_trade_1e3dee")}
          >
            {t("components_trade_navigation_next_bc9819")} <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  );
}
