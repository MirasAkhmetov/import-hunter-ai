"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToBasketButtonProps {
  item: {
    productId: string;
    marketplaceResultId: string;
    title: string;
    marketplace: string;
    country: string;
    purchasePrice: number;
    targetSalePrice: number;
    deliveryPerUnit?: number;
    imageUrl?: string;
    url?: string;
  };
}

export function AddToBasketButton({ item }: AddToBasketButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const add = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/basket/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, quantity: 1 }),
      });
      if (res.ok) setAdded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={loading || added} onClick={add}>
      <ShoppingCart className="h-3 w-3" />
      {added ? "В корзине" : "В корзину"}
    </Button>
  );
}
