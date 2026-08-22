import { Icon } from "../../icons";
export function SectionTitle({
  icon,
  title,
  action,
  onClick,
}: {
  icon: string;
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="section-title">
      <h2>
        <Icon name={icon} />
        {title}
      </h2>
      <button onClick={onClick}>
        {action} <Icon name="chevron" />
      </button>
    </div>
  );
}
