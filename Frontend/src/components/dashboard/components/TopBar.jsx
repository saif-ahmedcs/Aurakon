"use client";

import { RankEmblem } from "./RankEmblem";
import {
  LogoMark,
  HamburgerIcon,
  CloseIcon,
} from "./icons";

/* Top navigation bar: hamburger popover menu (My Account / log out),
 * brand mark, and the profile pill that opens the profile dialog.
 * The swipe-to-dismiss touch handlers close the compact popover menu
 * when the user drags past a small threshold in any direction.
 * Level and title are backend-provided (GET /api/progress). */
export function TopBar({
  heroName,
  rankTier,
  level,
  title,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onMenuTouchStart,
  onMenuTouchEnd,
  onOpenProfile,
  onOpenMyAccount,
  onRequestLogout,
  onRequestLogoutAll,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="menu-btn-wrap">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={onToggleMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>

          {menuOpen && (
            <>
              <div className="menu-scrim" onClick={onCloseMenu} />
              <nav
                className="game-menu"
                aria-label="Main menu"
                onTouchStart={onMenuTouchStart}
                onTouchEnd={onMenuTouchEnd}
              >
                <div className="game-menu-notch" aria-hidden="true" />
                <button className="game-menu-item" onClick={onOpenMyAccount}>
                  My Account
                </button>
                <div className="game-menu-divider" />
                <button className="game-menu-item" onClick={onRequestLogoutAll}>
                  Log Out All Devices
                </button>
                <button
                  className="game-menu-item game-menu-danger"
                  onClick={onRequestLogout}
                >
                  Log Out
                </button>
              </nav>
            </>
          )}
        </div>
        <div className="logo">
          <LogoMark />
        </div>
      </div>

      <button type="button" className="profile-block" onClick={onOpenProfile}>
        <span className="avatar avatar-emblem" aria-hidden="true">
          <RankEmblem tier={rankTier} size={30} state="active" />
          <span className="avatar-level-badge">{level}</span>
        </span>
        <span className="profile-text">
          <span className="profile-name">{heroName}</span>
          <span className="profile-title">{title}</span>
        </span>
      </button>
    </header>
  );
}
