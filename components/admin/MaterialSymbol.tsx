"use client";

export default function MaterialSymbol({
  name,
  className,
  filled,
  size,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  /** Pixel size; also sets the Material Symbols optical size axis for correct scaling. */
  size?: number;
}) {
  const px = size == null ? null : Math.round(size);
  const opsz = px == null ? 24 : Math.min(48, Math.max(12, px));
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`.trim()}
      style={{
        ...(size != null
          ? {
              fontSize: size,
              width: size,
              height: size,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }
          : {}),
        fontVariationSettings: filled
          ? `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' ${opsz}`
          : `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' ${opsz}`,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}

