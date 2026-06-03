import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { controlPanel, controlHairline } from './tokens';

/**
 * Raised Control section panel with the standard top hairline.
 */

type ControlPanelProps = {
  children: ReactNode;
  /** Hide the top hairline accent. */
  hairline?: boolean;
  id?: string;
  className?: string;
};

export function ControlPanel({ children, hairline = true, id, className }: ControlPanelProps) {
  return (
    <section id={id} className={cn(controlPanel, 'p-5 sm:p-6 lg:p-7', className)}>
      {hairline ? <div className={controlHairline} /> : null}
      <div className="relative">{children}</div>
    </section>
  );
}

export default ControlPanel;
