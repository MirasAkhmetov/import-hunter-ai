import { ExternalLink } from "lucide-react";

interface ContactSourceLinkProps {
  url?: string | null;
  title?: string | null;
}

export function ContactSourceLink({ url, title }: ContactSourceLinkProps) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {title ?? "Источник"}
    </a>
  );
}
