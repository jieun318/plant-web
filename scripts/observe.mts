// 관찰일지를 만든다. 배포에서는 Vercel Cron 이 하는 일을 로컬에서 대신 돌린다.
//
//   npm run observe -- <식물 id> [--days 14]
//   npm run observe -- --all [--days 1]     모든 식물
//
// 시드 데이터를 넣은 뒤 지난 날짜의 일지를 채울 때 쓴다.
// 하루당 Gemini 를 한 번 부르므로 14일이면 1~2분 걸린다.
//
// 개발 서버(npm run dev)가 떠 있어야 한다. 그 서버의 /api/cron/observe 를 부른다.

const BASE = process.env.OBSERVE_URL ?? "http://localhost:3000";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY 가 없습니다. npm run observe 로 실행하세요.");
  process.exit(1);
}

type Result = {
  plantId: string;
  date: string;
  status?: string;
  comment?: string;
  skipped?: string;
};

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const plantId = args.find((a) => !a.startsWith("--"));
  const days = Number(args.includes("--days") ? args[args.indexOf("--days") + 1] : 1) || 1;

  if (!plantId && !all) {
    console.log("식물 id 를 주세요:  npm run observe -- <식물 id> [--days 14]");
    console.log("모든 식물:          npm run observe -- --all");
    console.log("\n식물 id 는 npm run seed 로 확인할 수 있습니다.");
    return;
  }

  console.log(`${plantId ?? "모든 식물"} · ${days}일치 만드는 중... (하루당 몇 초 걸립니다)`);

  let res: Response;

  try {
    res = await fetch(`${BASE}/api/cron/observe`, {
      method: "POST",
      // 개발 서버는 서비스 롤 키를 크론 대신으로 받아준다 (로컬에서만)
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(plantId ? { plantId, days } : { days }),
    });
  } catch {
    console.error(`${BASE} 에 연결하지 못했습니다. npm run dev 가 떠 있는지 확인하세요.`);
    process.exit(1);
  }

  const data = await res.json();

  if (!res.ok) {
    console.error("실패:", res.status, data.error ?? "");
    process.exit(1);
  }

  for (const r of (data.results ?? []) as Result[]) {
    console.log(`  ${r.date}  ${r.skipped ?? `${r.status}  ${(r.comment ?? "").slice(0, 60)}`}`);
  }

  console.log(`\n${data.made}건 만들었습니다. 관찰일지에서 확인하세요.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
