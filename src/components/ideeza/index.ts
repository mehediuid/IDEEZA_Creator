// IDEEZA Design System — atom barrel.
// Real JSX components converted from the IDEEZA Figma, token-driven via the
// vendored design tokens. Adopted across the PCB editor in place of inline
// HTML-string controls.

export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton, iconButtonVariants, type IconButtonProps } from "./icon-button";
export { Link, linkVariants, type LinkProps } from "./link";
export { ButtonGroup, type ButtonGroupItem, type ButtonGroupProps } from "./button-group";
// `Select`'s own option shape ({ label, value }) is a structural subset of
// `SelectMenu`'s, so the barrel carries one `SelectOption` — the richer one.
// The narrower type stays importable from "./select" itself.
export { Select, type SelectProps } from "./select";
export { SelectMenu, type SelectOption, type SelectMenuProps } from "./select-menu";
export { SearchInput, type SearchInputProps } from "./search-input";
export { Checkbox, Radio, type CheckboxProps, type RadioProps } from "./checkbox";
export { Toggle, type ToggleProps } from "./toggle";
export { NumberInput, type NumberInputProps } from "./number-input";
export { TextInput, Textarea, type TextInputProps, type TextareaProps } from "./text-input";
export { Slider, type SliderProps } from "./slider";
export { Banner, type BannerProps, type BannerTone } from "./banner";
export { Segmented, type SegmentedProps, type SegmentedOption, type SegmentedSize } from "./segmented";
export { Tooltip } from "./tooltip";
// M10 Popover: the anchored bubble the Tour Guide's steps are drawn in.
export { Popover, PopoverArrow, type PopoverProps, type PopoverPlacement } from "./popover";
// M33 Stepper (Horizontal · Dotted): the Tour Guide panel's journey.
export { Stepper, type StepperStep, type StepperState } from "./stepper";
export { Badge, type BadgeTone } from "./badge";
export {
  Avatar,
  AvatarLabelGroup,
  type AvatarProps,
  type AvatarSize,
  type AvatarLabelGroupProps,
  type AvatarLabelGroupSize,
} from "./avatar";
export { Tag, type TagProps, type TagSize } from "./tag";
export { Skeleton, type SkeletonProps, type SkeletonShape, type SkeletonSize } from "./skeleton";
export { Menu, type MenuItem, type MenuProps, type MenuTriggerProps } from "./menu";
export { TestnetDemoBadge, TESTNET_DEMO_LABEL } from "./testnet-demo-badge";
export { Spinner } from "./spinner";
export { ProgressBar } from "./progress-bar";
export { Divider } from "./divider";
export { StateCard } from "./state-card";
export { ModalFrame, ConfirmDialog, type ModalFrameProps, type ConfirmDialogProps } from "./dialog";
// T20: the Activity History drawer's atom — a right-docked ModalFrame sibling.
export { Drawer, type DrawerProps } from "./drawer";
// O01 App Shell's page frame and O02 Page Header (Figma F07 — Page Layout).
export {
  Page,
  PAGE_CONTAINER,
  PAGE_FRAME,
  PAGE_GRID,
  NARROW_COLUMN,
  WITH_RAIL,
  NARROW_WITH_RAIL,
} from "./page";
export { PageHeader } from "./page-header";
