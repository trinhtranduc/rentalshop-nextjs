"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Card,
  CardContent,
  formatDate
} from '@rentalshop/ui';
import { History, Loader2, User, Clock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export interface ChangeHistoryEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string | null;
  user?: { id: number; email: string; name: string; role: string } | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  changes?: Record<string, { old: any; new: any }> | null;
  description?: string | null;
  createdAt: string;
  outcome?: string;
}

export interface ChangeHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Async function to load history (e.g. () => fetch('/api/customers/123/history').then(r => r.json())) */
  loadHistory: () => Promise<{ success: boolean; data: ChangeHistoryEntry[]; pagination?: { total: number } }>;
  /** Optional: called when user clicks "Revert to this" on an UPDATE entry. If not provided, revert button is hidden. */
  onRevert?: (log: ChangeHistoryEntry) => Promise<void>;
}

function ActionBadge({ action }: { action: string }) {
  const style =
    action === 'CREATE'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : action === 'UPDATE'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        : action === 'DELETE'
          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          : action === 'RESTORE'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  return <Badge className={style}>{action}</Badge>;
}

export function ChangeHistoryDialog({ open, onClose, title = 'Change History', loadHistory, onRevert }: ChangeHistoryDialogProps) {
  const [logs, setLogs] = useState<ChangeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [revertingId, setRevertingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    loadHistory()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setLogs(res.data);
        else setLogs([]);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load history');
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [open, loadHistory]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive py-4">{error}</p>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No change history yet.</p>
          )}
          {!loading && !error && logs.length > 0 && (
            <ul className="space-y-3 pr-2">
              {logs.map((log) => (
                <li key={log.id}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <ActionBadge action={log.action} />
                          {log.description && (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {log.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {log.user && (
                            <span className="flex items-center gap-1" title={log.user.email}>
                              <User className="w-3 h-3" />
                              {log.user.name || log.user.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                      {(log.changes && Object.keys(log.changes).length > 0) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          >
                            {expandedId === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {expandedId === log.id ? 'Hide' : 'Show'} changes
                          </Button>
                          {expandedId === log.id && log.changes && (
                            <div className="mt-2 pt-2 border-t text-xs space-y-1">
                              {Object.entries(log.changes).map(([field, { old: o, new: n }]) => (
                                <div key={field} className="flex flex-wrap gap-1">
                                  <span className="font-medium">{field}:</span>
                                  <span className="text-muted-foreground">{String(o)}</span>
                                  <span>→</span>
                                  <span>{String(n)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {onRevert && log.action === 'UPDATE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              disabled={revertingId === log.id}
                              onClick={async () => {
                                setRevertingId(log.id);
                                try {
                                  await onRevert(log);
                                  onClose();
                                } finally {
                                  setRevertingId(null);
                                }
                              }}
                            >
                              {revertingId === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              Revert to this
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
