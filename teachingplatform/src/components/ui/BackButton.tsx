import { ArrowLeft } from "@phosphor-icons/react";
import { NavLink } from "react-router-dom";

type BackButtonProps = {
  to: string;
  label: string;
  ariaLabel: string;
  className?: string;
};

export function BackButton({ to, label, ariaLabel, className = "" }: BackButtonProps) {
  return (
    <NavLink to={to} className={`shared-back-button ${className}`} aria-label={ariaLabel}>
      <span className="shared-back-icon" aria-hidden="true"><ArrowLeft weight="bold" /></span>
      <span className="shared-back-label">{label}</span>
    </NavLink>
  );
}
