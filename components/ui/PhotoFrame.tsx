// 사진 자리. 없으면 같은 크기의 빈 종이면을 둔다.
// next/image 를 쓰려면 원격 도메인 설정이 필요해 여기서는 img 를 쓴다.
//
// 크기는 size 로만 정한다. className 으로 size-14 같은 너비를 주면
// 기본 w-full 과 부딪혀 CSS 순서에 따라 사진이 가로로 늘어난다.

type Ratio = "video" | "photo" | "square";

const RATIO: Record<Ratio, string> = {
  video: "aspect-video",
  photo: "aspect-[4/3]",
  square: "aspect-square",
};

type Size = "fill" | "thumb";

const SIZE: Record<Size, string> = {
  /** 부모 너비를 채운다. 비율은 ratio 를 따른다. */
  fill: "w-full rounded-lg",
  /** 목록 한 줄 옆에 붙는 작은 정사각형. 줄어들지 않는다. ratio 는 무시한다. */
  thumb: "size-14 shrink-0 rounded-md",
};

type Props = {
  src?: string | null;
  alt?: string;
  ratio?: Ratio;
  size?: Size;
  /** 여백 등 크기와 무관한 것만. 너비·높이는 size 로 정한다. */
  className?: string;
};

export default function PhotoFrame({
  src,
  alt = "",
  ratio = "photo",
  size = "fill",
  className,
}: Props) {
  const cls = [
    "overflow-hidden border border-rule",
    SIZE[size],
    size === "fill" && RATIO[ratio],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!src) {
    return <div className={`${cls} bg-sheet-2`} />;
  }

  return (
    <div className={cls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="size-full object-cover" />
    </div>
  );
}
