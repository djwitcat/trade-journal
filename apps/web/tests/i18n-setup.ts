import { vi } from "vitest";
import messages from "../src/i18n/messages/en.json";

vi.mock("next-intl", async (importOriginal) => {
  const original = await importOriginal<typeof import("next-intl")>();
  return {
    ...original,
    useTranslations: (namespace: keyof typeof messages) =>
      original.createTranslator({ locale: "en", messages, namespace }),
  };
});
