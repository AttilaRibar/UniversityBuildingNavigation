import { StepIconView } from "./StepIconView";
import type { StepCard } from "./stepText";

/**
 * The current instruction, styled like an airport sign: big arrow, one short
 * sentence, readable at arm's length while walking.
 */
export function InstructionBanner({ card, stepKey }: { card: StepCard; stepKey: number }) {
  return (
    <div
      key={stepKey}
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex animate-rise items-center gap-3 rounded-card border-[2.5px] border-ink bg-accent px-3.5 py-3 text-ink shadow-float"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink text-accent">
        <StepIconView icon={card.icon} size={30} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl leading-tight font-extrabold tracking-tight text-balance">{card.title}</span>
        {card.subtitle ? <span className="mt-0.5 block text-sm leading-snug font-semibold text-ink-soft">{card.subtitle}</span> : null}
      </span>
    </div>
  );
}
