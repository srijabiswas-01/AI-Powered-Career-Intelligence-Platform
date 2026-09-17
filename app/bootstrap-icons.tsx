"use client";

import { forwardRef } from "react";

type Props = React.HTMLAttributes<HTMLElement> & { size?: number | string; strokeWidth?: number };
const icon = (name: string) => forwardRef<HTMLElement, Props>(function BootstrapIcon({ size, strokeWidth: _strokeWidth, style, ...props }, ref) {
  return <i ref={ref} aria-hidden="true" {...props} className={`bi bi-${name}${props.className ? ` ${props.className}` : ""}`} style={{ fontSize: size, ...style }} />;
});

export const LayoutDashboard = icon("grid-1x2-fill");
export const FileText = icon("file-earmark-text");
export const Sparkles = icon("stars");
export const BriefcaseBusiness = icon("briefcase");
export const ApplicationFile = icon("file-earmark-person");
export const FolderKanban = icon("kanban");
export const Award = icon("award");
export const Globe2 = icon("globe2");
export const ChartNoAxesCombined = icon("bar-chart-line");
export const Settings = icon("gear");
export const Bell = icon("bell");
export const Search = icon("search");
export const Plus = icon("plus-lg");
export const Upload = icon("cloud-arrow-up");
export const ArrowUpRight = icon("arrow-up-right");
export const ChevronDown = icon("chevron-down");
export const Target = icon("bullseye");
export const CalendarDays = icon("calendar3");
export const CircleCheck = icon("check-circle-fill");
export const Zap = icon("lightning-charge-fill");
export const Command = icon("command");
export const Menu = icon("list");
export const X = icon("x-lg");
export const Check = icon("check-lg");
export const TrendingUp = icon("graph-up-arrow");
export const Clock3 = icon("clock");
export const WandSparkles = icon("magic");
export const Moon = icon("moon-stars");
export const Sun = icon("sun");
export const UserRound = icon("person");
export const Mail = icon("envelope");
export const MapPin = icon("geo-alt");
export const Phone = icon("telephone");
export const Link = icon("link-45deg");
export const Code2 = icon("code-slash");
export const Save = icon("floppy");
export const Camera = icon("camera");
export const GraduationCap = icon("mortarboard");
export const Languages = icon("translate");
