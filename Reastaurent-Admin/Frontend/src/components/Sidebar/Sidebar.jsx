import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { getStoredAdminMenuTree } from "../../Utils/authStorage";
import { getMenuMatchPaths, getMenuRoutePath } from "../../Utils/menuConfig";
import en from "../../Utils/i18n/en.json";

function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="11.5" width="7" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AuthenticationIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8.5 10.5V8.75a3.5 3.5 0 1 1 7 0v1.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="15.25" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 8.25a3.75 3.75 0 1 1 0 7.5a3.75 3.75 0 0 1 0-7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 12a7.14 7.14 0 0 0-.08-1l2-1.55l-2-3.46l-2.42.73a7.7 7.7 0 0 0-1.72-1L14.5 3h-5l-.28 2.72a7.7 7.7 0 0 0-1.72 1l-2.42-.73l-2 3.46l2 1.55a7.14 7.14 0 0 0 0 2l-2 1.55l2 3.46l2.42-.73a7.7 7.7 0 0 0 1.72 1L9.5 21h5l.28-2.72a7.7 7.7 0 0 0 1.72-1l2.42.73l2-3.46l-2-1.55c.05-.33.08-.66.08-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuManagementIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 5.5h12M6 10.5h12M6 15.5h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OrdersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 8h7M8.5 12h7M8.5 16h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PaymentsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 15h3.5M14.5 15H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReportsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 19V5M5 19h15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 15v-4M13 15V8M17 15v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CustomersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 18a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.5 18a3.5 3.5 0 0 1 5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReviewsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 4l2.1 4.26L18.8 9l-3.4 3.32l.8 4.68L12 14.9L7.8 17l.8-4.68L5.2 9l4.7-.74L12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserManagementIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 18a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 8v6M14 11h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotificationsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 4.5a4 4 0 0 1 4 4v2.1c0 .8.22 1.58.64 2.25L18 15v1.5H6V15l1.36-2.15c.42-.67.64-1.45.64-2.25V8.5a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2.2 2.2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessagesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v9A2.5 2.5 0 0 1 16.5 19h-9A2.5 2.5 0 0 1 5 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m7.5 8.5 4.5 3.5 4.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoryIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3.5" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ItemIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 4.5v15M10 4.5v6.2c0 1.4-1 2.3-2 2.3s-2-.9-2-2.3V4.5M14 8h4.1a1.9 1.9 0 0 1 1.9 1.9V19.5M14 19.5h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TimingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DefaultIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OffersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20.5 11.5L12.5 3.5H4.5v8l8 8a2.12 2.12 0 0 0 3 0l5-5a2.12 2.12 0 0 0 0-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

function AddonGroupsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="11.5" width="17" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="19" width="17" height="1.5" rx="0.75" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AddonItemsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor" />
      <path d="M10 6.5h10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5.5" cy="12.5" r="1.5" fill="currentColor" />
      <path d="M10 12.5h10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
      <path d="M10 18.5h10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkAddonsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopProductsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 6H6.5A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 8l4 4l-4 4M18 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d={open ? "M7 14l5-5l5 5" : "M7 10l5 5l5-5"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconMap = {
  dashboard: DashboardIcon,
  authentication: AuthenticationIcon,
  settings: SettingsIcon,
  timings: TimingsIcon,
  "menu-management": MenuManagementIcon,
  menu_management: MenuManagementIcon,
  orders: OrdersIcon,
  payments: PaymentsIcon,
  reports: ReportsIcon,
  customers: CustomersIcon,
  reviews: ReviewsIcon,
  "user-management": UserManagementIcon,
  user_management: UserManagementIcon,
  notifications: NotificationsIcon,
  messages: MessagesIcon,
  category: CategoryIcon,
  items: ItemIcon,
  addon: AddonGroupsIcon,
  addon_item_master: AddonItemsIcon,
  addons_eligible_for_items: LinkAddonsIcon,
  top_products: TopProductsIcon,
  offers: OffersIcon,
};

const isPathMatched = (pathname, menuKey = "", children = []) => {
  const matchPaths = getMenuMatchPaths(menuKey);

  if (
    matchPaths.some((path) => {
      if (!path) {
        return false;
      }

      if (pathname === path) {
        return true;
      }

      return path.endsWith("/") && pathname.startsWith(path);
    })
  ) {
    return true;
  }

  return children.some((child) => isPathMatched(pathname, child.menu_key, child.children || []));
};

const getSidebarLabel = (menu) =>
  en.sidebar.menu[menu.menu_key] || menu.menu_name || menu.module_name || menu.menu_key;

const simplifyMenuManagement = (menu) => menu;

function Sidebar({ collapsed = false, onNavigate, onLogout }) {
  const location = useLocation();
  const [storedMenus, setStoredMenus] = useState(() => getStoredAdminMenuTree());
  const sidebarColors = {
    panelBackground: "var(--color-sidebar-bg)",
    panelBorder: "var(--color-sidebar-border)",
    panelShadow: "var(--sidebar-shadow)",
    sectionBorder: "var(--color-sidebar-section-border)",
    headerGradientStart: "var(--color-sidebar-header-start)",
    headerGradientEnd: "var(--color-sidebar-header-end)",
    navGradientStart: "var(--color-sidebar-nav-start)",
    navGradientEnd: "var(--color-sidebar-nav-end)",
    activeBackground: "var(--color-sidebar-active-bg)",
    activeText: "var(--color-sidebar-active-text)",
    activeIndicator: "var(--color-sidebar-active-indicator)",
    inactiveText: "var(--color-sidebar-inactive-text)",
    iconBackground: "var(--color-sidebar-icon-bg)",
    iconActiveBackground: "var(--color-sidebar-icon-active-bg)",
    submenuBorder: "var(--color-sidebar-submenu-border)",
    submenuInactiveText: "var(--color-sidebar-submenu-inactive-text)",
    submenuActiveBackground: "var(--color-sidebar-submenu-active-bg)",
    footerBackground: "var(--color-sidebar-footer-bg)",
    logoutBackground: "var(--color-sidebar-logout-bg)",
    logoutBorder: "var(--color-sidebar-logout-border)",
    logoutText: "var(--color-sidebar-logout-text)",
  };

  useEffect(() => {
    setStoredMenus(getStoredAdminMenuTree());
  }, [location.pathname]);

  const normalizedMenu = useMemo(
    () =>
      storedMenus
        .map((menu) =>
          simplifyMenuManagement({
            ...menu,
            resolvedPath: getMenuRoutePath(menu.menu_key),
            isActive: isPathMatched(location.pathname, menu.menu_key, menu.children || []),
            children: (menu.children || []).map((child) => ({
              ...child,
              resolvedPath: getMenuRoutePath(child.menu_key),
              isActive: isPathMatched(location.pathname, child.menu_key, child.children || []),
            })),
          })
        ),
    [location.pathname, storedMenus]
  );

  const [openMenus, setOpenMenus] = useState(() =>
    normalizedMenu.reduce((acc, menu) => {
      if ((menu.children || []).length && menu.isActive) {
        acc[menu.menu_id] = true;
      }
      return acc;
    }, {})
  );

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      normalizedMenu.forEach((menu) => {
        if ((menu.children || []).length && menu.isActive) {
          next[menu.menu_id] = true;
        }
      });
      return next;
    });
  }, [normalizedMenu]);

  const handleParentToggle = (menuId) => {
    if (collapsed) {
      return;
    }

    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  return (
    <div
      className="flex h-screen min-h-0 flex-col overflow-hidden px-4 py-[18px]"
      style={{
        backgroundColor: sidebarColors.panelBackground,
        borderRight: `1px solid ${sidebarColors.panelBorder}`,
      }}
    >
      <div className={`${collapsed ? "grid justify-items-center pb-3 pt-1" : "pb-4"}`}>
        <div className={`transition-[width,height,padding,transform,border-radius] duration-300 ${collapsed ? "grid h-14 w-14 place-items-center rounded-2xl" : "rounded-[22px] px-4 py-[18px]"
          }`}
          style={{
            border: `1px solid ${sidebarColors.panelBorder}`,
            boxShadow: sidebarColors.panelShadow,
            backgroundImage: `linear-gradient(135deg, ${sidebarColors.headerGradientStart} 0%, ${sidebarColors.headerGradientEnd} 100%)`,
          }}>
          {collapsed ? (
            <span className="text-base font-black tracking-tight text-brand-500">{en.sidebar.brand.collapsedName}</span>
          ) : (
            <div className="grid gap-1">
              <p className="m-0 text-[0.72rem] font-black uppercase tracking-[0.18em] text-brand-500">{en.sidebar.brand.eyebrow}</p>
              <h1 className="m-0 text-[1.45rem] font-semibold leading-[1.1] tracking-[0.01em] text-text-strong">
                {en.sidebar.brand.name}
              </h1>
              <span className="text-[0.78rem] font-semibold text-text-muted">{en.sidebar.brand.subtitle}</span>
            </div>
          )}
        </div>
      </div>

      <nav
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 ${collapsed ? "flex flex-col items-center gap-2" : "flex flex-col items-stretch gap-2"}`}
        style={{ backgroundImage: `linear-gradient(to bottom, ${sidebarColors.navGradientStart}, ${sidebarColors.navGradientEnd})` }}
      >
        {normalizedMenu.map((menu) => {
          const hasChildren = Boolean(menu.children?.length);
          const isOpen = hasChildren ? openMenus[menu.menu_id] || false : false;
          const Icon = iconMap[menu.menu_key] || DefaultIcon;
          const menuLabel = getSidebarLabel(menu);

          const parentClassName = `relative flex items-center gap-3 font-bold text-left no-underline transition-[transform,box-shadow] duration-200 ${collapsed
              ? "h-14 w-14 justify-center rounded-[18px] px-0"
              : "min-h-[54px] w-full justify-start rounded-2xl px-[14px]"
            }`;

          const iconWrapClassName = "grid h-8 w-8 shrink-0 place-items-center rounded-[10px]";

          if (!hasChildren && menu.resolvedPath) {
            return (
              <NavLink
                key={menu.menu_id}
                to={menu.resolvedPath}
                className={parentClassName}
                onClick={onNavigate}
                title={collapsed ? menuLabel : undefined}
                style={{
                  transform: menu.isActive ? "translateX(2px)" : undefined,
                  backgroundColor: menu.isActive ? sidebarColors.activeBackground : "transparent",
                  color: menu.isActive ? sidebarColors.activeText : sidebarColors.inactiveText,
                  boxShadow: menu.isActive ? "0 10px 20px rgba(52,211,153,0.18)" : "none",
                }}
              >
                {menu.isActive ? (
                  <span
                    className="absolute left-0 top-2 h-[70%] w-[3px] rounded-r-full"
                    style={{ backgroundColor: sidebarColors.activeIndicator }}
                  />
                ) : null}
                <span
                  className={iconWrapClassName}
                  style={{ backgroundColor: menu.isActive ? sidebarColors.iconActiveBackground : sidebarColors.iconBackground }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                </span>
                {!collapsed ? <span>{menuLabel}</span> : null}
              </NavLink>
            );
          }

          return (
            <div key={menu.menu_id} className="grid w-full gap-2">
              <button
                type="button"
                className={parentClassName}
                onClick={() => handleParentToggle(menu.menu_id)}
                title={collapsed ? menuLabel : undefined}
                aria-expanded={collapsed ? false : isOpen}
                style={{
                  transform: menu.isActive ? "translateX(2px)" : undefined,
                  backgroundColor: menu.isActive ? sidebarColors.activeBackground : "transparent",
                  color: menu.isActive ? sidebarColors.activeText : sidebarColors.inactiveText,
                  boxShadow: menu.isActive ? "0 10px 20px rgba(52,211,153,0.18)" : "none",
                }}
              >
                {menu.isActive ? (
                  <span
                    className="absolute left-0 top-2 h-[70%] w-[3px] rounded-r-full"
                    style={{ backgroundColor: sidebarColors.activeIndicator }}
                  />
                ) : null}
                <span
                  className={iconWrapClassName}
                  style={{ backgroundColor: menu.isActive ? sidebarColors.iconActiveBackground : sidebarColors.iconBackground }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                </span>
                {!collapsed ? (
                  <>
                    <span className="flex-1">{menuLabel}</span>
                    <ChevronIcon open={isOpen} className="h-[18px] w-[18px] shrink-0" />
                  </>
                ) : null}
              </button>

              {!collapsed && isOpen ? (
                <div
                  className="ml-[18px] grid gap-[6px] border-l pl-4"
                  style={{ borderColor: sidebarColors.submenuBorder }}
                >
                  {menu.children.map((child) => {
                    // ITEMS MENU NAME CODE LINES COMMEMT OUT DONT RMEOVE JUST COMEMNT
                    if (child.menu_key === "items") {
                      return null;
                    }
                    const ChildIcon = iconMap[child.menu_key] || DefaultIcon;
                    const childLabel = getSidebarLabel(child);

                    return (
                      <NavLink
                        key={child.menu_id}
                        to={child.resolvedPath || "#"}
                        className="flex min-h-11 items-center gap-[10px] rounded-xl px-3 no-underline font-semibold transition-[transform] duration-200"
                        onClick={child.resolvedPath ? onNavigate : undefined}
                        style={{
                          transform: child.isActive ? "translateX(2px)" : undefined,
                          backgroundColor: child.isActive
                            ? sidebarColors.submenuActiveBackground
                            : "transparent",
                          color: child.isActive ? "var(--color-brand-500)" : sidebarColors.submenuInactiveText,
                        }}
                      >
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]"
                          style={{
                            backgroundColor: child.isActive ? "rgba(2, 156, 88, 0.15)" : sidebarColors.iconBackground,
                          }}
                        >
                          <ChildIcon className="h-4 w-4 shrink-0" />
                        </span>
                        <span>{childLabel}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div
        className={`border-t pt-4 ${collapsed ? "grid justify-items-center" : "grid gap-3"}`}
        style={{ borderColor: sidebarColors.sectionBorder, backgroundColor: sidebarColors.footerBackground }}
      >
        <button
          type="button"
          className={`flex items-center gap-3 rounded-2xl border font-bold transition-[transform,box-shadow] duration-200 hover:-translate-y-px ${collapsed ? "h-14 w-14 justify-center px-0" : "min-h-[52px] w-full justify-start px-[14px]"
            }`}
          onClick={onLogout}
          title={collapsed ? en.sidebar.actions.logout : undefined}
          style={{
            borderColor: sidebarColors.logoutBorder,
            backgroundColor: sidebarColors.logoutBackground,
            color: sidebarColors.logoutText,
          }}
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
            style={{ backgroundColor: "rgba(194,65,53,0.12)", color: sidebarColors.logoutText }}
          >
            <LogoutIcon className="h-[18px] w-[18px] shrink-0" />
          </span>
          {!collapsed ? <span>{en.sidebar.actions.logout}</span> : null}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
