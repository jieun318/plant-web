// 번호가 붙는 순서 목록. mono 번호(01) + 한 줄. 행은 가는 선으로 나눈다.

type Props = {
  steps: string[];
};

export default function StepList({ steps }: Props) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3 border-t border-hair py-2.5 first:border-t-0 first:pt-0">
          <span className="w-6 shrink-0 font-mono text-xs leading-relaxed text-soft">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-sm leading-relaxed text-ink">{step}</p>
        </li>
      ))}
    </ol>
  );
}
