export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-text-muted sm:flex-row">
        <span>© {new Date().getFullYear()} 9K Systems. Run by one operator.</span>
        <div className="flex items-center gap-5">
          <a href="#pricing" className="hover:text-text-secondary">
            Pricing
          </a>
          <a href="mailto:shintenraiho9@gmail.com" className="hover:text-text-secondary">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
