"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/types/brandFinder";

const profileSchema = z.object({
  companyName: z.string().min(1),
  personName: z.string().min(1),
  position: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  website: z.string().optional(),
  marketplaceChannels: z.string().min(1),
  businessDescription: z.string().min(1),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function CompanyProfileForm() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      ...DEFAULT_COMPANY_PROFILE,
      website: DEFAULT_COMPANY_PROFILE.website ?? undefined,
    },
  });

  useEffect(() => {
    fetch("/api/company-profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) reset(res.data);
      })
      .catch(() => {});
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch("/api/company-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fields: Array<{ key: keyof ProfileForm; label: string; multiline?: boolean }> = [
    { key: "companyName", label: "Название компании" },
    { key: "personName", label: "Контактное лицо" },
    { key: "position", label: "Должность" },
    { key: "country", label: "Страна" },
    { key: "city", label: "Город" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Телефон" },
    { key: "website", label: "Сайт" },
    { key: "marketplaceChannels", label: "Маркетплейсы" },
    { key: "businessDescription", label: "Описание бизнеса", multiline: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Профиль моей компании</CardTitle>
        <CardDescription>
          Используется для генерации писем о сотрудничестве с правообладателями
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className={field.multiline ? "sm:col-span-2 space-y-2" : "space-y-2"}
              >
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea id={field.key} rows={3} {...register(field.key)} />
                ) : (
                  <Input id={field.key} {...register(field.key)} />
                )}
                {errors[field.key] && (
                  <p className="text-sm text-red-600">Некорректное значение</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить профиль
            </Button>
            {saved && (
              <span className="text-sm text-emerald-600">Сохранено!</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
