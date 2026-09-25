// The rail's "Show on canvas" jumps and the canvas controls they land on
// share these ids from one place — spec §5 — so a jump target can never
// drift from the id the control it names actually carries.

/** A product's card on the canvas (`ImageTurn`'s root). */
export const productCardId = (productId: string): string => `product-card-${productId}`;

/** A failed card's Try again control. */
export const productRetryId = (productId: string): string => `product-retry-${productId}`;

/** The setup question, while it is still a question. */
export const SETUP_QUESTION_ID = "setup-question";

/** The canvas's one build action (`BuildAction`'s button). */
export const BUILD_ACTION_ID = "build-action";

/** The credits notice shown beside a blocked build or render. */
export const CREDITS_NOTICE_ID = "build-credits";

/** The review wrapper a build's deliverables land in. */
export const BUILD_REVIEW_ID = "build-review";

/** The Add-a-product section (suggested chips, removed chips, the name field). */
export const ADD_PRODUCT_ID = "add-product";

/** What a jump draws on the place it lands for 1.2 s (spec §4): the host
 *  sets `data-arrived="true"` and takes it off again. The element's own
 *  transition has to include box-shadow for the ring to fade. */
export const ARRIVAL_RING =
  "data-[arrived=true]:ring-2 data-[arrived=true]:ring-border-focus";
