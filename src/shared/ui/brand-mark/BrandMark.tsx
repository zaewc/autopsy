import "./brandMark.css";
export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
