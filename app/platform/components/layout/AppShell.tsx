"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getNavigation } from "../../config/navigation";
import { Icon } from "../../icons";
import type { PageId, User } from "../../types";

interface Props {
  user: User;
  page: PageId;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  toast: string;
  children: ReactNode;
}

export function AppShell({
  user,
  page,
  onNavigate,
  onLogout,
  toast,
  children,
}: Props) {
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCollapsed(
        window.localStorage.getItem("pulsehub-sidebar") === "collapsed",
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node))
        setAccountMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const navigate = (target: PageId) => {
    onNavigate(target);
    setMobileNav(false);
  };
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMobileNav((open) => !open);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        "pulsehub-sidebar",
        next ? "collapsed" : "expanded",
      );
      return next;
    });
  };
  const startPage: PageId = user.role === "admin" ? "admin_roles" : "home";
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button
        className="mobile-menu-trigger"
        onClick={toggleSidebar}
        aria-label="Открыть меню"
      >
        <Icon name="menu" />
      </button>
      {mobileNav && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobileNav(false)}
          aria-label="Закрыть меню"
        />
      )}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileNav ? "open" : ""}`}
      >
        <div className="sidebar-header">
          <button className="brand" onClick={() => navigate(startPage)}>
            <span className="brand-mark">P</span>
            <span className="brand-text">
              pulse<small>people hub</small>
            </span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            <Icon name="menu" />
          </button>
        </div>
        <nav className="main-nav" aria-label="Основное меню">
          <p className="nav-caption">
            {user.role === "admin"
              ? "Администрирование"
              : "Рабочее пространство"}
          </p>
          {getNavigation(user.role, user.capabilities).map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="tenant">
            <span className="tenant-logo">
              {(user.companyName ?? "P").slice(0, 1)}
            </span>
            <span>
              <b>{user.companyName ?? "Рабочее пространство"}</b>
              <small>Компания</small>
            </span>
          </div>
          <div className="account-menu-wrap" ref={accountRef}>
            <button
              className="side-user"
              onClick={() => setAccountMenu((open) => !open)}
              aria-expanded={accountMenu}
              aria-haspopup="menu"
            >
              <span className="avatar small">{user.initials}</span>
              <span>
                <b>{user.name}</b>
                <small>{user.position}</small>
              </span>
              <span className="dots">•••</span>
            </button>
            {accountMenu && (
              <div className="account-dropdown" role="menu">
                <div>
                  <b>{user.name}</b>
                  <small>{user.email ?? user.position}</small>
                </div>
                <button role="menuitem" onClick={onLogout}>
                  Выйти из аккаунта
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <main className="content">{children}</main>
      </div>
      {["manager", "hr"].includes(user.role) && page !== "career" && (
        <button className="quick-ai" onClick={() => navigate("career")}>
          <Icon name="spark" />
          <span>Спросить AI</span>
        </button>
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}
