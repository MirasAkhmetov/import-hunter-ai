import { fetchKaspiProductFromHtml } from "../lib/parsers/kaspiHtmlParser";

async function main() {
  const url =
    "https://kaspi.kz/shop/p/braun-is7286bk-chernyi-109332774/?c=750000000";
  const product = await fetchKaspiProductFromHtml(url);
  console.log(
    JSON.stringify(
      {
        title: product.title,
        price: product.price,
        reviewCount: product.reviewCount,
        rating: product.rating,
        brand: product.brand,
        model: product.model,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
