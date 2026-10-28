# @tuquet-core/shadcn-ui & Admin UI Component Catalog

## Overview
Package path: `admin/packages/@core/ui-kit/shadcn-ui` (named `@tuquet-core/shadcn-ui` or aliased/extended via `@tuquet/vue-ui`).

All components are powered by **Reka UI** (headless primitives) and styled via **Tailwind CSS** + **CVA** (`class-variance-authority`).

---

## 1. Atomic Primitives (`src/ui`)

| Component | Sub-components / Primitives | Typical Use Case |
|-----------|-----------------------------|------------------|
| `Accordion` | `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Expandable disclosure sections |
| `AlertDialog` | `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` | Destructive or critical confirmation modals |
| `Avatar` | `AvatarImage`, `AvatarFallback` | User / Organization profile avatars |
| `Badge` | `badgeVariants` | Status indicator pills, tags |
| `Breadcrumb` | `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbList`, `BreadcrumbPage`, `BreadcrumbSeparator` | Navigation path hierarchy |
| `Button` | `buttonVariants` (variants: `default`, `destructive`, `ghost`, `heavy`, `icon`, `link`, `outline`, `secondary`) | Action triggers, buttons |
| `Card` | `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Section containers, dashboard panels |
| `Chart` | `ChartTooltip`, `ChartCrosshair`, `ChartLegend` | Chart tooltips and base wrappers |
| `ChartArea` | `AreaChart` | Timeseries / metric area charts |
| `ChartBar` | `BarChart` | Categorical bar visualizations |
| `ChartDonut`| `DonutChart` | Breakdown / ratio donut charts |
| `Checkbox` | Native headless checkbox with state | Selection toggles |
| `ContextMenu` | Context trigger, menu content, items | Right-click custom menus |
| `Dialog` | `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | Interactive modal windows |
| `DropdownMenu` | `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` | Action menus, more-options dropdowns |
| `Form` | `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` | Form validation fields (VeeValidate schema) |
| `HoverCard` | `HoverCardTrigger`, `HoverCardContent` | Preview cards on hover |
| `Input` | Styled text/password/number HTML input | Single line text input |
| `Kbd` | Keyboard key indicator | Hotkey / shortcut indicator (`Ctrl + K`) |
| `Label` | Styled form label | Accessible form field labels |
| `NumberField` | Step counter, increment/decrement input | Numeric stepper inputs |
| `Pagination` | Pagination items, previous, next, ellipsis | Data table and list paging |
| `PinInput` | Pin input slots, separator | 2FA / OTP code inputs |
| `Popover` | `PopoverTrigger`, `PopoverContent` | Interactive popups, color pickers, filters |
| `Progress` | Progress track and indicator | Progress bars, loading indicators |
| `RadioGroup` | `RadioGroupItem` | Single choice option lists |
| `Resizable` | Handle, panel | Split panes, resizable layouts |
| `ScrollArea` | Scrollbar, viewport | Custom scrollable containers |
| `Select` | `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup` | Dropdown selection |
| `Separator` | Horizontal / vertical line | Visual divider |
| `Sheet` | `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter` | Off-canvas drawers, slide-overs |
| `Switch` | Headless switch toggle | Boolean preference switches |
| `Tabs` | `TabsList`, `TabsTrigger`, `TabsContent` | Tabbed views and sections |
| `Textarea` | Multi-line text input | Long comments, descriptions, JSON configs |
| `Toggle` | Single toggle button | Active/inactive state buttons |
| `ToggleGroup` | Multi/single toggle container | Segmented toggle controls |
| `Tooltip` | `TooltipProvider`, `TooltipTrigger`, `TooltipContent` | Hover help / explanatory text |
| `Tree` | Hierarchical tree nodes | Folder trees, nested categories |

---

## 2. Admin Compound Components (`src/components`)

These components wrap atomic primitives to provide opinionated enterprise features:

| Component | Purpose & Description |
|-----------|------------------------|
| `VbenAvatar` | Avatar with auto-fallback and status badge indicator |
| `VbenBackTop` | Floating button to smoothly scroll to top |
| `VbenBreadcrumb` | Auto-routed breadcrumb navigation bar |
| `VbenButton` | Button with loading state, tooltip, icon binding |
| `VbenCheckbox` | Form checkbox with label integration |
| `VbenCollapsible` | Expandable panel with animated state |
| `VbenContextMenu` | Enterprise right-click context menu |
| `VbenCountToAnimator` | Number counter animation on load / update |
| `VbenDescriptions` | Key-value data display grid / definitions |
| `VbenDropdownMenu` | Dropdown with icon and permission gate support |
| `VbenExpandableArrow` | Animated arrow indicator for collapses |
| `VbenFullScreen` | Fullscreen toggle button |
| `VbenHoverCard` | Rich hover preview card |
| `VbenIcon` | Universal icon loader (`@lucide/vue`, Iconify, Svg) |
| `VbenInputPassword` | Password field with reveal / hide toggle |
| `VbenLogo` | Branding logo with collapsed/expanded states |
| `VbenPinInput` | OTP/PIN verification code input box |
| `VbenPopover` | Popover wrapper with positioning controls |
| `VbenRenderContent` | Functional renderer for JSX/VNode slots |
| `VbenScrollbar` | Smooth custom scrollbar |
| `VbenSegmented` | Segmented control / tab switcher |
| `VbenSelect` | Searchable remote select component |
| `VbenSpineText` | Pulsing / shining skeleton text effect |
| `VbenSpinner` | Loading spinner with configurable size and color |
| `VbenTableAction` | Row action dropdown / button bar for data tables |
| `VbenTooltip` | Zero-boilerplate tooltip wrapper around any element |

---

## 3. High-Level UI Kits in Monorepo

| Package | Purpose | Typical Exports |
|---------|---------|-----------------|
| `@tuquet-core/form-ui` | Dynamic schema-based forms | `useVbenForm`, `VbenForm` |
| `@tuquet-core/popup-ui` | Programmatic / template modals & drawers | `useVbenModal`, `useVbenDrawer` |
| `@tuquet/common-ui` | Reusable admin layouts & authentication | `AuthenticationLogin`, `Fallback` |
| `vxe-pc-ui` / `vxe-table` | High-performance virtualized data tables | `useVbenVxeGrid` adapter |
