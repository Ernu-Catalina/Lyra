// features/documents/Documents.page.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../auth/useAuth";
import axios from "axios";

interface Document {
  _id: string;
  title: string;
  total_wordcount: number;
  created_at: string;
}

export default function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const fetchDocuments = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/documents`);
        setDocuments(res.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          logout();
          navigate("/login");
        } else {
          setError("Failed to load documents");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId, logout, navigate]);

  const createDocument = async () => {
    const title = newTitle.trim();
    if (!title) {
      setError("Title cannot be empty");
      return;
    }

    try {
      const res = await api.post(`/projects/${projectId}/documents`, { title });
      setDocuments((prev) => [...prev, res.data]);
      setNewTitle("");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        navigate("/login");
      } else {
        setError("Failed to create document");
      }
    }
  };

  if (loading) return <p>Loading documents...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <button onClick={() => navigate("/projects")}>← Back to Projects</button>

      <h2>Documents</h2>

      <div>
        <input
          placeholder="New document title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button onClick={createDocument} disabled={!newTitle.trim()}>
          Create Document
        </button>
      </div>

      {documents.length === 0 ? (
        <p>No documents yet.</p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li
              key={doc._id}
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate(`/projects/${projectId}/documents/${doc._id}`)}
            >
              {doc.title} ({doc.total_wordcount} words)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}