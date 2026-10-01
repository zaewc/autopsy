import { BrandMark } from "@/shared/ui/brand-mark";
export function ReportFooter() {
  return (
    <footer>
      <span>
        <BrandMark small /> The details make the difference.
      </span>
      <span>
        Public signals. Clear evidence. No black boxes.
        <span className="footer-cross">✳</span>
      </span>
    </footer>
  );
}
