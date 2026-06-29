"use client";

import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { OUTREACH_EMAIL_STATUS_LABELS } from "@/lib/types/brandFinder";
import type { BrandContact } from "@/lib/types/brandFinder";

interface CooperationEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: {
    id: string;
    toEmail: string;
    subject: string;
    body: string;
    language: "ru" | "en";
    status: string;
  };
  contact: BrandContact;
}

export function CooperationEmailModal({
  open,
  onOpenChange,
  email,
  contact,
}: CooperationEmailModalProps) {
  const { toast } = useToast();

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Скопировано", description: label });
      await fetch("/api/outreach-email/mark-copied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: email.id }),
      });
    } catch {
      toast({
        title: "Не удалось скопировать. Скопируйте вручную.",
        variant: "destructive",
      });
    }
  };

  const copyAll = () => {
    const full = `Кому: ${email.toEmail}\nТема: ${email.subject}\n\n${email.body}`;
    return copyText(full, "Всё письмо");
  };

  const markSent = async () => {
    await fetch(`/api/outreach-email/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent_manually" }),
    });
    toast({ title: "Отмечено как отправлено" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Письмо о сотрудничестве</DialogTitle>
          <DialogDescription>
            {contact.companyName} · {contact.brand}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {email.language === "ru" ? "Русский" : "English"}
            </Badge>
            <Badge variant="secondary">
              {OUTREACH_EMAIL_STATUS_LABELS[
                email.status as keyof typeof OUTREACH_EMAIL_STATUS_LABELS
              ] ?? email.status}
            </Badge>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Кому</p>
            <p className="text-sm">{email.toEmail || "— email не указан —"}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Тема</p>
            <p className="rounded border bg-slate-50 p-3 text-sm">{email.subject}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Текст письма</p>
            <pre className="whitespace-pre-wrap rounded border bg-slate-50 p-3 text-sm font-sans">
              {email.body}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(email.subject, "Тема")}
            >
              <Copy className="mr-1 h-4 w-4" />
              Копировать тему
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText(email.body, "Текст письма")}
            >
              <Copy className="mr-1 h-4 w-4" />
              Копировать текст
            </Button>
            <Button variant="outline" size="sm" onClick={copyAll}>
              <Copy className="mr-1 h-4 w-4" />
              Копировать всё
            </Button>
            <Button size="sm" onClick={markSent}>
              Отметить как отправлено
            </Button>
          </div>

          <p className="text-xs text-amber-700">
            Письмо не отправляется автоматически — только генерация и копирование.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
