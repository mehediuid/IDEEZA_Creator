"use client";

// Earn from the product page (the web's CL-031, on the phone): the owner's
// own product screen gets Earn in its Bottom action bar — the coins icon, the
// project page's Earn — with the web's one line under it saying how this
// product's copies sell (`productCopiesLineOf`: Not selling copies yet ·
// Physical copies on sale · 3 sold · Sold out · 50 sold · 4 copies sold ·
// Copies wait for videos · Sold in full). In a one-product project the whole
// project's copies are this product's, so they count in its line.
// The web's Earn is the quiet button beside Open in editor, and the violet one
// when the editor can't be opened; a phone never opens the editor (D3), so
// Earn is the bar's one primary, as the project page's Earn is when it stands
// alone. It opens Earn › Sell at this product's copies (`productEarnHref`,
// `#editions-<product>`, which the phone's Sell scrolls to); a one-product
// project has no product row on the web's desk, so it opens on Sell itself,
// where the whole project's copies lead. The owner's page only: no preview,
// contributor or marketplace view has it.

import * as React from "react";
import Link from "next/link";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
import { productEarnHref } from "@/lib/manual/earn-route";
import { EARN_LABEL } from "@/lib/manual/earn-view";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { phoneHrefOf } from "@/lib/manual/phone-project";
import { heldOf, useHeld } from "@/lib/market/held";
import { productCopiesLineOf } from "@/lib/market/sell-desk";
import { PROJECT_SCOPE } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { T } from "../type";
import { useProduct } from "./use-product";

/** Where this product's copies sell on the phone, and the web's line about them. */
export function useProductEarn(): { href: string; line: string } {
  const { project, view, product } = useProduct();
  const { store } = useHeld();
  return React.useMemo(() => {
    const current = view.products.filter((p) => p.dropped === null);
    const onlyProduct = current.length === 1 && current[0].id === product.id;
    const waiting = heldOf(store, project.id).some(
      (i) => i.kind === "copies" && (i.scope === product.id || (onlyProduct && i.scope === PROJECT_SCOPE)),
    );
    return {
      href: onlyProduct ? phoneEarnHref(project.id, "sell") : (phoneHrefOf(productEarnHref(project.id, product.id)) ?? phoneEarnHref(project.id, "sell")),
      line: productCopiesLineOf({ productId: product.id, onlyProduct, tracks: view.editions, sales: view.sales, locked: view.lock !== null, waiting }),
    };
  }, [store, project.id, product.id, view.products, view.editions, view.sales, view.lock]);
}

export function ProductEarnBar() {
  const earn = useProductEarn();
  const lineId = React.useId();
  return (
    <BottomBar className="gap-3">
      <Link href={earn.href} aria-describedby={lineId} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
        <Icon icon={Coins01Icon} size={20} />
        {EARN_LABEL}
      </Link>
      <p id={lineId} className={cn(T.body, "text-center")}>
        {earn.line}
      </p>
    </BottomBar>
  );
}
