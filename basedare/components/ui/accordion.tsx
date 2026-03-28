import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-white/80" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-[faq-accordion-up_240ms_cubic-bezier(0.4,0,1,1)] data-[state=open]:animate-[faq-accordion-down_380ms_cubic-bezier(0.22,1,0.36,1)] [&[data-state=closed]>div]:-translate-y-1 [&[data-state=closed]>div]:opacity-0 [&[data-state=closed]>div]:blur-[2px] [&[data-state=open]>div]:translate-y-0 [&[data-state=open]>div]:opacity-100 [&[data-state=open]>div]:blur-0"
    {...props}
  >
    <div
      className={cn(
        "pb-4 pt-0 transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity,filter]",
        className
      )}
    >
      {children}
    </div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

