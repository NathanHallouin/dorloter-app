import { Pill } from "./pill";

/* ------------------------------ CompatPills ------------------------------- */
export function CompatPills({ cats, dogs, children, hideNeg }: { cats?: string | null; dogs?: string | null; children?: string | null; hideNeg?: boolean }) {
  const items = [
    { value: cats, label: "chats", icon: "cat" },
    { value: dogs, label: "chiens", icon: "dog" },
    { value: children, label: "enfants", icon: "baby" },
  ].filter((it) => it.value && (!hideNeg || it.value === "oui"));
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => {
        const tone = it.value === "oui" ? "green" : it.value === "non" ? "rose" : "sable";
        const txt = it.value === "oui" ? `OK ${it.label}` : it.value === "non" ? `Sans ${it.label}` : `${it.label} ?`;
        return <Pill key={i} tone={tone} icon={it.icon}>{txt}</Pill>;
      })}
    </div>
  );
}
