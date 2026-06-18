"use client";

import Image from "next/image";

type BrandLogoProps = {
  compact?: boolean;
  priority?: boolean;
  className?: string;
  markClassName?: string;
  fullClassName?: string;
  alt?: string;
  title?: string;
};

const defaultAlt = "Logo Barbearia Carvalho Sistema de Gestão";

export function BrandLogo({
  compact = false,
  priority = false,
  className = "",
  markClassName = "",
  fullClassName = "",
  alt = defaultAlt,
  title = defaultAlt,
}: BrandLogoProps) {
  if (compact) {
    return (
      <Image
        src="/brand-logo-icon.png"
        alt={alt}
        title={title}
        width={96}
        height={96}
        priority={priority}
        sizes="96px"
        className={`h-auto w-auto object-contain ${markClassName} ${className}`}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src="/brand-logo-icon.png"
        alt={alt}
        title={title}
        width={96}
        height={96}
        priority={priority}
        sizes="(max-width: 768px) 72px, 96px"
        className={`block h-auto w-auto object-contain md:hidden ${markClassName}`}
      />
      <Image
        src="/brand-logo-full.png"
        alt={alt}
        title={title}
        width={1536}
        height={1024}
        priority={priority}
        sizes="(max-width: 768px) 0px, (max-width: 1024px) 280px, 360px"
        className={`hidden h-auto w-full object-contain md:block ${fullClassName}`}
      />
    </div>
  );
}
