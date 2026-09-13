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
