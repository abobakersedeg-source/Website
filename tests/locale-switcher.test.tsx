import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RenderResult } from "@testing-library/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

// next-intl runtime hooks are exercised in their own right upstream; here we
// stub them to control locale/pathname/labels deterministically.
let currentLocale = "en";
let currentPathname = "/en";
vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    useLocale: () => currentLocale,
    useTranslations: () => (key: string) =>
      ({ label: "Change language", localeEn: "English", localeAr: "العربية" })[
        key
      ] ?? key,
  };
});
vi.mock("@/i18n/routing", () => ({
  usePathname: () => currentPathname,
}));

afterEach(() => {
  // testing-library auto-cleanup is not enabled for explicit imports here;
  // unmount manually so each test starts with a clean DOM.
  document.body.innerHTML = "";
});

beforeEach(() => {
  replace.mockReset();
  currentLocale = "en";
  currentPathname = "/en";
  // jsdom location.search is what the component reads:
  window.history.replaceState({}, "", "/en?q=golf&page=3");
});

describe("LocaleSwitcher behaviour", () => {
  it("renders an accessible select pre-set to the active locale", () => {
    const view = render(<LocaleSwitcher />);
    const select = within(view.container).getByRole("combobox", {
      name: "Change language",
    });
    expect(select).toHaveValue("en");
    expect(screen.getByRole("option", { name: "العربية" })).toBeInTheDocument();
  });

  it("switches en -> ar preserving route + allowlisted query params", async () => {
    const user = userEvent.setup();
    const view = render(<LocaleSwitcher />);
    await user.selectOptions(
      within(view.container).getByRole("combobox", { name: "Change language" }),
      "ar",
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/ar?q=golf&page=3");
  });

  it("switches ar -> en on a nested registered-but-unimplemented route safely", async () => {
    currentLocale = "ar";
    currentPathname = "/ar/products";
    window.history.replaceState({}, "", "/ar/products");
    const user = userEvent.setup();
    const view = render(<LocaleSwitcher />);
    await user.selectOptions(
      within(view.container).getByRole("combobox", { name: "Change language" }),
      "en",
    );
    // /products not implemented this phase -> home fallback, never a 404 URL.
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/en");
  });

  it("ignores unsupported locale values", async () => {
    // The defensive branch: a value outside LOCALES must never navigate.
    // We inject a foreign <option> and pick it — the switcher should no-op.
    const user = userEvent.setup();
    const view = render(<LocaleSwitcher />);
    const select = within(view.container).getByRole("combobox", {
      name: "Change language",
    }) as unknown as HTMLSelectElement;
    const foreign = document.createElement("option");
    foreign.value = "de";
    foreign.textContent = "Deutsch";
    select.appendChild(foreign);
    await user.selectOptions(select, "de");
    expect(replace).not.toHaveBeenCalled();
  });
});
