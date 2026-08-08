"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// From specials-shared, not specials: the latter imports Prisma, and a client component reaching
// into it pulls the whole `pg` driver into the browser bundle and fails the build.
import { specialStatus } from "@/lib/specials-shared";

/**
 * Create, edit, schedule and delete promotions.
 *
 * Everything is inline. A promotion is six fields and two dates, and routing that through a separate
 * /new page and a detail page - the pattern the products and projects sections use - would be three
 * navigations to change a headline. The shop edits these weekly.
 */

export interface AdminSpecial {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  couponCode: string | null;
  titleEs: string | null;
  blurbEs: string | null;
  bodyEs: string | null;
  ctaLabelEs: string | null;
  active: boolean;
  showInBar: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

/** Blank draft for the "new special" form. */
const EMPTY: Omit<AdminSpecial, "id" | "slug"> = {
  title: "", blurb: "", body: "", imageUrl: "", ctaLabel: "", ctaHref: "", couponCode: "",
  titleEs: "", blurbEs: "", bodyEs: "", ctaLabelEs: "",
  active: true, showInBar: false, sortOrder: 0, startsAt: null, endsAt: null,
};

const STATUS_STYLE: Record<string, string> = {
  live: "bg-kc-sage/20 text-kc-teal",
  scheduled: "bg-kc-yellow/30 text-kc-dark",
  expired: "bg-kc-border text-kc-muted",
  off: "bg-kc-border text-kc-muted",
};

/**
 * `datetime-local` inputs speak "YYYY-MM-DDTHH:mm" in the browser's own timezone and reject the `Z`
 * an ISO string carries, so a stored instant has to be shifted into local time to display and
 * shifted back to UTC to save. Passing the ISO string straight into the input silently blanks it.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AdminSpecialsEditor({ initial }: { initial: AdminSpecial[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
      return false;
    }
    // Server components hold the list, so a refresh is what makes the change visible.
    router.refresh();
    return true;
  }

  async function create() {
    setBusy("new");
    const ok = await send("/api/admin/specials", "POST", {
      ...draft,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
    });
    setBusy(null);
    if (ok) {
      setDraft(EMPTY);
      setCreating(false);
    }
  }

  async function patch(id: string, changes: Partial<AdminSpecial>) {
    setBusy(id);
    await send(`/api/admin/specials/${id}`, "PATCH", changes);
    setBusy(null);
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(id);
    await send(`/api/admin/specials/${id}`, "DELETE");
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!creating ? (
        <Button onClick={() => setCreating(true)} className="bg-kc-coral text-white hover:bg-kc-magenta-deep">
          <Plus className="mr-2 h-4 w-4" /> New special
        </Button>
      ) : (
        <Card className="border-kc-coral/40">
          <CardContent className="space-y-4 p-5">
            <h2 className="font-bold text-kc-dark">New special</h2>
            <SpecialFields value={draft} onChange={(v) => setDraft({ ...draft, ...v })} />
            <div className="flex gap-2">
              <Button
                onClick={create}
                disabled={busy === "new" || !draft.title.trim() || !draft.blurb.trim()}
                className="bg-kc-coral text-white hover:bg-kc-magenta-deep"
              >
                {busy === "new" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
              <Button variant="outline" onClick={() => { setCreating(false); setDraft(EMPTY); setError(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {initial.length === 0 && !creating && (
        <p className="text-sm text-kc-muted">
          No specials yet. Create one and it will show on /specials, and in the bar at the top of
          every page if you tick “Show in the site-wide bar”.
        </p>
      )}

      {initial.map((s) => {
        const status = specialStatus(
          { active: s.active, startsAt: s.startsAt ? new Date(s.startsAt) : null, endsAt: s.endsAt ? new Date(s.endsAt) : null },
        );
        return (
          <Card key={s.id} className="border-kc-border">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-kc-dark">{s.title}</div>
                  <div className="text-xs text-kc-muted">/specials#{s.slug}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 text-xs capitalize ${STATUS_STYLE[status]}`}>{status}</Badge>
                  {s.showInBar && <Badge className="border-0 bg-kc-yellow/30 text-xs text-kc-dark">In bar</Badge>}
                </div>
              </div>

              <SpecialFields
                value={s}
                onChange={(v) => patch(s.id, v)}
                disabled={busy === s.id}
                commitOnBlur
              />

              <div className="flex flex-wrap items-center gap-6 border-t border-kc-border pt-4">
                <label className="flex items-center gap-2 text-sm text-kc-dark">
                  <Switch checked={s.active} onCheckedChange={(v) => patch(s.id, { active: v })} disabled={busy === s.id} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-kc-dark">
                  <Switch checked={s.showInBar} onCheckedChange={(v) => patch(s.id, { showInBar: v })} disabled={busy === s.id} />
                  Show in the site-wide bar
                </label>
                <Button
                  variant="outline"
                  onClick={() => remove(s.id, s.title)}
                  disabled={busy === s.id}
                  className="ml-auto border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * The field set, shared by the create form and every row.
 *
 * `commitOnBlur` is what separates the two uses: a new special is held locally and sent once, while
 * an existing one saves each field as it is left. Saving on every keystroke would be a PATCH per
 * character; saving only on an explicit button would mean an edit lost to a stray navigation.
 */
function SpecialFields({
  value,
  onChange,
  disabled,
  commitOnBlur,
}: {
  value: Omit<AdminSpecial, "id" | "slug"> & Partial<Pick<AdminSpecial, "id" | "slug">>;
  onChange: (v: Partial<AdminSpecial>) => void;
  disabled?: boolean;
  commitOnBlur?: boolean;
}) {
  // Local state exists so a commit-on-blur field stays responsive between keystrokes without
  // sending anything; it is seeded from the row and re-seeded whenever the row's identity changes.
  const [local, setLocal] = useState(value);
  const [seed, setSeed] = useState(value.id);
  if (seed !== value.id) {
    setSeed(value.id);
    setLocal(value);
  }

  function set(patch: Partial<AdminSpecial>) {
    const next = { ...local, ...patch };
    setLocal(next);
    if (!commitOnBlur) onChange(patch);
  }

  /** Sends the field only if it actually changed, so tabbing through a form is not a dozen writes. */
  function commit(key: keyof AdminSpecial) {
    if (!commitOnBlur) return;
    if (local[key] === value[key]) return;
    onChange({ [key]: local[key] } as Partial<AdminSpecial>);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Title</Label>
        <Input
          value={local.title} disabled={disabled}
          onChange={(e) => set({ title: e.target.value })} onBlur={() => commit("title")}
          placeholder="Spring window graphics sale"
        />
      </div>

      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">
          Blurb <span className="normal-case text-kc-muted/70">— the one line shown in the bar</span>
        </Label>
        <Input
          value={local.blurb} disabled={disabled}
          onChange={(e) => set({ blurb: e.target.value })} onBlur={() => commit("blurb")}
          placeholder="20% off every window decal through March"
        />
      </div>

      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">
          Body <span className="normal-case text-kc-muted/70">— optional, shown on the Specials page</span>
        </Label>
        <Textarea
          rows={3} value={local.body ?? ""} disabled={disabled}
          onChange={(e) => set({ body: e.target.value })} onBlur={() => commit("body")}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Button label</Label>
        <Input
          value={local.ctaLabel ?? ""} disabled={disabled}
          onChange={(e) => set({ ctaLabel: e.target.value })} onBlur={() => commit("ctaLabel")}
          placeholder="Order window decals"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">
          Button link <span className="normal-case text-kc-muted/70">— a path on this site</span>
        </Label>
        <Input
          value={local.ctaHref ?? ""} disabled={disabled}
          onChange={(e) => set({ ctaHref: e.target.value })} onBlur={() => commit("ctaHref")}
          placeholder="/services/window-decals/order"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Coupon code</Label>
        <Input
          value={local.couponCode ?? ""} disabled={disabled}
          onChange={(e) => set({ couponCode: e.target.value })} onBlur={() => commit("couponCode")}
          placeholder="SPRING20"
        />
        <p className="mt-1 text-xs text-kc-muted">Advertised here. Create the code itself under Coupons.</p>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Image URL</Label>
        <Input
          value={local.imageUrl ?? ""} disabled={disabled}
          onChange={(e) => set({ imageUrl: e.target.value })} onBlur={() => commit("imageUrl")}
          placeholder="/images/print/window-decals.webp"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Starts</Label>
        <Input
          type="datetime-local" value={toLocalInput(local.startsAt)} disabled={disabled}
          onChange={(e) => {
            const iso = fromLocalInput(e.target.value);
            setLocal({ ...local, startsAt: iso });
            onChange({ startsAt: iso });
          }}
        />
        <p className="mt-1 text-xs text-kc-muted">Leave empty to start as soon as it is active.</p>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Ends</Label>
        <Input
          type="datetime-local" value={toLocalInput(local.endsAt)} disabled={disabled}
          onChange={(e) => {
            const iso = fromLocalInput(e.target.value);
            setLocal({ ...local, endsAt: iso });
            onChange({ endsAt: iso });
          }}
        />
        <p className="mt-1 text-xs text-kc-muted">Leave empty to run until you switch it off.</p>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Order</Label>
        <Input
          type="number" min={0} max={9999} value={local.sortOrder} disabled={disabled}
          onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })} onBlur={() => commit("sortOrder")}
        />
        <p className="mt-1 text-xs text-kc-muted">Lowest first. The lowest-numbered live special leads the bar.</p>
      </div>

      {/*
        Spanish copy is optional and grouped last, because it is the part most likely to be filled in
        later. Anything left blank falls back to the English text on the /es pages rather than
        blocking the promotion from going out.
      */}
      <div className="sm:col-span-2 mt-2 border-t border-kc-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-kc-muted">
          Spanish <span className="normal-case text-kc-muted/70">— optional. Blank fields show the English text on /es.</span>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Título (ES)</Label>
        <Input
          lang="es" value={local.titleEs ?? ""} disabled={disabled}
          onChange={(e) => set({ titleEs: e.target.value })} onBlur={() => commit("titleEs")}
          placeholder="Oferta de primavera en gráficos para ventanas"
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Frase corta (ES)</Label>
        <Input
          lang="es" value={local.blurbEs ?? ""} disabled={disabled}
          onChange={(e) => set({ blurbEs: e.target.value })} onBlur={() => commit("blurbEs")}
          placeholder="20% de descuento en calcomanías hasta marzo"
        />
      </div>

      <div className="sm:col-span-2">
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Descripción (ES)</Label>
        <Textarea
          lang="es" rows={3} value={local.bodyEs ?? ""} disabled={disabled}
          onChange={(e) => set({ bodyEs: e.target.value })} onBlur={() => commit("bodyEs")}
        />
      </div>

      <div>
        <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-kc-muted">Texto del botón (ES)</Label>
        <Input
          lang="es" value={local.ctaLabelEs ?? ""} disabled={disabled}
          onChange={(e) => set({ ctaLabelEs: e.target.value })} onBlur={() => commit("ctaLabelEs")}
          placeholder="Pedir calcomanías"
        />
      </div>
    </div>
  );
}
