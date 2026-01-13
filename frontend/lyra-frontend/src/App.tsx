import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import ProtectedRoute from "./auth/ProtectedRoute";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/documents/:documentId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
