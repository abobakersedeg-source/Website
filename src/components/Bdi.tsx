import type { ReactNode } from "react";

/**
 * BidiBdi — bidirectional text isolation wrapper for embedded run references
 * (SKUs, model codes like "GX-200", order numbers, emails, phone numbers)
 * inside Arabic or English prose.
 *
 * Semantics:
 * - Renders <bdi dir="auto">: the browser isolates the content and derives its
 *   base direction from the first strong directional character. Underlying text
 *   is NEVER reordered manually; copy/paste behaviour stays intact.
 * - Pass dir="ltr" explicitly for values that are always LTR (reference codes,
 *   emails, phones) so digits-only strings don't flip in RTL context.
 * - `inline` (default) keeps flow text behaviour; set inline={false} for block
 *   display (e.g. table cells containing addresses).
 *
 * See docs/ARCHITECTURE.md §4 "Bidirectional text safety".
 */
export function Bdi({
  children,
  dir = "auto",
  inline = true,
  className,
  as: Tag = inline ? "bdi" : "div",
}: {
  children: ReactNode;
  /** "auto" lets Unicode detect; use "ltr" for always-LTR identifiers. */
  dir?: "auto" | "ltr" | "rtl";
  inline?: boolean;
  className?: string;
  as?: "bdi" | "div" | "span";
}) {
  return (
    <Tag dir={dir} className={className} style={{ unicodeBidi: "isolate" }}>
      {children}
    </Tag>
  );
}
