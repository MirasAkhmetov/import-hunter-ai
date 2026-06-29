"use client";

import { useState } from "react";
import { Mail, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CooperationEmailModal } from "./CooperationEmailModal";
import type { BrandContact } from "@/lib/types/brandFinder";
import type { AnalysisResult } from "@/lib/types/analysisResult";

interface GenerateCooperationEmailButtonProps {
  contact: BrandContact;
  product: AnalysisResult["product"];
}

export function GenerateCooperationEmailButton({
  contact,
  product,
}: GenerateCooperationEmailButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<{
    id: string;
    toEmail: string;
    subject: string;
    body: string;
    language: "ru" | "en";
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const canGenerateEmail =
    Boolean(contact.companyName) &&
    Boolean(contact.email || contact.contactFormUrl);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach-email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandContactId: contact.id,
          product,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmail(data.data);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFormLetter = async () => {
    const text = `Уважаемые ${contact.companyName},\n\nМы заинтересованы в сотрудничестве по бренду ${contact.brand}. Просим связаться с нами через контактную форму: ${contact.contactFormUrl}\n\nС уважением`;
    await navigator.clipboard.writeText(text);
  };

  if (!canGenerateEmail) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Mail className="mr-1 h-4 w-4" />
        Нет email или формы
      </Button>
    );
  }

  if (!contact.email && contact.contactFormUrl) {
    return (
      <Button variant="outline" size="sm" onClick={handleCopyFormLetter}>
        <Copy className="mr-1 h-4 w-4" />
        Скопировать письмо для контактной формы
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
      >
        <Mail className="mr-1 h-4 w-4" />
        {loading ? "Генерация…" : "Сгенерировать письмо"}
      </Button>
      {email && (
        <CooperationEmailModal
          open={open}
          onOpenChange={setOpen}
          email={email}
          contact={contact}
        />
      )}
    </>
  );
}
