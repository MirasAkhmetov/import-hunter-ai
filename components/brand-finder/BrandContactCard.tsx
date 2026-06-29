"use client";

import {
  Building2,
  Globe,
  Mail,
  Phone,
  Linkedin,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandContactConfidenceBadge } from "./BrandContactConfidenceBadge";
import { ContactSourceLink } from "./ContactSourceLink";
import { GenerateCooperationEmailButton } from "./GenerateCooperationEmailButton";
import {
  BRAND_CONTACT_ROLE_LABELS,
  BRAND_CONTACT_REGION_LABELS,
  BRAND_CONTACT_EVIDENCE_LABELS,
  BRAND_CONTACT_VERIFICATION_LABELS,
  type BrandContact,
  type BrandContactStatus,
} from "@/lib/types/brandFinder";
import type { AnalysisResult } from "@/lib/types/analysisResult";

interface BrandContactCardProps {
  contact: BrandContact;
  product: AnalysisResult["product"];
  onStatusChange?: (id: string, status: BrandContactStatus) => void;
}

export function BrandContactCard({
  contact,
  product,
  onStatusChange,
}: BrandContactCardProps) {
  const needsWarning = contact.verificationStatus !== "source_confirmed";

  return (
    <Card className={contact.isMock ? "border-red-200" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{contact.companyName}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {BRAND_CONTACT_ROLE_LABELS[contact.role]} ·{" "}
              {BRAND_CONTACT_REGION_LABELS[contact.region]} · {contact.country}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {BRAND_CONTACT_VERIFICATION_LABELS[contact.verificationStatus]}
            </p>
          </div>
          <BrandContactConfidenceBadge score={contact.confidenceScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {needsWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Контакт требует ручной проверки перед использованием</span>
          </div>
        )}

        {contact.confirmedFacts && (
          <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
            {contact.confirmedFacts}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {contact.website && (
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Globe className="h-4 w-4" />
              {contact.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {contact.email && (
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              {contact.email}
            </span>
          )}
          {contact.phone && (
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              {contact.phone}
            </span>
          )}
          {contact.linkedinUrl && (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
          {contact.contactFormUrl && (
            <a
              href={contact.contactFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Building2 className="h-4 w-4" />
              Контактная форма
            </a>
          )}
        </div>

        <ContactSourceLink url={contact.sourceUrl} title={contact.sourceTitle} />

        {contact.sourceUrl && (
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Открыть источник
            </a>
          </Button>
        )}

        {contact.evidence && contact.evidence.length > 0 && (
          <div className="space-y-1 rounded-md border bg-slate-50 p-2">
            <p className="text-xs font-medium text-slate-600">Доказательства</p>
            {contact.evidence.slice(0, 3).map((ev) => (
              <div key={ev.id} className="text-xs text-slate-500">
                <span className="font-medium">
                  {BRAND_CONTACT_EVIDENCE_LABELS[ev.evidenceType]}:
                </span>{" "}
                {ev.extractedValue ?? ev.excerpt.slice(0, 80)}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400">
          Проверено:{" "}
          {contact.checkedAt
            ? new Date(contact.checkedAt).toLocaleString("ru-RU")
            : new Date(contact.updatedAt).toLocaleString("ru-RU")}
        </p>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <GenerateCooperationEmailButton contact={contact} product={product} />
          {onStatusChange && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(contact.id, "verified_by_user")}
              >
                <CheckCircle className="mr-1 h-4 w-4 text-emerald-600" />
                Подтвердить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(contact.id, "needs_manual_check")}
              >
                <AlertCircle className="mr-1 h-4 w-4 text-amber-600" />
                Нужно проверить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(contact.id, "rejected")}
              >
                <XCircle className="mr-1 h-4 w-4 text-red-600" />
                Не подходит
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
