// 사진 자리. 없으면 같은 크기의 빈 종이면을 둔다.
// next/image 를 쓰려면 원격 도메인 설정이 필요해 여기서는 img 를 쓴다.

type Ratio = "video" | "photo" | "square";

const RATIO: Record<Ratio, string> = {
  video: "aspect-video",
  photo: "aspect-[4/3]",
  square: "aspect-square",
};

type Props = {
  src?: string | null;
  alt?: string;
  ratio?: Ratio;
  className?: string;
};

export default function PhotoFrame({
  src,
  alt = "",
  ratio = "photo",
  className,
}: Props) {
  const cls = [
    "w-full overflow-hidden rounded-lg border border-rule",
    RATIO[ratio],
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
