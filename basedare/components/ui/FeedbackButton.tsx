'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { useFeedback, type FeedbackType } from '@/hooks/useFeedback';

interface FeedbackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Feedback type on click (default: 'click') */
  feedbackType?: FeedbackType;
  /** Feedback type on hover (default: none) */
  hoverFeedback?: boolean;
}

/**
 * Button with built-in sound + haptic feedback
 *
 * @example
 * ```tsx
 * <FeedbackButton onClick={handleSubmit} feedbackType="success">
 *   Submit
 * </FeedbackButton>
 * ```
 */
export const FeedbackButton = forwardRef<HTMLButtonElement, FeedbackButtonProps>(
  ({ feedbackType = 'click', hoverFeedback = false, onClick, onMouseEnter, children, ...props }, ref) => {
    const { trigger } = useFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      trigger(feedbackType);
      onClick?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hoverFeedback) {
        trigger('hover');
      }
      onMouseEnter?.(e);
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {children}
      </button>
    );
  }
);

FeedbackButton.displayName = 'FeedbackButton';
