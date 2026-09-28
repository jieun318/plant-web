import { Suspense } from "react";
import PageShell from "@/components/layout/PageShell";
import NewPlantFlow from "./NewPlantFlow";

// useSearchParams 를 쓰는 부분은 Suspense 로 감싸야 정적 렌더가 깨지지 않는다.
export default function NewPlantPage() {
  return (
    <Suspense fallback={<PageShell className="max-w-3xl" />}>
      <NewPlantFlow />
    </Suspense>
  );
}
