import { extractTrendyolSalePrice } from "../lib/price-verification/turkishSepetePrice.ts";
import {
  extractTrendyolMainProductPriceFromState,
  extractTrendyolPriceFromApiItem,
} from "../lib/price-verification/turkishPrice.ts";

const mainState = {
  product: {
    price: {
      discountedPrice: { value: 1425000 },
      sellingPrice: { value: 1000 },
    },
  },
};

console.log("main state price:", extractTrendyolMainProductPriceFromState(mainState));

const html = `
<script>window.__PRODUCT_DETAIL_APP_INITIAL_STATE__=${JSON.stringify(mainState)};</script>
<div class="prc-box-dscntd">10 TL</div>
<div>Ürünün Diğer Satıcıları</div>
<div class="prc-box-dscntd">999 TL</div>
`;

console.log("from html (main, not 10/999):", extractTrendyolSalePrice(html));
console.log("api kuruş:", extractTrendyolPriceFromApiItem({ price: { discountedPrice: 1425000 } }));
