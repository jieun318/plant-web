// 번호가 붙는 순서 목록. 앱에서 번호를 쓰는 유일한 곳이다.

type Props = {
  steps: string[];
};

export default function StepList({ steps }: Props) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-leaf-50 text-xs font-semibold text-leaf">
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed text-ink">{step}</p>
        </li>
      ))}
    </ol>
  );
}
