import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useIsPhone } from "../hooks/useIsPhone";   // ← import
import MobileUnavailablePage from "../pages/mobile/MobileUnavailable.page";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}) {
  const { token } = useAuth();
  const isPhone = useIsPhone();

  // First check for mobile (only on protected routes)
  if (isPhone) {
    return <MobileUnavailablePage />;
  }

  // Then check authentication
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}