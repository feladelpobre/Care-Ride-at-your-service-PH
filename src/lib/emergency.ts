/**
 * Emergency red-flag detector (spec §4, AC2). Runs BEFORE any AI call.
 * Deliberately errs on the side of caution: a false positive only asks the
 * caregiver to call 911 or rephrase; a false negative could be dangerous.
 */
const RED_FLAGS: RegExp[] = [
  /chest\s*pain/i,
  /heart\s*attack/i,
  /can'?t\s*breathe|cannot\s*breathe|difficulty\s*breathing|not\s*breathing/i,
  /unconscious|unresponsive|passed\s*out|fainted/i,
  /severe\s*bleeding|bleeding\s*heavily/i,
  /\bstroke\b/i,
  /seizure|nag-?seizure|kinukumbulsyon/i,
  /overdose/i,
  // Filipino / Taglish
  /sakit\s*(sa|ng)\s*dibdib/i,
  /hindi\s*makahinga|di\s*makahinga|hirap\s*huminga/i,
  /walang\s*malay|nawalan\s*ng\s*malay|nahimatay/i,
  /atake\s*sa\s*puso/i,
  /malakas\s*na\s*pagdurugo|dumudugo\s*nang\s*malakas/i,
];

export const EMERGENCY_MESSAGE =
  "This sounds like a medical emergency. Care Ride is for non-emergency trips only. Call 911 now (or your nearest hospital emergency line).";

export function detectEmergency(text: string): { emergency: boolean; matched: string[] } {
  const matched = RED_FLAGS.filter((re) => re.test(text)).map((re) => re.source);
  return { emergency: matched.length > 0, matched };
}
