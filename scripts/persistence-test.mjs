// Persistence test: создаёт демо-набор, ждёт 90s, проверяет что набор доступен.
const BASE = process.env.SMOKE_BASE ?? "https://gs-mvp-six.vercel.app";

async function run() {
  console.log("Creating demo set...");
  const created = await fetch(`${BASE}/api/demo?id=winter-vocab`, { redirect: "manual" });
  if (created.status !== 303) {
    console.error(`FAIL: expected 303, got ${created.status}`);
    process.exit(1);
  }
  const location = created.headers.get("location");
  if (!location) {
    console.error("FAIL: no location header");
    process.exit(1);
  }
  const setId = location.split("/").pop();
  console.log("Created setId:", setId);

  console.log("Waiting 90 seconds...");
  await new Promise((r) => setTimeout(r, 90000));

  console.log("Fetching set after delay...");
  const fetched = await fetch(`${BASE}/api/sets/${setId}`);
  if (fetched.status !== 200) {
    console.error(`FAIL: status ${fetched.status}`);
    process.exit(1);
  }
  const data = await fetched.json();
  if (!data.cards || data.cards.length === 0) {
    console.error("FAIL: no cards");
    process.exit(1);
  }
  console.log(`OK: ${data.cards.length} cards persisted`);
}

run().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
