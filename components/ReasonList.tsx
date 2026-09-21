// 진단의 판단 근거. 진단 결과와 지난 진단 다시 보기가 같이 쓴다.
// 가는 선으로 나눈 줄 목록. 글머리표를 두지 않는다.

type Props = {
  reasons: string[];
};

export default function ReasonList({ reasons }: Props) {
  return (
    <ul>
      {reasons.map((reason) => (
        <li
          key={reason}
          className="border-t border-hair py-2.5 text-sm leading-relaxed text-ink first:border-t-0 first:pt-0"
        >
          {reason}
        </li>
      ))}
    </ul>
  );
}
