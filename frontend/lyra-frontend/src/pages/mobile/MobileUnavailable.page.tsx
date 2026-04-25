import React from 'react';
import { useNavigate } from 'react-router-dom';

const MobileUnavailablePage: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenDesktopMode = () => {
    // 1. Set desktop viewport
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }

    // Stronger desktop forcing
    viewport.setAttribute(
      'content',
      'width=1280, initial-scale=0.8, maximum-scale=1.2, user-scalable=yes'
    );

    // 2. Add desktop flag to URL
    const url = new URL(window.location.href);
    url.searchParams.set('desktop', 'true');

    // 3. Hard reload after a tiny delay (most reliable on mobile)
    setTimeout(() => {
      window.location.replace(url.toString());   // replace instead of assign to avoid history issues
    }, 80);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-12">
          <h1 className="text-6xl font-bold tracking-tighter text-foreground">Lyra</h1>
        </div>

        <div className="mb-10">

          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Not available on mobile
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed">
            Lyra is optimized for tablets and desktop browsers.<br />
            Desktop mode will scale the interface proportionally so everything stays visible.
          </p>
        </div>

        <button
          onClick={handleOpenDesktopMode}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-xl text-base mb-6 transition-colors"
        >
          Open in Desktop Mode
        </button>

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