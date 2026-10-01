import { SectionHeading } from "@/shared/ui/section-heading";
import { Check, Search } from "lucide-react";
export function AuditSection({
  active,
}: {
  active: "Security" | "Accessibility" | "SEO";
}) {
  return (
    <section>
      <SectionHeading title={`${active} inspection`}>
        <span className="muted-caption">Sample checks</span>
      </SectionHeading>
      <div className="audit-table">
        {(active === "Security"
          ? [
              ["HTTPS", "Passed", "Encrypted transport detected"],
              [
                "Strict-Transport-Security",
                "Passed",
                "max-age=63072000; includeSubDomains",
              ],
              ["X-Content-Type-Options", "Passed", "nosniff"],
              [
                "Content-Security-Policy",
                "Review",
                "Header absent from sample response",
              ],
            ]
          : active === "Accessibility"
            ? [
                [
                  "Document language",
                  "Passed",
                  'The document declares lang="en"',
                ],
                [
                  "Image dimensions",
                  "Review",
                  "3 images lack explicit dimensions",
                ],
                [
                  "Landmark structure",
                  "Passed",
                  "Header, navigation, and main landmarks present",
                ],
                [
                  "Manual testing",
                  "Required",
                  "Keyboard and assistive technology testing is still needed",
                ],
              ]
            : [
                ["Page title", "Passed", "A descriptive title is present"],
                [
                  "Meta description",
                  "Passed",
                  "Description is within a readable length",
                ],
                [
                  "Canonical URL",
                  "Passed",
                  "A self-referencing canonical URL is present",
                ],
                [
                  "Robots directives",
                  "Passed",
                  "The sample page allows indexing",
                ],
              ]
        ).map(([name, status, detail]) => (
          <div className="audit-row" key={name}>
            <strong>{name}</strong>
            <span className={status === "Passed" ? "green-text" : "amber"}>
              {status === "Passed" ? <Check size={14} /> : <Search size={14} />}{" "}
              {status}
            </span>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
