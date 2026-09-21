"use client";

import { useEffect, useState } from "react";
import { Ban, Loader2, X } from "lucide-react";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type {
  BlockedSeat,
  BlockedSeatHistoryItem,
  BlockType,
} from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS, STATUS_LABELS, STATUS_STYLES } from "../utils/constants";
import type { BlockedSeatAction } from "./BlockedSeatActionMenu";

interface Props {
  action: BlockedSeatAction;
  row: BlockedSeat;
  onClose: () => void;
  onChanged: () => void;
}

const today = () => new Date().toLocaleDateString("en-CA");
const errorMessage = (error: unknown, fallback: string) =>
  (
    error as {
      response?: {
        data?: { detail?: { message?: string }; error?: { message?: string } };
      };
    }
  ).response?.data?.detail?.message ??
  (
    error as { response?: { data?: { error?: { message?: string } } } }
  ).response?.data?.error?.message ??
  fallback;

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400";

const historyLabel = (action: string) =>
  ({
    "seat_block.created": "Block created",
    "seat_block.updated": "Block updated",
    "seat_block.cancelled": "Block cancelled",
  })[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");

export default function BlockedSeatActionPanel({
  action,
  row,
  onClose,
  onChanged,
}: Props) {
  const reblock = action === "reblock";
  const editing = action === "modify" || reblock;
  const [blockType, setBlockType] = useState<BlockType>(row.block_type);
  const [from, setFrom] = useState(reblock ? today() : row.blocked_from);
  const [to, setTo] = useState(reblock ? today() : row.blocked_to);
  const [reason, setReason] = useState(row.reason);
  const [unblockReason, setUnblockReason] = useState("");
  const [history, setHistory] = useState<BlockedSeatHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (action !== "history") return;
    let cancelled = false;
    setLoadingHistory(true);
    setError("");
    blockedSeatsService
      .history(row.block_id)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setHistory([]);
          setError(errorMessage(requestError, "Unable to load audit history."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [action, row.block_id]);

  const save = async () => {
    if (to < from || !reason.trim()) {
      setError("Enter a valid date range and reason.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (reblock) {
        await blockedSeatsService.create({
          seat_ids: [Number(row.seat_id)],
          block_type: blockType,
          blocked_from: from,
          blocked_to: to,
          reason: reason.trim(),
        });
      } else {
        await blockedSeatsService.update(row.block_id, {
          block_type: blockType,
          blocked_from: from,
          blocked_to: to,
          reason: reason.trim(),
        });
      }
      onChanged();
      onClose();
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Unable to save the seat block."));
    } finally {
      setSaving(false);
    }
  };

  const unblock = async () => {
    if (!unblockReason.trim()) return;
    setSaving(true);
    setError("");
    try {
      await blockedSeatsService.cancel(row.block_id, unblockReason.trim());
      onChanged();
      onClose();
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Unable to unblock the seat."));
    } finally {
      setSaving(false);
    }
  };

  if (action === "unblock") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4" role="dialog" aria-modal="true">
        <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b p-5">
            <h2 className="text-lg font-bold text-gray-900">Unblock Seat</h2>
            <button onClick={onClose} aria-label="Close"><X size={20} /></button>
          </header>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Are you sure you want to unblock <strong>{row.seat_code}</strong>? This seat will become available for booking.
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Reason for unblocking *
              <textarea
                value={unblockReason}
                onChange={(event) => setUnblockReason(event.target.value)}
                className="mt-1.5 min-h-24 w-full rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={500}
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <footer className="flex justify-end gap-2 border-t p-4">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button disabled={!unblockReason.trim() || saving} onClick={() => void unblock()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Ban size={15} />} Unblock Seat
            </button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45" role="dialog" aria-modal="true">
      <section className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editing
                ? reblock
                  ? "Re-block Seat"
                  : "Modify Block"
                : "Blocked Seat Audit History"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{row.seat_code}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className={`flex-1 overflow-y-auto ${action === "history" ? "space-y-3 p-4" : "space-y-5 p-5"}`}>
          <section className={`rounded-xl border border-gray-200 ${action === "history" ? "p-3" : "p-4"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`${action === "history" ? "text-sm" : ""} font-semibold text-gray-900`}>{row.site_name}</p>
                <p className={`${action === "history" ? "mt-0.5 text-xs" : "mt-1 text-sm"} text-gray-500`}>{row.building_name} · {row.floor_name}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[row.display_status]}`}>
                {STATUS_LABELS[row.display_status]}
              </span>
            </div>
          </section>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Block Type
                <select value={blockType} onChange={(event) => setBlockType(event.target.value as BlockType)} className={fieldClass}>
                  {BLOCK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Block From
                <input type="date" value={from} min={reblock ? today() : undefined} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Block To
                <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
              </label>
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                Reason *
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-1.5 min-h-28 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
            </div>
          ) : action === "history" ? (
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl border border-gray-200 p-3 text-xs">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Block Type</dt>
                <dd className="mt-0.5 font-medium text-gray-800">{row.block_type.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Block Period</dt>
                <dd className="mt-0.5 font-medium text-gray-800">{row.blocked_from} – {row.blocked_to}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Blocked By</dt>
                <dd className="mt-0.5 font-medium text-gray-800">{row.blocked_by.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Created</dt>
                <dd className="mt-0.5 font-medium text-gray-800">{new Date(row.created_at).toLocaleString()}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reason</dt>
                <dd className="mt-0.5 break-words font-medium text-gray-800 [overflow-wrap:anywhere]">{row.reason}</dd>
              </div>
            </dl>
          ) : (
            <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-3 rounded-xl border border-gray-200 p-4 text-sm">
              <dt className="text-gray-500">Block Type</dt><dd>{row.block_type.replaceAll("_", " ")}</dd>
              <dt className="text-gray-500">Block Period</dt><dd>{row.blocked_from} – {row.blocked_to}</dd>
              <dt className="text-gray-500">Reason</dt><dd className="break-words [overflow-wrap:anywhere]">{row.reason}</dd>
              <dt className="text-gray-500">Blocked By</dt><dd>{row.blocked_by.name ?? "—"}</dd>
              <dt className="text-gray-500">Created</dt><dd>{new Date(row.created_at).toLocaleString()}</dd>
            </dl>
          )}

          {action === "history" && (
            <section className="min-h-[360px] rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900">Audit History</h3>
                {!loadingHistory && !error && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {history.length} {history.length === 1 ? "event" : "events"}
                  </span>
                )}
              </div>
              {loadingHistory ? (
                <p className="text-sm text-gray-500">Loading audit history…</p>
              ) : error ? null : history.length ? (
                <ol className="space-y-6 border-l-2 border-indigo-200 pl-5">
                  {history.map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                      <p className="text-[15px] font-semibold text-gray-900">{historyLabel(item.action)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.actor_name ?? item.actor_email ?? "System"} · {new Date(item.occurred_at).toLocaleString()}
                      </p>
                      {!!item.changed_fields?.length && <p className="mt-1 text-xs text-gray-500">Changed: {item.changed_fields.join(", ")}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500">No audit events found.</p>
              )}
            </section>
          )}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t p-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">{editing ? "Cancel" : "Close"}</button>
          {editing && (
            <button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {saving && <Loader2 className="animate-spin" size={15} />}
              {reblock ? "Re-block Seat" : "Save Changes"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
