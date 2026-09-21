import { Suspense } from "react";
import PageShell from "@/components/layout/PageShell";
import ResultView from "./ResultView";

// useSearchParams 를 쓰는 부분은 Suspense 로 감싸야 정적 렌더가 깨지지 않는다.
export default function ResultPage() {
  return (
    <Suspense fallback={<PageShell />}>
      <ResultView />
    </Suspense>
  );
}
