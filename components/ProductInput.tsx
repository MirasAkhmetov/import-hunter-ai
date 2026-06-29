"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  url: z
    .string()
    .min(1, "Введите ссылку")
    .url("Некорректный URL")
    .refine(
      (url) => url.includes("kaspi.kz") && url.includes("/shop/p/"),
      "Используйте ссылку на товар Kaspi: https://kaspi.kz/shop/p/..."
    ),
});

type FormData = z.infer<typeof schema>;

interface ProductInputProps {
  onAnalyze: (url: string) => void;
  isLoading?: boolean;
}

export function ProductInput({ onAnalyze, isLoading }: ProductInputProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      url: "https://kaspi.kz/shop/p/braun-hf5075ibk-6-l-chernyi-153468680/",
    },
  });

  const onSubmit = (data: FormData) => {
    onAnalyze(data.url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Анализ товара Kaspi</CardTitle>
        <CardDescription>
          Вставьте ссылку на товар с Kaspi.kz — система найдёт аналоги в Турции и ОАЭ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Ссылка на товар Kaspi</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder="https://kaspi.kz/shop/p/..."
                className="flex-1"
                {...register("url")}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading} className="shrink-0">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Анализировать
              </Button>
            </div>
            {errors.url && (
              <p className="text-sm text-red-600">{errors.url.message}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
