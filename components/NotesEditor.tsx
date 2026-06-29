"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesEditorProps {
  entityId: string;
  entityType: "product" | "marketplace_result";
  initialUserNotes?: string;
  initialAiNotes?: string;
}

export function NotesEditor({
  entityId,
  entityType,
  initialUserNotes = "",
  initialAiNotes = "",
}: NotesEditorProps) {
  const [userNotes, setUserNotes] = useState(initialUserNotes);
  const [saving, setSaving] = useState(false);

  const save = async (value: string) => {
    setSaving(true);
    try {
      await fetch("/api/notes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, entityType, userNotes: value }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {initialAiNotes && <AiRecommendationBox text={initialAiNotes} />}
      <div className="space-y-2">
        <Label>Заметка пользователя</Label>
        <Textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          onBlur={() => save(userNotes)}
          placeholder="Ваши заметки по товару..."
          rows={3}
        />
        {saving && <p className="text-xs text-slate-400">Сохранение...</p>}
      </div>
    </div>
  );
}

export function AiRecommendationBox({ text }: { text: string }) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="flex gap-2 p-4">
        <Sparkles className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-blue-900">AI Notes</p>
          <p className="text-sm text-blue-800">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}
