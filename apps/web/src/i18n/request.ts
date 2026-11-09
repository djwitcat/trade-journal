import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = process.env.JOURNAL_LOCALE === "zh-CN" ? "zh-CN" : "en";
  const messages =
    locale === "zh-CN"
      ? (await import("./messages/zh-CN.json")).default
      : (await import("./messages/en.json")).default;

  return { locale, messages };
});
