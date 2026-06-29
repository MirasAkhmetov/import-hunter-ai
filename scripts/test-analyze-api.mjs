const url = process.argv[2] || "https://kaspi.kz/shop/p/braun-hf5075ibk-6-l-chernyi-153468680/";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 300_000);

const res = await fetch("http://localhost:3010/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url }),
  signal: controller.signal,
});

clearTimeout(timeout);

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 2000));
