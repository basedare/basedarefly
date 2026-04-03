'use client';

import CosmicButton from '@/components/ui/CosmicButton';
import { useIgnition } from '@/app/context/IgnitionContext';
import { useFeedback } from '@/hooks/useFeedback';

interface InitProtocolButtonProps {
  className?: string;
  onClick?: () => void;
}

export default function InitProtocolButton({ className, onClick }: InitProtocolButtonProps) {
  const { ignitionActive, triggerIgnition } = useIgnition();
  const { trigger } = useFeedback();

  const handleAction = () => {
    trigger('fund');
    triggerIgnition();
    if (onClick) onClick();
  };

  return (
    <CosmicButton
      type="button"
      onClick={handleAction}
      variant="gold"
      size="xl"
      className={className}
    >
      {ignitionActive ? 'Igniting...' : 'Initiate Protocol'}
    </CosmicButton>
  );
}
