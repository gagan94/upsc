import { WINDOW_OPTIONS } from "@/lib/prep-options";
import type { StudyWindow } from "@/lib/types";
import { formatMinutes } from "@/lib/format";
import { Chips } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import type { StepProps } from "./types";
import { StepError } from "./types";

const PRESETS = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "360", label: "6 hours" },
  { value: "480", label: "8 hours" },
];

export function RoutineStep({ draft, setDraft, errors }: StepProps) {
  function setDaily(dailyMin: number) {
    setDraft(draft.weeklyTouched ? { dailyMin } : { dailyMin, weeklyMin: dailyMin * 7 });
  }
  const preset = PRESETS.some((p) => p.value === String(draft.dailyMin)) ? String(draft.dailyMin) : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="daily-slider" className="text-sm font-semibold text-text">Daily study time</label>
          <output htmlFor="daily-slider" className="text-sm font-semibold text-primary">{formatMinutes(draft.dailyMin)} a day</output>
        </div>
        <input
          id="daily-slider"
          type="range"
          min={30}
          max={960}
          step={30}
          value={draft.dailyMin}
          aria-valuetext={`${formatMinutes(draft.dailyMin)} a day`}
          onChange={(e) => setDaily(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <Chips label="Common daily amounts" options={PRESETS} value={preset} onChange={(v) => setDaily(Number(v))} />
        <StepError message={errors.dailyMin} />
      </div>
      <Field
        label="Weekly goal (minutes)"
        type="number"
        inputMode="numeric"
        min={30}
        max={6720}
        value={draft.weeklyMin || ""}
        hint={`Starts at 7 x your daily time (${formatMinutes(draft.dailyMin * 7)}). Change it if your week is lighter or heavier.`}
        error={errors.weeklyMin ?? null}
        onChange={(e) => setDraft({ weeklyMin: Number(e.target.value), weeklyTouched: true })}
      />
      <div className="flex flex-col gap-1">
        <Chips
          label="Preferred study windows"
          multiple
          options={WINDOW_OPTIONS}
          value={draft.windows}
          onChange={(v) => setDraft({ windows: v as StudyWindow[] })}
        />
        <StepError message={errors.windows} />
      </div>
    </div>
  );
}
