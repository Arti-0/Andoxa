"use client";

import { useState } from "react";
import { Mail, Send, Loader2, ShieldCheck, User as UserIcon } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/utils/onboarding-helpers";

type InvitePayload = {
    email: string;
    role: "admin" | "member";
    message: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: InvitePayload) => Promise<void> | void;
    organizationName?: string;
};

const ROLE_META = {
    admin: {
        label: "Administrateur",
        desc: "Peut gérer membres, intégrations et facturation",
        Icon: ShieldCheck,
    },
    member: {
        label: "Membre",
        desc: "Peut utiliser tous les outils mais pas administrer",
        Icon: UserIcon,
    },
} as const;

export function OrganizationInviteModal({
    open,
    onClose,
    onSubmit,
    organizationName,
}: Props) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "member">("member");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const valid = isValidEmail(email);

    const reset = () => {
        setEmail("");
        setRole("member");
        setMessage("");
        setSending(false);
    };

    const close = () => {
        if (sending) return;
        reset();
        onClose();
    };

    const send = async () => {
        if (!valid) return;
        setSending(true);
        try {
            await onSubmit({ email: email.trim(), role, message });
            reset();
        } finally {
            setSending(false);
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={(o) => !o && close()}
            title="Inviter un membre"
            description={
                <>
                    Envoyez une invitation par e-mail pour rejoindre
                    {organizationName
                        ? ` ${organizationName}`
                        : " votre organisation"}
                    .
                </>
            }
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={close} disabled={sending}>
                        Annuler
                    </Button>
                    <Button
                        onClick={() => void send()}
                        disabled={!valid || sending}
                        className="gap-1.5"
                    >
                        {sending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Send className="size-3.5" />
                        )}
                        {sending ? "Envoi…" : "Envoyer l'invitation"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-3.5">
                    <div>
                        <Label htmlFor="invite-email">Adresse e-mail</Label>
                        <div className="relative mt-1.5">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="invite-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="prenom.nom@entreprise.com"
                                className="pl-9"
                                autoFocus
                                aria-invalid={
                                    email.length > 0 && !valid ? true : undefined
                                }
                            />
                        </div>
                        {email.length > 0 && !valid ? (
                            <p className="mt-1 text-xs text-destructive">
                                Adresse e-mail invalide.
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <Label>Rôle</Label>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                            {(["admin", "member"] as const).map((r) => {
                                const meta = ROLE_META[r];
                                const active = role === r;
                                const Icon = meta.Icon;
                                return (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={cn(
                                            "flex items-start gap-2.5 rounded-[9px] border-[1.5px] p-2.5 text-left transition-colors",
                                            active
                                                ? "border-primary bg-primary/5"
                                                : "border-border bg-card hover:border-muted-foreground/40"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                                                active
                                                    ? "border-primary"
                                                    : "border-muted-foreground/30"
                                            )}
                                        >
                                            {active ? (
                                                <div className="size-2 rounded-full bg-primary" />
                                            ) : null}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
                                                <Icon className="size-3.5 text-muted-foreground" />
                                                {meta.label}
                                            </div>
                                            <div className="mt-0.5 text-[11.5px] leading-[1.4] text-muted-foreground">
                                                {meta.desc}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="invite-message">
                            Message personnalisé{" "}
                            <span className="font-normal text-muted-foreground">
                                (facultatif)
                            </span>
                        </Label>
                        <Textarea
                            id="invite-message"
                            value={message}
                            onChange={(e) =>
                                setMessage(e.target.value.slice(0, 300))
                            }
                            placeholder={`Bonjour,\nJe t'invite à rejoindre notre espace pour collaborer…`}
                            rows={4}
                            maxLength={300}
                            className="mt-1.5 min-h-24 resize-y"
                        />
                        <div className="mt-1 flex justify-end text-[11px] text-muted-foreground">
                            {message.length} / 300
                        </div>
                    </div>
                </div>
        </AppModal>
    );
}
