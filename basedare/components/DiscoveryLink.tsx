"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useDiscovery } from "./DiscoveryProvider";
import { discoveryHref } from "@/lib/discovery-context";
export default function DiscoveryLink(props: ComponentProps<typeof Link>) {
  const { area, hasArea } = useDiscovery();
  return (
    <Link
      {...props}
      href={
        typeof props.href === "string"
          ? discoveryHref(props.href, area, hasArea)
          : props.href
      }
    />
  );
}
