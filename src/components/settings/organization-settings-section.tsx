"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWorkspace } from "@/lib/workspace";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    getUserOrganizations,
    type Organization,
} from "@/lib/organizations/utils-client";
import {
    Loader2,
    UserMinus,
    Shield,
    ShieldCheck,
    Crown,
    Mail,
    Building2,
    Camera,
    Users,
    Plus,
    MoreHorizontal,
    Trash2,
    Send,
    ArrowUpRight,
    Zap,
    CheckCircle2,
    Upload,
    ChevronDown,
    User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { settingsLabelClass, SettingsCard } from "./settings-card";
import { PLAN_DISPLAY, PLAN_DISPLAY_FALLBACK, STATUS_DISPLAY } from "@/lib/billing/display";
import { cn } from "@/lib/utils";
import { uploadOrgLogo } from "@/lib/organizations/upload-logo";
import { OrganizationInviteModal } from "./organization-invite-modal";

interface Member {
    id: string;
    name: string;
    role: string;
    avatar_url: string | null;
    email: string | null;
}

interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    created_at: string;
    expires_at: string;
    consumed_at: string | null;
    status: "pending" | "joined" | "expired";
}

const ROLE_META: Record<
    string,
    {
        label: string;
        Icon: typeof Crown;
        badgeClass: string;
    }
> = {
    owner: {
        label: "Propriétaire",
        Icon: Crown,
        badgeClass:
            "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400",
    },
    admin: {
        label: "Admin",
        Icon: ShieldCheck,
        badgeClass:
            "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    },
    member: {
        label: "Membre",
        Icon: Shield,
        badgeClass: "border-border bg-card text-muted-foreground",
    },
};

const PLAN_LABELS: Record<string, string> = {
    trial: "Essai gratuit",
    solo: "Solo",
    team: "Team",
    custom: "Custom",
    demo: "Démo",
};

const ORG_COLORS = [
    "#0052D9",
    "#FF6700",
    "#0EA5E9",
    "#10B981",
    "#8B5CF6",
    "#EF4444",
    "#F59E0B",
    "#64748B",
];

function RoleBadge({ role }: { role: string }) {
    const meta = ROLE_META[role] ?? ROLE_META.member;
    const Icon = meta.Icon;
    return (
        <Badge variant="outline" className={cn("gap-1", meta.badgeClass)}>
            <Icon className="size-3" />
            {meta.label}
        </Badge>
    );
}

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 2) return "hier";
    return `il y a ${days} jours`;
}

export function OrganizationSettingsSection({
    onSwitch,
}: {
    onSwitch?: () => void;
}) {
    const {
        user,
        workspace,
        workspaceId,
        isOwner,
        switchWorkspace,
        patchWorkspace,
        refresh,
    } = useWorkspace();

    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [orgsError, setOrgsError] = useState<string | null>(null);

    const [orgNameInput, setOrgNameInput] = useState("");
    const [orgNameSaving, setOrgNameSaving] = useState(false);
    const [orgNameDirty, setOrgNameDirty] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loadingInvitations, setLoadingInvitations] = useState(false);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [draggingOver, setDraggingOver] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [color, setColor] = useState<string>(ORG_COLORS[0]);
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const [slugInput, setSlugInput] = useState("");
    const [slugSaving, setSlugSaving] = useState(false);

    const currentSlug =
        ((workspace as { slug?: string | null } | null | undefined)?.slug as
            | string
            | undefined) ?? null;

    useEffect(() => {
        if (currentSlug != null) setSlugInput(currentSlug);
    }, [currentSlug]);

    // Hydrate color from localStorage per workspace.
    useEffect(() => {
        if (!workspaceId) return;
        try {
            const stored = window.localStorage.getItem(
                `andoxa.org-color.${workspaceId}`
            );
            if (stored && ORG_COLORS.includes(stored)) setColor(stored);
            else setColor(ORG_COLORS[0]);
        } catch {
            // ignore
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!colorPickerOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (
                colorPickerRef.current &&
                !colorPickerRef.current.contains(e.target as Node)
            )
                setColorPickerOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [colorPickerOpen]);

    const persistColor = (c: string) => {
        setColor(c);
        setColorPickerOpen(false);
        if (workspaceId) {
            try {
                window.localStorage.setItem(
                    `andoxa.org-color.${workspaceId}`,
                    c
                );
            } catch {
                // ignore
            }
        }
    };

    const loadOrgs = useCallback(async () => {
        if (!user?.id) return;
        setLoadingOrgs(true);
        setOrgsError(null);
        try {
            const list = await getUserOrganizations(user.id);
            setOrgs(list);
        } catch {
            setOrgsError("Impossible de charger les organisations");
        } finally {
            setLoadingOrgs(false);
        }
    }, [user?.id]);

    const loadMembers = useCallback(async () => {
        if (!workspaceId) return;
        setLoadingMembers(true);
        try {
            const res = await fetch("/api/organization/members", {
                credentials: "include",
            });
            const json = await res.json();
            setMembers((json.data?.items ?? json.items ?? []) as Member[]);
        } catch {
            setMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    }, [workspaceId]);

    const callerIsAdmin =
        isOwner ||
        members.find((m) => m.id === user?.id)?.role === "admin";

    const loadInvitations = useCallback(async () => {
        if (!workspaceId || !callerIsAdmin) return;
        setLoadingInvitations(true);
        try {
            const res = await fetch("/api/invitations", {
                credentials: "include",
            });
            const json = await res.json();
            setInvitations(
                (json.data?.items ?? json.items ?? []) as PendingInvitation[]
            );
        } catch {
            setInvitations([]);
        } finally {
            setLoadingInvitations(false);
        }
    }, [workspaceId, callerIsAdmin]);

    useEffect(() => {
        loadOrgs();
    }, [loadOrgs]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    useEffect(() => {
        void loadInvitations();
    }, [loadInvitations]);

    useEffect(() => {
        setOrgNameInput(workspace?.name ?? "");
        setOrgNameDirty(false);
    }, [workspace?.name]);

    const initials =
        (workspace?.name ?? "O")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("") || "O";

    const handleFile = async (file: File | undefined | null) => {
        if (!file || !workspaceId || !isOwner) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Format non supporté");
            return;
        }
        setLogoUploading(true);
        try {
            const logoUrl = await uploadOrgLogo(file, workspaceId);
            if (!logoUrl) {
                toast.error("Impossible de télécharger l'image (max 2 Mo)");
                return;
            }
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ logo_url: logoUrl }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? "Erreur");
            }
            patchWorkspace({ logo_url: logoUrl });
            setOrgs((prev) =>
                prev.map((o) =>
                    o.id === workspaceId ? { ...o, logo_url: logoUrl } : o
                )
            );
            toast.success("Logo mis à jour");
            void refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setLogoUploading(false);
            if (logoInputRef.current) logoInputRef.current.value = "";
        }
    };

    const handleRemoveLogo = async () => {
        if (!workspaceId || !isOwner) return;
        try {
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ logo_url: null }),
            });
            if (!res.ok) throw new Error("Erreur");
            patchWorkspace({ logo_url: null });
            toast.success("Logo supprimé");
        } catch {
            toast.error("Impossible de supprimer le logo");
        }
    };

    const handleSaveOrgName = async () => {
        const name = orgNameInput.trim();
        if (!workspaceId || !isOwner || !name || name === workspace?.name)
            return;
        setOrgNameSaving(true);
        try {
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Erreur");
            }
            setOrgNameDirty(false);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1500);
            refresh?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setOrgNameSaving(false);
        }
    };

    const handleSaveSlug = async () => {
        if (!workspaceId || !isOwner) return;
        const next = slugInput.trim().toLowerCase();
        if (!next || next === currentSlug) return;
        setSlugSaving(true);
        try {
            const res = await fetch(`/api/organizations/${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ slug: next }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? "Erreur slug");
            }
            toast.success("URL mise à jour");
            refresh?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setSlugSaving(false);
        }
    };

    const handleInvite = async ({
        email,
        role,
    }: {
        email: string;
        role: "admin" | "member";
        message: string;
    }) => {
        if (!workspaceId) return;
        try {
            const res = await fetch("/api/invitations/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    organization_id: workspaceId,
                    role,
                }),
            });
            const json = (await res.json()) as {
                success?: boolean;
                error?: { message?: string };
            };
            if (!res.ok || !json.success) {
                throw new Error(
                    json.error?.message ?? "Impossible d'envoyer l'invitation"
                );
            }
            toast.success(`Invitation envoyée à ${email}`);
            setInviteOpen(false);
            loadMembers();
            void loadInvitations();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleCancelInvitation = async (id: string) => {
        try {
            const res = await fetch(`/api/invitations/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message ?? "Erreur");
            }
            toast.success("Invitation annulée");
            void loadInvitations();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleResendInvitation = async (inv: PendingInvitation) => {
        await handleInvite({
            email: inv.email,
            role: inv.role as "admin" | "member",
            message: "",
        });
    };

    const handleSwitch = async (orgId: string) => {
        try {
            await switchWorkspace(orgId);
            refresh?.();
            onSwitch?.();
        } catch (err) {
            console.error("Switch organization error:", err);
        }
    };

    const handleChangeRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/organization/members/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: newRole }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message ?? "Erreur");
            }
            toast.success("Rôle mis à jour");
            loadMembers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            const res = await fetch(`/api/organization/members/${userId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json?.error?.message ?? "Erreur");
            }
            toast.success("Membre retiré");
            loadMembers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        }
    };

    const handleManageBilling = async () => {
        setBillingLoading(true);
        try {
            const res = await fetch("/api/paiements/portal", {
                method: "POST",
                credentials: "include",
            });
            const data = (await res.json()) as {
                error?: string;
                url?: string;
            };
            if (!res.ok) throw new Error(data.error || "Erreur");
            if (data.url) window.location.href = data.url;
            else throw new Error("URL du portail non reçue");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur");
        } finally {
            setBillingLoading(false);
        }
    };

    const pendingInvites = callerIsAdmin
        ? invitations.filter((i) => i.status === "pending")
        : [];

    const planKey = (workspace?.plan ?? "trial").toLowerCase();
    const planDisplay = PLAN_DISPLAY[planKey] ?? PLAN_DISPLAY_FALLBACK;
    const subscriptionStatusLabel =
        STATUS_DISPLAY[workspace?.subscription_status ?? ""] ??
        workspace?.subscription_status ??
        "—";

    const owner = members.find((m) => m.role === "owner");
    const others = members.filter((m) => m.role !== "owner");
    const orderedMembers = [owner, ...others].filter(Boolean) as Member[];

    return (
        <>
            {/* ── Identity card ─────────────────────────────────────── */}
            {workspaceId && (
                <SettingsCard
                    title="Identité de l'organisation"
                    description="Personnalisez l'apparence visible par vos membres et invités."
                    icon={<Building2 />}
                >
                    <div className="flex items-start gap-5">
                        <div className="shrink-0">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                    !workspace?.logo_url &&
                                    logoInputRef.current?.click()
                                }
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDraggingOver(true);
                                }}
                                onDragLeave={() => setDraggingOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDraggingOver(false);
                                    void handleFile(e.dataTransfer.files?.[0]);
                                }}
                                className="relative flex size-[104px] items-center justify-center overflow-hidden rounded-[14px] text-3xl font-bold tracking-[-0.02em] text-white transition-all"
                                style={{
                                    background: workspace?.logo_url
                                        ? "transparent"
                                        : color,
                                    border: draggingOver
                                        ? "2px dashed var(--primary)"
                                        : workspace?.logo_url
                                          ? "1px solid var(--border)"
                                          : "2px dashed transparent",
                                    cursor: workspace?.logo_url
                                        ? "default"
                                        : "pointer",
                                    transform: draggingOver
                                        ? "scale(1.02)"
                                        : "scale(1)",
                                }}
                            >
                                {workspace?.logo_url ? (
                                    <Avatar className="size-full rounded-[14px]">
                                        <AvatarImage
                                            key={workspace.logo_url}
                                            src={workspace.logo_url}
                                            alt={workspace.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="rounded-[14px] bg-muted text-3xl font-bold text-foreground">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <span>{initials}</span>
                                )}
                                {draggingOver && !workspace?.logo_url ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                                        <Upload className="size-5" />
                                    </div>
                                ) : null}
                                {logoUploading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Loader2 className="size-5 animate-spin" />
                                    </div>
                                ) : null}
                            </div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                    void handleFile(e.target.files?.[0])
                                }
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                {isOwner ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            logoInputRef.current?.click()
                                        }
                                        className="gap-1.5"
                                    >
                                        <Upload className="size-3.5" />
                                        {workspace?.logo_url
                                            ? "Changer la photo"
                                            : "Téléverser une photo"}
                                    </Button>
                                ) : null}
                                {workspace?.logo_url && isOwner ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void handleRemoveLogo()}
                                        className="gap-1.5"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Supprimer
                                    </Button>
                                ) : null}
                                {!workspace?.logo_url && isOwner ? (
                                    <div
                                        ref={colorPickerRef}
                                        className="relative"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setColorPickerOpen((o) => !o)
                                            }
                                            className="gap-1.5"
                                        >
                                            <span
                                                className="size-3 rounded-[4px] border border-black/15"
                                                style={{ background: color }}
                                            />
                                            Couleur
                                            <ChevronDown className="size-3" />
                                        </Button>
                                        {colorPickerOpen ? (
                                            <div className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-[10px] border border-border bg-popover p-2.5 shadow-lg">
                                                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                                    Palette
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {ORG_COLORS.map((c) => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() =>
                                                                persistColor(c)
                                                            }
                                                            title={c}
                                                            className="size-[30px] rounded-[8px] transition-transform hover:scale-110"
                                                            style={{
                                                                background: c,
                                                                border:
                                                                    color === c
                                                                        ? "2px solid var(--foreground)"
                                                                        : "2px solid transparent",
                                                                boxShadow:
                                                                    color === c
                                                                        ? "0 0 0 1px var(--background) inset"
                                                                        : "none",
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
                                PNG, JPG ou SVG — 2&nbsp;Mo max. Glissez-déposez
                                ou cliquez. À défaut de photo, les initiales{" "}
                                <strong className="text-foreground">
                                    {initials}
                                </strong>{" "}
                                seront affichées sur la couleur choisie.
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-1.5">
                        <Label className={settingsLabelClass}>
                            Nom de l&apos;organisation
                        </Label>
                        <Input
                            value={orgNameInput}
                            onChange={(e) => {
                                setOrgNameInput(e.target.value);
                                setOrgNameDirty(
                                    e.target.value.trim() !== workspace?.name
                                );
                            }}
                            disabled={!isOwner}
                            placeholder="Ex. Andoxa SAS"
                        />
                    </div>

                    {(orgNameDirty || savedFlash) && (
                        <div className="flex items-center gap-2.5">
                            {savedFlash ? (
                                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" />
                                    Enregistré
                                </span>
                            ) : (
                                <>
                                    <span className="text-[13px] text-muted-foreground">
                                        Modifications non enregistrées
                                    </span>
                                    <div className="ml-auto flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setOrgNameInput(
                                                    workspace?.name ?? ""
                                                );
                                                setOrgNameDirty(false);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveOrgName}
                                            disabled={orgNameSaving}
                                        >
                                            {orgNameSaving
                                                ? "Enregistrement…"
                                                : "Enregistrer"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className={settingsLabelClass}>
                            URL de l&apos;organisation
                        </Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex flex-1 items-center rounded-[9px] border border-border bg-muted/50 px-3 py-2 text-sm">
                                <span className="text-muted-foreground">
                                    andoxa.fr/booking/
                                </span>
                                <input
                                    type="text"
                                    value={slugInput}
                                    onChange={(e) =>
                                        setSlugInput(
                                            e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9-]/g, "-")
                                        )
                                    }
                                    disabled={!isOwner}
                                    maxLength={40}
                                    className="flex-1 border-0 bg-transparent p-0 text-foreground outline-none disabled:cursor-not-allowed"
                                    placeholder="mon-orga"
                                />
                                <span className="text-muted-foreground">
                                    /&lt;user&gt;
                                </span>
                            </div>
                            {isOwner &&
                                slugInput.trim() !== (currentSlug ?? "") && (
                                    <Button
                                        size="sm"
                                        onClick={handleSaveSlug}
                                        disabled={slugSaving}
                                    >
                                        {slugSaving
                                            ? "Enregistrement…"
                                            : "Enregistrer"}
                                    </Button>
                                )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            2 à 40 caractères, lettres / chiffres / tirets.
                            Doit être unique sur Andoxa.
                        </p>
                    </div>
                </SettingsCard>
            )}

            {/* ── Members card ──────────────────────────────────────── */}
            {workspaceId && (
                <SettingsCard
                    title={`Membres (${members.length})`}
                    description="Gérez les accès et les rôles de votre équipe"
                    icon={<Users />}
                    action={
                        callerIsAdmin ? (
                            <Button
                                size="sm"
                                onClick={() => setInviteOpen(true)}
                                className="gap-1.5"
                            >
                                <Plus className="size-3.5" />
                                Inviter un membre
                            </Button>
                        ) : null
                    }
                    bodyClassName="p-0 gap-0"
                >
                    {loadingMembers && members.length === 0 ? (
                        <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Chargement…
                        </div>
                    ) : orderedMembers.length === 0 &&
                      pendingInvites.length === 0 ? (
                        <p className="px-6 py-4 text-sm text-muted-foreground">
                            Aucun membre
                        </p>
                    ) : (
                        <>
                            {orderedMembers.map((m, idx) => {
                                const isSelf = m.id === user?.id;
                                const isLast =
                                    idx === orderedMembers.length - 1 &&
                                    pendingInvites.length === 0;
                                return (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            "flex items-center gap-3.5 px-6 py-3.5 transition-colors hover:bg-muted/40",
                                            !isLast && "border-b border-border"
                                        )}
                                    >
                                        <Avatar className="size-9 shrink-0">
                                            <AvatarImage
                                                src={m.avatar_url ?? undefined}
                                                alt=""
                                            />
                                            <AvatarFallback className="text-xs">
                                                {m.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="truncate text-sm font-medium">
                                                    {m.name}
                                                </span>
                                                {isSelf ? (
                                                    <span className="text-[11.5px] text-muted-foreground">
                                                        (vous)
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                                                {m.email ?? "—"}
                                            </div>
                                        </div>
                                        <RoleBadge role={m.role} />
                                        {m.role === "owner" ? (
                                            <span className="size-8" />
                                        ) : callerIsAdmin && !isSelf ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="flex size-8 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        <MoreHorizontal className="size-3.5" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="w-56"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleChangeRole(
                                                                m.id,
                                                                m.role ===
                                                                    "admin"
                                                                    ? "member"
                                                                    : "admin"
                                                            )
                                                        }
                                                    >
                                                        <ShieldCheck className="size-3.5" />
                                                        {m.role === "admin"
                                                            ? "Définir comme Membre"
                                                            : "Définir comme Admin"}
                                                    </DropdownMenuItem>
                                                    {m.email ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                void handleInvite(
                                                                    {
                                                                        email:
                                                                            m.email ??
                                                                            "",
                                                                        role: m.role as
                                                                            | "member"
                                                                            | "admin",
                                                                        message:
                                                                            "",
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            <Mail className="size-3.5" />
                                                            Renvoyer un e-mail
                                                            d&apos;accès
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() =>
                                                            void handleRemoveMember(
                                                                m.id
                                                            )
                                                        }
                                                    >
                                                        <UserMinus className="size-3.5" />
                                                        Retirer du workspace
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <span className="size-8" />
                                        )}
                                    </div>
                                );
                            })}

                            {pendingInvites.length > 0 ? (
                                <>
                                    <div className="flex items-center gap-2 border-t border-border px-6 pb-2 pt-3.5">
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                                            Invitations en attente
                                        </h4>
                                        <span className="text-[11.5px] text-muted-foreground">
                                            · {pendingInvites.length}
                                        </span>
                                    </div>
                                    {pendingInvites.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center gap-3.5 border-t border-border bg-muted/25 px-6 py-3"
                                        >
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-border bg-card text-muted-foreground">
                                                <Mail className="size-3.5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-[13.5px] font-medium">
                                                    {inv.email}
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    Envoyée{" "}
                                                    {timeAgo(inv.created_at)}{" "}
                                                    · Rôle :{" "}
                                                    {ROLE_META[inv.role]
                                                        ?.label ?? inv.role}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                                            >
                                                En attente
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    void handleResendInvitation(
                                                        inv
                                                    )
                                                }
                                                className="gap-1.5"
                                            >
                                                <Send className="size-3" />
                                                Renvoyer
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    void handleCancelInvitation(
                                                        inv.id
                                                    )
                                                }
                                                className="text-muted-foreground"
                                            >
                                                Annuler
                                            </Button>
                                        </div>
                                    ))}
                                </>
                            ) : callerIsAdmin && loadingInvitations ? (
                                <div className="flex items-center gap-2 border-t border-border px-6 py-3 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    Chargement des invitations…
                                </div>
                            ) : null}
                        </>
                    )}
                </SettingsCard>
            )}

            {/* ── Org switcher card ─────────────────────────────────── */}
            <SettingsCard
                title="Changer d'organisation"
                description="Basculez vers une autre organisation à laquelle vous appartenez"
                icon={<UserIcon />}
            >
                {loadingOrgs && orgs.length === 0 ? null : orgsError ? (
                    <p className="text-sm text-destructive">{orgsError}</p>
                ) : orgs.length === 0 && !loadingOrgs ? (
                    <p className="text-sm text-muted-foreground">
                        Aucune organisation
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {orgs.map((org) => {
                            const isActive = org.id === workspaceId;
                            const isDeleted = org.status === "deleted";
                            return (
                                <div
                                    key={org.id}
                                    className="flex flex-col gap-3 rounded-[10px] border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">
                                            {org.name}
                                            {isDeleted ? (
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    (supprimée)
                                                </span>
                                            ) : null}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {isActive
                                                ? "Actif"
                                                : (PLAN_LABELS[
                                                      (org.plan ?? "trial").toLowerCase()
                                                  ] ??
                                                  org.plan ??
                                                  "Essai")}
                                        </p>
                                    </div>
                                    {!isActive && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                void handleSwitch(org.id)
                                            }
                                        >
                                            Activer
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </SettingsCard>

            {/* ── Subscription card ─────────────────────────────────── */}
            <SettingsCard
                title="Abonnement"
                description="Gérez votre plan et votre facturation"
                icon={<Zap />}
            >
                <div className="grid grid-cols-1 gap-4 rounded-[11px] border bg-[color-mix(in_oklab,var(--primary)_4%,var(--card))] p-4 sm:grid-cols-2"
                     style={{
                         borderColor:
                             "color-mix(in oklab, var(--primary) 16%, var(--border))",
                     }}
                >
                    <div>
                        <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            Plan actuel
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-[22px] font-semibold tracking-[-0.02em]">
                                {planDisplay.label}
                            </span>
                            <Badge
                                variant="outline"
                                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                            >
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {subscriptionStatusLabel}
                            </Badge>
                        </div>
                        <div className="mt-1 text-[12.5px] text-muted-foreground">
                            {members.length} siège
                            {members.length > 1 ? "s" : ""}
                        </div>
                    </div>
                    <div>
                        <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            Crédits restants
                        </div>
                        <div className="mt-1.5 text-base font-medium tracking-[-0.01em]">
                            {workspace?.credits ?? 0}
                        </div>
                        <div className="mt-1 text-[12.5px] text-muted-foreground">
                            Utilisés pour l&apos;enrichissement
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {isOwner ? (
                        <Button
                            variant="outline"
                            onClick={() => void handleManageBilling()}
                            disabled={billingLoading}
                            className="gap-1.5"
                        >
                            <ArrowUpRight className="size-3.5" />
                            {billingLoading
                                ? "Redirection…"
                                : "Gérer l'abonnement"}
                        </Button>
                    ) : null}
                </div>

                {/* Upsell — show only if not on top plan */}
                {planKey !== "team" && planKey !== "custom" ? (
                    <div className="relative flex items-center gap-3.5 overflow-hidden rounded-[11px] border border-border bg-card p-4">
                        <div
                            className="pointer-events-none absolute right-0 top-0 size-[140px]"
                            style={{
                                background:
                                    "radial-gradient(circle at top right, color-mix(in oklab, var(--brand-orange, #FF6700) 18%, transparent), transparent 70%)",
                            }}
                        />
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--brand-orange,#FF6700)] to-[var(--brand-blue,#0052D9)] text-white">
                            <Zap className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">
                                    Passez à Team
                                </span>
                                <Badge
                                    variant="outline"
                                    className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
                                >
                                    −20% / siège
                                </Badge>
                            </div>
                            <p className="mt-1 text-[12.5px] leading-[1.5] text-muted-foreground">
                                SSO, audit log, sièges illimités et support
                                prioritaire pour les équipes en croissance.
                            </p>
                        </div>
                        <Button size="sm" className="gap-1.5">
                            Comparer
                            <ArrowUpRight className="size-3" />
                        </Button>
                    </div>
                ) : null}
            </SettingsCard>

            <OrganizationInviteModal
                open={inviteOpen}
                onClose={() => setInviteOpen(false)}
                onSubmit={handleInvite}
                organizationName={workspace?.name ?? undefined}
            />
        </>
    );
}
