const CHINESE_OUTPUT =
  "Write all human-readable output in Simplified Chinese, including section headings, warnings, and errors. Preserve JSON property names, enum values, account names, trading symbols, timestamps, numeric values, source excerpts, and Markdown formatting.";

export const localizedAiSystem = (system: string): string =>
  process.env.JOURNAL_LOCALE === "zh-CN" ? `${system}\n${CHINESE_OUTPUT}` : system;
