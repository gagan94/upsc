"use client";

import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import type { Confidence, OptionKey, PracticeMode, PracticeQuestionView } from "@/lib/types";
import { LearningFeedback } from "./LearningFeedback";
import { OptionList } from "./OptionList";

const CONFIDENCE = [
  { value: "guess", label: "Guess" },
  { value: "fairly", label: "Fairly" },
  { value: "sure", label: "Sure" },
];

export function QuestionView({
  question,
  mode,
  isFirst,
  isLast,
  checking,
  onSelect,
  onClear,
  onFlag,
  onConfidence,
  onCheck,
  onPrevious,
  onNext,
  onSkip,
  onSaveNext,
  onBlur,
}: {
  question: PracticeQuestionView;
  mode: PracticeMode;
  isFirst: boolean;
  isLast: boolean;
  checking: boolean;
  onSelect: (key: OptionKey) => void;
  onClear: () => void;
  onFlag: () => void;
  onConfidence: (c: Confidence) => void;
  onCheck: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  onSaveNext: () => void;
  onBlur: () => void;
}) {
  const learning = mode === "learning";
  const feedback = learning ? question.feedback : undefined;
  const locked = learning && feedback !== undefined;
  const hasAnswer = question.selected !== null;
  const needsCheck = learning && !locked && hasAnswer;
  return (
    <article className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div>
        <p className="whitespace-pre-line text-base font-semibold text-text">{question.stem}</p>
        {question.statements?.length ? (
          <ol aria-label="Statements" className="mt-3 flex list-none flex-col gap-1.5 text-sm text-text">
            {question.statements.map((s, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden="true" className="font-semibold">{i + 1}.</span><span>{s}</span></li>
            ))}
          </ol>
        ) : null}
      </div>

      <OptionList
        options={question.options}
        selected={question.selected}
        disabled={locked}
        correctOption={feedback?.correctOption}
        onSelect={onSelect}
        onBlur={onBlur}
      />

      {feedback ? <LearningFeedback feedback={feedback} /> : null}

      {hasAnswer && (!learning || locked) ? (
        <div className="flex flex-col gap-1.5">
          <Chips label="How sure are you?" options={CONFIDENCE} value={question.confidence} onChange={(v) => onConfidence(v as Confidence)} />
          <p className="text-xs text-muted">Optional. How sure are you? It helps us suggest what to revisit.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" aria-pressed={question.flagged} onClick={onFlag}>
          {question.flagged ? "Flagged for review" : "Flag for review"}
        </Button>
        {!learning && hasAnswer ? <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button> : null}
        {needsCheck ? <Button size="sm" loading={checking} onClick={onCheck}>Check</Button> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={onPrevious} disabled={isFirst}>Previous</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onSkip} disabled={isLast}>Skip</Button>
          <Button variant="secondary" onClick={onNext} disabled={isLast}>Next</Button>
          <Button onClick={onSaveNext} disabled={needsCheck} title={needsCheck ? "Check your answer first" : undefined}>
            {isLast ? "Save & review" : "Save & next"}
          </Button>
        </div>
      </div>
    </article>
  );
}
