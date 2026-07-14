'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';

import {
  VENUE_CONTACT_CHANNELS,
  type VenueContactChannel,
  type VenueContactRouteSummary,
} from '@/lib/venue-contact-routes';

type ContactDraft = {
  channel: VenueContactChannel;
  label: string;
  purpose: string;
  url: string;
  responseHours: string;
  isPersonal: boolean;
  consentConfirmed: boolean;
};

function makeDraft(contact?: VenueContactRouteSummary): ContactDraft {
  return {
    channel: contact?.channel ?? 'INSTAGRAM',
    label: contact?.label ?? 'Official Instagram',
    purpose: contact?.purpose ?? '',
    url: contact?.url ?? '',
    responseHours: contact?.responseHours ?? '',
    isPersonal: false,
    consentConfirmed: false,
  };
}

export default function VenueContactEditor({
  venueSlug,
  initialContacts,
  canEdit,
}: {
  venueSlug: string;
  initialContacts: VenueContactRouteSummary[];
  canEdit: boolean;
}) {
  const { data: session } = useSession();
  const sessionToken = (session as { token?: string | null } | null)?.token ?? null;
  const [contacts, setContacts] = useState<ContactDraft[]>(() => initialContacts.map(makeDraft));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateContact(index: number, patch: Partial<ContactDraft>) {
    setContacts((current) => current.map((contact, contactIndex) => (
      contactIndex === index ? { ...contact, ...patch } : contact
    )));
  }

  async function saveContacts() {
    if (!canEdit || saving) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/venues/${encodeURIComponent(venueSlug)}/contacts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ contacts }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to save official contacts');
      }

      setContacts((payload.data?.contacts ?? []).map(makeDraft));
      setMessage(contacts.length > 0 ? 'Official contact routes are live on the venue page.' : 'Public contact routes removed.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save official contacts');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-cyan-300/14 bg-[linear-gradient(160deg,rgba(34,211,238,0.07)_0%,rgba(10,10,18,0.94)_48%,rgba(16,185,129,0.04)_100%)] p-5 shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/28 to-transparent" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-100/66">Official contact routes</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight">Let people reach the right door</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Publish only official business routes or personal contacts shared with explicit consent. Purpose and response hours help players choose without cold-DM guesswork.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            Venue-controlled
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {contacts.map((contact, index) => (
            <div key={`contact-draft-${index}`} className="rounded-[22px] border border-white/[0.08] bg-black/28 p-4">
              <div className="grid gap-3 sm:grid-cols-[0.72fr_1fr_auto]">
                <label>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">Channel</span>
                  <select
                    value={contact.channel}
                    onChange={(event) => updateContact(index, { channel: event.target.value as VenueContactChannel })}
                    disabled={!canEdit || saving}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#080811] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-200/30 disabled:opacity-50"
                  >
                    {VENUE_CONTACT_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>{channel.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">Public label</span>
                  <input
                    value={contact.label}
                    onChange={(event) => updateContact(index, { label: event.target.value })}
                    disabled={!canEdit || saving}
                    maxLength={48}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#080811] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-200/30 disabled:opacity-50"
                    placeholder="Reservations"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setContacts((current) => current.filter((_, contactIndex) => contactIndex !== index))}
                  disabled={!canEdit || saving}
                  aria-label={`Remove ${contact.label || `contact ${index + 1}`}`}
                  className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-300/14 bg-rose-500/[0.06] text-rose-100/70 transition hover:border-rose-200/30 hover:text-rose-100 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">Contact URL, email or phone</span>
                  <input
                    value={contact.url}
                    onChange={(event) => updateContact(index, { url: event.target.value })}
                    disabled={!canEdit || saving}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#080811] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-200/30 disabled:opacity-50"
                    placeholder="https://... or hello@venue.com"
                  />
                </label>
                <label>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">Purpose</span>
                  <input
                    value={contact.purpose}
                    onChange={(event) => updateContact(index, { purpose: event.target.value })}
                    disabled={!canEdit || saving}
                    maxLength={120}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#080811] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-200/30 disabled:opacity-50"
                    placeholder="Reservations and table requests"
                  />
                </label>
                <label>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">Response hours</span>
                  <input
                    value={contact.responseHours}
                    onChange={(event) => updateContact(index, { responseHours: event.target.value })}
                    disabled={!canEdit || saving}
                    maxLength={80}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-[#080811] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-200/30 disabled:opacity-50"
                    placeholder="Daily, 10am–6pm"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-4 pt-5 text-xs text-white/55">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contact.isPersonal}
                      onChange={(event) => updateContact(index, {
                        isPersonal: event.target.checked,
                        consentConfirmed: event.target.checked ? contact.consentConfirmed : false,
                      })}
                      disabled={!canEdit || saving}
                    />
                    Personal contact
                  </label>
                  {contact.isPersonal ? (
                    <label className="inline-flex items-center gap-2 text-amber-100/75">
                      <input
                        type="checkbox"
                        checked={contact.consentConfirmed}
                        onChange={(event) => updateContact(index, { consentConfirmed: event.target.checked })}
                        disabled={!canEdit || saving}
                      />
                      Explicit consent confirmed
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setContacts((current) => [...current, makeDraft()])}
            disabled={!canEdit || saving || contacts.length >= 8}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 text-xs font-black uppercase tracking-[0.14em] text-white/65 transition hover:border-white/24 hover:text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add route
          </button>
          <button
            type="button"
            onClick={() => void saveContacts()}
            disabled={!canEdit || saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/22 bg-cyan-500/[0.1] px-4 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:-translate-y-px hover:border-cyan-100/38 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save contacts
          </button>
          {!canEdit ? <span className="text-xs text-white/38">Claimed venue wallet required.</span> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-100/80">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-100/85">{error}</p> : null}
      </div>
    </div>
  );
}
