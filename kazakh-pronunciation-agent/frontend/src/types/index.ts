// ────────────────────────────────────────────────
//  Shared TypeScript types
// ────────────────────────────────────────────────

export interface CEFRLevel {
  code: string;
  name: string;
  description: string;
}

export interface Topic {
  id: string;
  name: string;
  icon: string;
}

export interface WordAnalysis {
  correct: { word: string; status: string }[];
  incorrect: { word: string; spoken_as: string; similarity: number; status: string }[];
  missing: { word: string; status: string }[];
  extra: { word: string; status: string }[];
}

export interface PhoneticIssue {
  word: string;
  spoken_as: string | null;
  category: string;
  ipa_correct: string;
  common_error: string;
  issue: string;
  tip: string;
}

export interface StressIssue {
  word: string;
  correct_stress: string;
  common_mistake: string;
  tip: string;
}

export interface AnalysisResult {
  scores: {
    overall: number;
    accuracy: number;
    fluency: number;
    intonation: number;
    stress: number;
  };
  word_analysis: WordAnalysis;
  phonetic_issues: PhoneticIssue[];
  stress_issues: StressIssue[];
  target_text: string;
  user_text: string;
  summary: string;
}

export interface HistoryItem {
  id: string;
  phrase: string;
  level: string;
  topic: string;
  score: number;
  accuracy: number;
  date: string;
  issueCount: number;
}
