import React from 'react';
import { useNavigate } from 'react-router-dom';

const MobileUnavailablePage: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenDesktopMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('desktop', 'true');

    // Force desktop viewport scaling for proportional layout
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute(
      'content',
      'width=1280, initial-scale=0.75, maximum-scale=1.5, user-scalable=yes'
    );

    // Navigate with desktop flag (prevents re-showing the mobile screen)
    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Lyra branding - uses theme colors */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold tracking-tighter text-foreground">Lyra</h1>
        </div>

        <div className="mb-10">

          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Not available on mobile
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed">
            Lyra is optimized for tablets and desktop browsers.<br />
            Please switch to desktop mode for full functionality and proper scaling.
          </p>
        </div>

        {/* Primary button - uses theme accent colors */}
        <button
          onClick={handleOpenDesktopMode}
          className="w-full bg-primary hover:bg-primary/90 active:bg-primary/95 
                     text-primary-foreground font-medium py-3.5 rounded-xl 
                     text-base mb-6 transition-colors focus:outline-none 
                     focus:ring-2 focus:ring-primary focus:ring-offset-2 
                     focus:ring-offset-background"
        >
          Open in Desktop Mode
        </button>

        {/* Secondary link */}
        <button
          onClick={() => navigate('/login')}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default MobileUnavailablePage;