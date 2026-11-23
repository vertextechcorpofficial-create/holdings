"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";

export function TopHeader() {
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const title = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    return { title, href, isLast: index === pathSegments.length - 1 };
  });

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <SidebarTrigger className="shrink-0 hover:bg-accent hover:text-accent-foreground" />
        <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-hidden">
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem className="hidden md:block truncate">
                  {crumb.isLast ? (
                    <BreadcrumbPage className="font-semibold text-primary truncate">
                      {crumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href} className="truncate">
                      {crumb.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!crumb.isLast && <BreadcrumbSeparator className="hidden md:block shrink-0" />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="w-52 max-w-full">
          <NavUser
            user={{
              name: "dev vertex",
              email: "dev@men2corp.com",
              avatar: "",
            }}
            subsystemSlug="holdings"
          />
        </div>
      </div>
    </header>
  );
}

