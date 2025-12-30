import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "gold" | "purple";
  hoverEffect?: boolean;
}

export function GlassCard({ 
  className, 
  variant = "default", 
  hoverEffect = false,
  children, 
  ...props 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base Glass Styles
        "relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl",
        "transition-all duration-300 ease-out",
        
        // Variants
        variant === "default" && "shadow-none",
        variant === "gold" && "border-brand-gold/30 shadow-neon-gold",
        variant === "purple" && "border-brand-purple/30 shadow-neon-purple",
        
        // Hover
        hoverEffect && "hover:border-brand-gold/50 hover:shadow-neon-gold hover:-translate-y-1",
        
        className
      )}
      {...props}
    >
      {/* The Noise Texture Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
