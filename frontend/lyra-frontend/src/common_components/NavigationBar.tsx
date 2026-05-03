// src/common_components/NavigationBar.tsx
import { Search, Download } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";

interface NavigationBarProps {
  title: string;
  searchQuery?: string;              // optional – only needed outside editor
  onSearchChange?: (value: string) => void; // optional
  onLogout: () => void;
  onSettings: () => void;
  isEditorView?: boolean;            // NEW: controls search vs export
  onExport?: () => void;             // NEW: callback for export (optional)
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage?: string | null;
}

export default function NavigationBar({
  title,
  searchQuery = "",
  onSearchChange,
  onLogout,
  onSettings,
  isEditorView = false,
  onExport,
  saveStatus = 'idle',
  saveMessage = null,
}: NavigationBarProps) {
  return (
    <nav className="bg-[var(--bg-secondary)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Left: Logo + Title (unchanged) */}
      <div className="flex items-center gap-3">
        {/* Inline SVG Logo – fully theme responsive */}
        <svg 
          width="36" 
          height="36" 
          viewBox="530 33 1500 1500" 
          fill="currentColor" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--accent)] transition-colors"
          aria-label="Lyra Logo"
        >
          <path 
            fillRule="evenodd" 
            clipRule="evenodd"
            d="m 637.12925,1498.8412 148.70036,-166.7114
            c 0,0 31.71952,1.1401 46.64106,-4.6076 18.52703,-7.1369 37.79481,-21.5857 42.5314,-39.8741 5.17873,-19.9957 -3.38191,-45.3929 -19.97799,-58.8129 -15.62004,-12.6308 -41.44587,-15.2175 -61.03033,-9.2016 -18.33682,5.6325 -34.02802,21.6583 -40.7068,38.6722 -6.24288,15.9032 3.94994,50.7194 3.94994,50.7194
            l -145.57132,174.9439
            c 0,0 51.20122,-115.9922 56.02582,-177.5616 3.67134,-46.852 -10.36178,-93.6532 -21.11189,-139.5323 -4.01039,-17.1155 -16.11786,-50.3467 -16.11786,-50.3467 115.94059,35.3383 192.28594,58.5285 313.41171,-58.7957
            l 506.19175,-576.12982 -39.1176,-28.02246
            c 0,0 -580.81813,648.67848 -585.29476,653.06558 -9.31432,9.1282 -149.6735,-73.4555 -189.41571,-138.78018 -47.27635,-77.70893 -75.25555,-184.25951 -37.11567,-266.28595 81.24796,-174.73785 363.99857,-248.314 507.04604,-280.78862 143.0477,-32.47462 170.9486,-43.21179 214.1194,-107.55791 22.6007,-33.68645 25.6189,-84.17743 5.762,-119.35884 -14.533,-25.74903 -48.9364,-40.40117 -79.3121,-45.69137 0,0 15.7058,40.54716 5.7176,57.26101 -11.4533,19.16553 -40.58,34.94153 -63.0607,28.89184 -28.9149,-7.78113 -51.1585,-43.77078 -47.9075,-71.87973 5.2711,-45.57283 54.3968,-90.609178 102.5,-98.120559 55.8977,-8.728533 118.561,28.63977 151.9225,71.698089 36.443,47.0363 42.909,109.06487 28.3924,172.52028
            l 259.0538,195.25448
            c 0,0 112.5033,-46.12388 167.1107,-31.41044 58.558,15.77792 123.6081,61.22672 133.016,117.80664 8.8249,53.07438 -30.0992,120.60925 -82.9497,141.03345 -29.5579,11.42278 -77.8377,1.53879 -91.9883,-25.39932 -11.492,-21.87713 8.9428,-51.73143 27.9906,-68.30454 17.7071,-15.40653 69.3507,-19.48336 69.3507,-19.48336 -13.5459,-32.62039 -42.5949,-53.49681 -74.4652,-57.91542 -43.8731,-6.0827 -94.4012,16.35681 -122.6272,48.51329 -75.8142,86.37127 -67.4609,235.00834 -73.5703,328.74751 -12.637,197.13345 -73.6486,317.41195 -206.608,393.24055 -87.8465,50.1 -210.7192,24.3997 -308.1718,-6.2086 -56.1541,-17.6371 -145.68085,-92.0133 -144.20041,-97.487 1.86181,-6.8839 561.52261,-683.98777 561.52261,-683.98777
            l -49.1719,-28.22905 -484.9551,572.64362
            c -125.32249,159.4168 -4.87837,304.9914 5.5884,321.382 0,0 -36.60533,-8.2736 -55.29794,-9.1288 -42.58812,-1.9488 -86.47555,-1.59 -127.54099,9.1979 -68.09275,17.888 -189.25772,90.0223 -189.25772,90.0223
            z
            m 814.62295,-314.3174
            c 114.6655,-159.444 112.7637,-403.15312 129.1231,-615.01012 -149.2064,179.52217 -510.6146,618.24322 -510.6146,618.24322 0,0 129.7871,84.8875 203.6803,82.5562 66.5828,-2.1008 149.4353,-46.3319 177.8112,-85.7893
            z
            m -83.698,-762.23122
            c 0,0 -477.01233,82.27074 -621.364,243.83955 -47.99635,53.72098 -67.77117,137.34428 -49.26608,205.30931 17.53195,64.39103 140.34365,149.50996 140.34365,149.50996
            z"  
          />
        </svg>

        <span className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </span>
      </div>

      {/* Center/Right: Conditional Search OR Export + Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {isEditorView ? (
          <>
          {/* Persistent Save Status – no background, theme colors */}
            <div className="flex items-center gap-2 text-sm font-medium">
              {saveStatus === 'saving' && (
                <span className="text-[var(--text-secondary)]">Saving…</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[var(--text-secondary)]">Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-[var(--text-secondary)]">Saving failed</span>
              )}
              {saveStatus === 'idle' && (
                <span className="text-[var(--text-secondary)]">Idle</span>
              )}
            </div>
            {/* Export button */}
            <button
              onClick={onExport}
              className="flex items-center gap-3 px-4 py-1.5 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 rounded-lg text-sm font-medium text-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] min-w-[100px] sm:min-w-[100px]"
              title="Export document"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        ) : (
          /* Original search field (only shown outside editor) */
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="
                pl-10 pr-4 py-1.5 
                bg-[var(--bg-secondary)] border border-[var(--border)] 
                rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] 
                w-56 lg:w-72 transition 
                text-[var(--text-primary)] placeholder-[var(--text-secondary)]
              "
            />
          </div>
        )}

        {/* Profile dropdown – always on the right */}
        <ProfileDropdown onSettings={onSettings} onLogout={onLogout} />
      </div>
    </nav>
  );
}