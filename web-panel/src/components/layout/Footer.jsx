/**
 * Footer — Alt bilgi çubuğu
 */
export default function Footer() {
  return (
    <footer className="flex justify-between items-center w-full px-gutter py-stack-sm bg-surface-container-low border-t border-outline-variant flex-shrink-0 z-10">
      <span className="font-label-md text-label-md font-bold text-on-surface-variant">
        © 2026 CatchMe Platform. System Health: All Sensors Operational.
      </span>
      <div className="flex space-x-4 hidden sm:flex">
        <a
          href="#"
          className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          Support
        </a>
        <a
          href="#"
          className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          Privacy Policy
        </a>
        <a
          href="#"
          className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          System Status
        </a>
      </div>
    </footer>
  );
}
