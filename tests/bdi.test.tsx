import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Bdi } from "@/components/Bdi";

describe("Bdi — bidirectional text isolation", () => {
  it("renders an isolated <bdi dir=\"auto\"> by default", () => {
    render(<Bdi>GX-200</Bdi>);
    const el = screen.getByText("GX-200");
    expect(el.tagName.toLowerCase()).toBe("bdi");
    expect(el).toHaveAttribute("dir", "auto");
    expect(el.style.unicodeBidi).toBe("isolate");
  });

  it("honours explicit dir for always-LTR identifiers (SKUs, emails, refs)", () => {
    render(<Bdi dir="ltr">order-1234</Bdi>);
    const el = screen.getByText("order-1234");
    expect(el).toHaveAttribute("dir", "ltr");
    expect(el.style.unicodeBidi).toBe("isolate");
  });

  it("supports block mode with a div wrapper", () => {
    const view = render(
      <div dir="rtl">
        <Bdi inline={false} dir="ltr">
          sales@golf-cart.example
        </Bdi>
      </div>,
    );
    const el = within(view.container).getByText("sales@golf-cart.example");
    expect(el.tagName.toLowerCase()).toBe("div");
    expect(el).toHaveAttribute("dir", "ltr");
  });

  it("keeps Latin model codes intact inside Arabic sentences (no reordering)", () => {
    // Realistic mixed-content case: Arabic prose + embedded LTR SKU.
    const view = render(
      <p dir="rtl">
        الطراز <Bdi dir="ltr">GX-200 XL</Bdi> متوفر الآن
      </p>,
    );
    // The paragraph's full text is preserved character-for-character — we
    // never manually reverse or reorder the underlying string. (The matcher
    // returns the nearest element containing the substring, i.e. the <bdi>;
    // we assert on its parent <p> for the whole sentence.)
    const bdi = within(view.container).getByText("GX-200 XL");
    const p = bdi.parentElement!;
    expect(p.tagName.toLowerCase()).toBe("p");
    expect(p.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "الطراز GX-200 XL متوفر الآن",
    );
    expect(bdi).toHaveAttribute("dir", "ltr");
    expect(bdi.textContent).toBe("GX-200 XL");
  });

  it("lets Unicode 'auto' detect direction for Arabic values in EN context", () => {
    render(
      <p dir="ltr">
        Customer name: <Bdi>مؤسسة الخليج</Bdi>
      </p>,
    );
    const bdi = screen.getByText("مؤسسة الخليج");
    expect(bdi).toHaveAttribute("dir", "auto");
  });

  it("isolates digits-only strings so they do not flip next to Arabic punctuation", () => {
    // Classic bug: "+971 50 123 4567" at an RTL paragraph end gets its
    // leading '+' pushed to the wrong side without isolation.
    render(
      <p dir="rtl">
        اتصل على <Bdi dir="ltr">+971 50 123 4567</Bdi>:
      </p>,
    );
    const bdi = screen.getByText("+971 50 123 4567");
    expect(bdi).toHaveAttribute("dir", "ltr");
    expect(bdi.style.unicodeBidi).toBe("isolate");
  });
});
