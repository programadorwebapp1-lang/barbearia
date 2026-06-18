"use client";

import Image from "next/image";

type IconProps = {
  className?: string;
  title?: string;
};

export function BarberIcon({ className = "", title = "Logo Barbearia Carvalho Sistema de Gestão" }: IconProps) {
  return (
    <Image
      src="/brand-logo-icon.png"
      alt={title}
      title={title}
      width={48}
      height={48}
      sizes="48px"
      className={`object-contain ${className}`}
    />
  );
}
