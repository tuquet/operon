# Sidebar Layout System

The sidebar is split across three layers so layout primitives remain stateless while `preferences` and route menus drive state. Global widgets (`GlobalSearch`, `Preferences`) are mounted once as singletons in `BasicLayout` `#extra` and decoupled from the sidebar.

## Layer Map

| Layer | File | Responsibility |
| --- | --- | --- |
| **Host Shell** | `apps/shell/src/layouts/basic.vue` | Injects `WorkspaceSelector` into `#sidebar-header` when authenticated. |
| **Host Defaults** | `apps/shell/src/preferences.ts` | Overrides defaults (`layout: 'sidebar-nav'`, `width: 210`, `preferencesButtonPosition: 'header'`). |
| **Desktop Containment** | `apps/shell/src/layouts/widgets/desktop-shell.vue` | Wraps viewport with `contain: layout` so `position: fixed` sidebars stay below `DesktopTitlebar` without offset math. |
| **Orchestration** | `packages/effects/layouts/src/basic/layout.vue` | (`BasicLayout`) Binds `preferences.sidebar`, splits `accessStore.accessMenus` via `useMixedMenu`, forwards `#sidebar-header` / `#sidebar-footer`, and hosts singleton `GlobalSearch` + `Preferences` modals in `#extra`. |
| **Layout Coordinator** | `packages/@core/ui-kit/layout-ui/src/vben-layout.vue` | (`VbenAdminLayout`) Computes sidebar width, `marginTop`, `zIndex`, header/main offsets, and mobile mask (`data-layout-region="sidebar-mask"`). |
| **Sidebar Primitive** | `packages/@core/ui-kit/layout-ui/src/components/layout-sidebar.vue` | (`LayoutSidebar`) Pure props/`v-model` `<aside data-layout-region="sidebar">` using natural `flex flex-col h-full` regions (`sidebar-header`, `flex-1` scrollbar, `sidebar-footer`), `clip-path` collapse, hover-expand, and drag-resize. |
| **Preferences State & UI** | `packages/@core/preferences/src/{types,config}.ts`, `packages/effects/layouts/src/widgets/preferences/blocks/layout/sidebar.vue` | Defines `SidebarPreferences` schema/defaults and user settings controls. |

## Layout Modes (`LayoutType`)

Resolved in `packages/@core/ui-kit/layout-ui/src/hooks/use-layout.ts` (`useLayout`):

- **`sidebar-nav`** _(default)_: Full-height left sidebar (`marginTop: 0`) with `#sidebar-header`, vertical `#menu`, and `#sidebar-footer`. Cannot be disabled (`sidebarEnable` locked on).
- **`header-sidebar-nav`**: Full-width top header (`sidebarMarginTop = headerHeight`), full vertical menu in sidebar.
- **`mixed-nav`**: Full-width top header (`sidebarMarginTop = headerHeight`). When `preferences.navigation.split` is `true`, top-level items render in header and active child tree renders in sidebar (`useMixedMenu`).
- **`header-nav` / `full-content`**: Sidebar disabled or hidden (`sidebarEnableState = false`).
- **Mobile (`isMobile = true`)**: Forces `sidebar-nav` drawer mode (`domVisible = false`, `translate3d` slide transition, overlay mask). Synthetic mouse hover events are ignored (`handleMouseenter` / `handleMouseleave` return early).

## Slots & DOM Mechanics

- **Natural Flex Regions (`flex flex-col h-full`)**:
  1. **Top (`[data-layout-region="sidebar-header"]`, `shrink-0 border-b`)**: Dedicated `min-h-[50px]` context switcher slot (`#sidebar-header="{ collapsed }"`), centered in collapsed rail and padded card in expanded mode. (No `#logo` slot exists in `LayoutSidebar` or `LayoutHeader`; `preferences.logo.source` is reserved strictly for authentication pages.)
  2. **Main (`VbenScrollbar`, `min-h-0 flex-1 py-2`)**: Fills remaining height automatically without manual pixel subtraction. Renders `#menu`.
  3. **Bottom (`[data-layout-region="sidebar-footer"]`, `shrink-0 border-t`)**: Spreads `SidebarCollapseButton` (left) and `SidebarFixedButton` (right) with `justify-between` when expanded (or places custom `#sidebar-footer="{ collapsed }"` on the left and controls on the right; stacks centered when collapsed).
- **Placeholder + Fixed `<aside>`**: On desktop, `LayoutSidebar` renders a flex-item `<div>` (`flex-basis` matching occupied width) so `main` shifts without layout thrashing, while `<aside>` stays `fixed left-0 top-0`.
- **Reflow-free Collapse**: Standard desktop sidebar keeps `<aside>` width at `Math.max(currentWidth, expandedWidth)` and animates `clip-path: inset(0 <clippedWidth>px 0 0)` so inner menu labels do not wrap during collapse transitions.
- **Hover-to-Expand & Pin**: Controlled by `preferences.sidebar.expandOnHover` (`SidebarFixedButton`). When unpinned (`expandOnHover = false`), hovering `offsetX >= 10` sets `expandOnHovering = true` and temporarily expands `<aside>` over `main` while the flex placeholder stays at `collapseWidth`; `mouseleave` collapses it back.
- **Drag Resize**: `packages/@core/ui-kit/layout-ui/src/hooks/use-sidebar-drag.ts` (`useSidebarDrag`) attaches a full-window overlay (`z-index: 9999`, `col-resize`) while dragging the right border, clamping width between `collapseWidth` (`60px`) and `320px`. Releasing at `<= collapseWidth` toggles `collapsed = true`.
- **Data Selectors**: `[data-layout-region="layout"]` (`data-layout`, `data-mobile`, `data-sidebar-collapsed`), `[data-layout-region="sidebar"]`, `[data-layout-region="sidebar-header"]`, `[data-layout-region="sidebar-footer"]`, `[data-layout-region="sidebar-mask"]`, `[data-layout-action="toggle-sidebar"]`, `[data-layout-action="toggle-sidebar-collapse"]`.

## Key Preferences (`preferences.sidebar`)

| Key | Default (`config.ts` / `shell`) | Effect |
| --- | --- | --- |
| `enable` | `true` | Mounts/hides sidebar in side-capable layouts (`sidebarVisible` also checks non-empty split children). |
| `hidden` | `false` | Toggled by header button (`data-layout-action="toggle-sidebar"`) or content maximize mode. |
| `collapsed` | `false` | Collapses rail to `collapseWidth` (`60px`) or `extraCollapsedWidth` (`60px` when `collapsedShowTitle` is on). |
| `width` | `224` (`210` in `shell`) | Expanded width in `px` (`160`–`320` in UI settings / drag). |
| `draggable` | `true` | Enables right-edge drag handle (`useSidebarDrag`). |
| `expandOnHover` | `true` | Pin state when expanded; hover-expand behavior when collapsed. |
| `collapsedShowTitle` | `false` | Shows item titles under icons when collapsed; switches collapsed width to `extraCollapsedWidth`. |
| `autoActivateChild` | `false` | Navigates to first/last-visited child route when selecting a parent menu in split/mixed modes. |
| `collapsedButton` / `fixedButton` | `true` / `true` | Shows inline `SidebarCollapseButton` and `SidebarFixedButton` inside `sidebar-footer`. |
