// 해당 영역에만 표시한다. 화면 전체를 가리는 스피너는 쓰지 않는다.

type Props = {
  label?: string;
  className?: string;
};

export default function Loading({ label = "불러오는 중...", className }: Props) {
  return (
    <p className={["text-sm text-ink-45", className].filter(Boolean).join(" ")}>
      {label}
    </p>
  );
}
