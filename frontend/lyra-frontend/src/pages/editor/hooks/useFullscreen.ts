import { useEffect, useCallback, RefObject } from "react";

/**
 * useFullscreen: Custom hook for managing fullscreen mode with cross-browser support.
 * Handles requestFullscreen/exitFullscreen, Escape key, and fullscreenchange events.
 */
export function useFullscreen(
  containerRef: RefObject<HTMLElement>,
  isFullscreen: boolean,
  onFullscreenChange: (isFullscreen: boolean) => void
) {
  // Get vendor-prefixed fullscreen methods for cross-browser compatibility
  const getFullscreenMethods = () => {
    const doc = document as any;
    return {
      requestFullscreen:
        containerRef.current?.requestFullscreen ||
        containerRef.current?.webkitRequestFullscreen ||
        containerRef.current?.mozRequestFullScreen ||
        containerRef.current?.msRequestFullscreen,
      exitFullscreen:
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen,
      fullscreenElement:
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement,
      fullscreenChangeEvent: "fullscreenchange",
    };
  };

  const toggleFullscreen = useCallback(async () => {
    const methods = getFullscreenMethods();

    if (!methods.requestFullscreen) {
      console.warn("Fullscreen API not supported in this browser");
      return;
    }

    try {
      if (isFullscreen) {
        // Exit fullscreen
        await methods.exitFullscreen?.call(document);
        onFullscreenChange(false);
      } else {
        // Enter fullscreen
        await methods.requestFullscreen.call(containerRef.current);
        onFullscreenChange(true);
      }
    } catch (error) {
      console.error("Fullscreen toggle error:", error);
      // Gracefully handle permission denied or fullscreen not supported
      onFullscreenChange(false);
    }
  }, [isFullscreen, onFullscreenChange, containerRef]);

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  // Listen for browser fullscreenchange event to sync state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const methods = getFullscreenMethods();
      const isCurrentlyFullscreen = !!methods.fullscreenElement;

      if (isFullscreen && !isCurrentlyFullscreen) {
        // User exited via browser UI
        onFullscreenChange(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isFullscreen, onFullscreenChange]);

  return toggleFullscreen;
}
