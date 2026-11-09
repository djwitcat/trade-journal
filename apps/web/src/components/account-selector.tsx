"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FlaskConical, Settings2, WalletCards } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { postJson, useApi } from "@/lib/use-api";

interface AccountOption {
  id: string;
  name: string;
  broker: string;
  archivedAt: string | null;
}

/** Quick account switching; the full Filters panel still supports multiple accounts. */
export function AccountSelector() {
  const t = useTranslations("extracted");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data, error, refresh } = useApi<{ accounts: AccountOption[] }>("/api/accounts?summary=1");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoError, setDemoError] = useState("");
  const selected = params.get("accounts")?.split(",").filter(Boolean) ?? [];
  const accounts = data?.accounts.filter((a) => !a.archivedAt || selected.includes(a.id)) ?? [];
  const demo = accounts.find((a) => a.broker === "demo");
  const value = selected.length > 1 ? "multiple" : (selected[0] ?? "all");
  const label =
    selected.length > 1
      ? t("account_selector_count", { count: selected.length })
      : (accounts.find((a) => a.id === selected[0])?.name ??
        (selected.length ? t("account_selector_selected") : t("account_selector_all")));

  function selectAccount(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id === "all") next.delete("accounts");
    else next.set("accounts", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  async function select(value: string) {
    setDemoError("");
    if (value === "account-settings") {
      router.push("/accounts");
      return;
    }
    if (value !== "load-demo") return selectAccount(value);
    setLoadingDemo(true);
    try {
      const result = await postJson<{ accountId: string }>("/api/demo", {});
      refresh();
      selectAccount(result.accountId);
    } catch (cause) {
      setDemoError(cause instanceof Error ? cause.message : t("account_selector_demo_failed"));
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <div className="relative min-w-0 max-w-full">
      <Select value={value} onValueChange={(value) => void select(value)} disabled={loadingDemo}>
        <SelectTrigger
          aria-label={t("components_account_selector_select_account_33c1aa")}
          className="h-8 w-44 max-w-full rounded-lg text-xs"
        >
          <WalletCards className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left">
            {loadingDemo ? t("components_account_selector_loading_demo_21f372") : label}
          </span>
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-white/10 p-1 shadow-2xl" align="end">
          <SelectItem value="all" className="rounded-lg text-xs">
            {t("components_account_selector_all_accounts_6a19f2")}
          </SelectItem>
          {selected.length > 1 && (
            <SelectItem value="multiple" disabled className="text-xs">
              {label}
            </SelectItem>
          )}
          {accounts
            .filter((a) => a.broker !== "demo")
            .map((account) => (
              <SelectItem key={account.id} value={account.id} className="rounded-lg text-xs">
                <span className="block max-w-64 truncate">
                  {account.name}
                  {account.archivedAt ? t("components_account_selector_archived_128aef") : ""}
                </span>
              </SelectItem>
            ))}
          <div className="my-1 border-t" />
          <SelectItem value={demo?.id ?? "load-demo"} className="rounded-lg text-xs">
            <span className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
              {demo?.name ?? t("components_account_selector_load_demo_data_e41a5e")}
            </span>
          </SelectItem>
          <div className="my-1 border-t" />
          <SelectItem value="account-settings" className="rounded-lg text-xs">
            <span className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              {t("components_account_selector_account_settings_82cf8a")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      {(demoError || error) && (
        <p role="alert" className="max-w-64 pt-1 text-xs text-destructive">
          {demoError || error}
        </p>
      )}
    </div>
  );
}
