import { IntentPrefetchLink } from "./IntentPrefetchLink";

const LOGO_SRC = "/assets/logo.svg";
export function SiteNav() {
  return (
    <nav
      aria-label="Main"
      data-orientation="horizontal"
      dir="ltr"
      className="site-navbar site-navbar--simple"
      style={{
        position: "sticky",
        boxShadow: "var(--navbar-shadow)",
        WebkitBoxShadow: "var(--navbar-shadow)",
      }}
    >
      <div className="site-navbar__content">
        <IntentPrefetchLink
          href="/"
          className="notion-link site-navbar__logo"
          data-server-link={true}
          data-link-uri="/"
        >
          <div className="site-navbar__logo-image">
            <span style={{ display: "contents" }}>
              <img
                alt="Logo"
                width={80}
                height={55}
                decoding="async"
                loading="eager"
                fetchPriority="high"
                style={{ color: "transparent", objectFit: "contain", objectPosition: "left" }}
                src={LOGO_SRC}
              />
            </span>
          </div>
        </IntentPrefetchLink>
        <div style={{ position: "relative" }}>
          <ul data-orientation="horizontal" className="site-navbar__item-list" dir="ltr" />
        </div>
      </div>
      <div className="site-navbar__viewport-wrapper" />
    </nav>
  );
}
