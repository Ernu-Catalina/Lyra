import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/Login.page";
import RegisterPage from "./pages/auth/Register.page";
import ForgotPasswordForm from "./pages/auth/components/ForgotPasswordForm";
import ResetPasswordForm from "./pages/auth/components/ResetPasswordForm";
import ProjectsPage from "./pages/projects/Projects.page";
import DocumentsPage from "./pages/documents/Documents.page";
import EditorPage from "./pages/editor/Editor.page";

import ProtectedRoute from "./auth/ProtectedRoute";
import SettingsPage from "./pages/settings/Settings.page";

import { useIsPhone } from "./hooks/useIsPhone";

function AppContent() {

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />

      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/documents/:documentId"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;