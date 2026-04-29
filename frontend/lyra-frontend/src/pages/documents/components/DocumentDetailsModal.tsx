import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import api from "../../../api/client";
import type { Item, DocumentStats, ChapterStat, SceneStat } from "../../../types/document";

interface DocumentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Item | null;
  projectId: string;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
      <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
      <div className="text-xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function StatPair({
  longestLabel,
  shortestLabel,
  longest,
  shortest,
  showChapterTitle = false,
}: {
  longestLabel: string;
  shortestLabel: string;
  longest: (ChapterStat & { chapter_title?: string }) | SceneStat | undefined | null;
  shortest: (ChapterStat & { chapter_title?: string }) | SceneStat | undefined | null;
  showChapterTitle?: boolean;
}) {
  if (!longest && !shortest) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {longest && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)] mb-1">{longestLabel}</div>
          <div className="font-medium text-sm truncate" title={longest.title}>
            {longest.title || "Untitled"}
          </div>
          {showChapterTitle && (longest as SceneStat).chapter_title && (
            <div className="text-xs text-[var(--text-secondary)] truncate">
              in {(longest as SceneStat).chapter_title}
            </div>
          )}
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {longest.word_count.toLocaleString()} words
          </div>
        </div>
      )}
      {shortest && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
          <div className="text-xs text-[var(--text-secondary)] mb-1">{shortestLabel}</div>
          <div className="font-medium text-sm truncate" title={shortest.title}>
            {shortest.title || "Untitled"}
          </div>
          {showChapterTitle && (shortest as SceneStat).chapter_title && (
            <div className="text-xs text-[var(--text-secondary)] truncate">
              in {(shortest as SceneStat).chapter_title}
            </div>
          )}
          <div className="text-xs text-[var(--text-secondary)] mt-0.5">
            {shortest.word_count.toLocaleString()} words
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetailsModal({
  isOpen,
  onClose,
  document,
  projectId,
}: DocumentDetailsModalProps) {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFailed, setStatsFailed] = useState(false);

  useEffect(() => {
    if (!isOpen || !document || document.type !== "document") {
      setStats(null);
      setStatsFailed(false);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);
    setStats(null);
    setStatsFailed(false);

    api
      .get(`/projects/${projectId}/documents/${document._id}/stats`)
      .then((res) => {
        if (!cancelled) {
          setStats(res.data);
          setStatsFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setStatsFailed(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, document?._id, projectId]);

  if (!isOpen || !document) return null;

  const createdDate = new Date(document.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const updatedDate = new Date(document.updated_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // Prefer stats data; fall back to list-endpoint data on document prop
  const chapterCount = stats?.chapter_count ?? document.chapter_count ?? 0;
  const sceneCount   = stats?.scene_count   ?? document.scene_count   ?? 0;
  const wordCount    = stats?.word_count     ?? document.word_count    ?? 0;

  const avgChapterLength = chapterCount > 0 ? Math.round(wordCount / chapterCount) : null;
  const avgSceneLength   = sceneCount   > 0 ? Math.round(wordCount / sceneCount)   : null;

  // Longest / shortest come from stats if available, otherwise from list-endpoint data
  const longestChapter  = stats?.longest_chapter  ?? document.longest_chapter;
  const shortestChapter = stats?.shortest_chapter ?? document.shortest_chapter;
  const longestScene    = stats?.longest_scene    ?? document.longest_scene;
  const shortestScene   = stats?.shortest_scene   ?? document.shortest_scene;

  const hasChapterBreakdown = !!(longestChapter || shortestChapter);
  const hasSceneBreakdown   = !!(longestScene   || shortestScene);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold">Document Details</h2>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Title */}
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1">Title</div>
            <div className="text-lg font-semibold break-words">{document.title}</div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Created</div>
              <div className="font-medium text-[var(--text-primary)]">{createdDate}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-secondary)] mb-0.5">Last Modified</div>
              <div className="font-medium text-[var(--text-primary)]">{updatedDate}</div>
            </div>
          </div>

          {/* Primary counts */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Chapters"    value={chapterCount} />
            <StatCard label="Scenes"      value={sceneCount} />
            <StatCard label="Total Words" value={wordCount.toLocaleString()} />
          </div>

          {/* Averages */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Avg Chapter Length"
              value={avgChapterLength !== null ? `${avgChapterLength.toLocaleString()} words` : "—"}
            />
            <StatCard
              label="Avg Scene Length"
              value={avgSceneLength !== null ? `${avgSceneLength.toLocaleString()} words` : "—"}
            />
          </div>

          {/* Longest / Shortest chapter — from list data, no stats fetch required */}
          {hasChapterBreakdown && (
            <div>
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">Chapters</div>
              <StatPair
                longestLabel="Longest"
                shortestLabel="Shortest"
                longest={longestChapter}
                shortest={shortestChapter}
              />
            </div>
          )}

          {/* Longest / Shortest scene — from list data, no stats fetch required */}
          {hasSceneBreakdown && (
            <div>
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">Scenes</div>
              <StatPair
                longestLabel="Longest"
                shortestLabel="Shortest"
                longest={longestScene}
                shortest={shortestScene}
                showChapterTitle
              />
            </div>
          )}

          {/* Characters & pages — requires stats fetch */}
          {statsLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-[var(--text-secondary)] text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading character counts and page estimate…
            </div>
          )}

          {stats && (
            <div>
              <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">Characters & Pages</div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Characters (with spaces)"
                  value={stats.character_count_with_spaces.toLocaleString()}
                />
                <StatCard
                  label="Characters (no spaces)"
                  value={stats.character_count_without_spaces.toLocaleString()}
                />
                <StatCard
                  label="Approx. Pages"
                  value={stats.estimated_pages != null && stats.estimated_pages > 0
                    ? `~${stats.estimated_pages}`
                    : "—"}
                />
                <StatCard label="Time in Editor" value="—" />
              </div>
            </div>
          )}

          {statsFailed && (
            <div className="text-xs text-[var(--text-secondary)] text-center py-2">
              Character counts and page estimate unavailable.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
