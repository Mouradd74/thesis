export type QuestionId =
  | 'age'
  | 'gender'
  | 'internet'
  | 'resources'
  | 'extracurricular'
  | 'motivation'
  | 'discussions'
  | 'tech'
  | 'stress';

export type QuestionType = 'number' | 'selection';

export interface Option {
  label: string;
  value: string;
  emoji?: string;
}

export interface Question {
  id: QuestionId;
  section: string;
  question: string;
  description?: string;
  type: QuestionType;
  options?: Option[];
  placeholder?: string;
  min?: number;
  max?: number;
  inputStyle?: 'binary' | 'scale';
}

export const QUESTIONS: Question[] = [
  {
    id: 'age',
    section: 'About You',
    question: 'How old are you?',
    description: 'We use this to personalize your learning path recommendations.',
    type: 'number',
    placeholder: 'Enter your age',
    min: 18,
    max: 100,
  },
  {
    id: 'gender',
    section: 'About You',
    question: 'How do you identify?',
    type: 'selection',
    inputStyle: 'binary',
    options: [
      { label: 'Female', value: 'female', emoji: '👩' },
      { label: 'Male', value: 'male', emoji: '👨' },
    ],
  },
  {
    id: 'internet',
    section: 'Learning Environment',
    question: 'Do you have reliable internet access?',
    description: 'This helps us understand if offline resources might be needed.',
    type: 'selection',
    inputStyle: 'binary',
    options: [
      { label: 'Yes', value: 'yes', emoji: '✅' },
      { label: 'No', value: 'no', emoji: '❌' },
    ],
  },
  {
    id: 'resources',
    section: 'Learning Habits',
    question: 'How often do you use additional learning resources?',
    description: 'Think about YouTube, libraries, or extra textbooks.',
    type: 'selection',
    inputStyle: 'scale',
    options: [
      { label: 'Rarely or Never', value: 'rarely', emoji: '😴' },
      { label: 'Sometimes', value: 'sometimes', emoji: '📚' },
      { label: 'Frequently', value: 'frequently', emoji: '🚀' },
    ],
  },
  {
    id: 'extracurricular',
    section: 'Learning Habits',
    question: 'Do you participate in extracurricular activities?',
    type: 'selection',
    inputStyle: 'binary',
    options: [
      { label: 'Yes', value: 'yes', emoji: '🎯' },
      { label: 'No', value: 'no', emoji: '🙅' },
    ],
  },
  {
    id: 'motivation',
    section: 'Motivation',
    question: 'How would you describe your current motivation level?',
    type: 'selection',
    inputStyle: 'scale',
    options: [
      { label: 'Low', value: 'low', emoji: '😔' },
      { label: 'Moderate', value: 'moderate', emoji: '😊' },
      { label: 'High', value: 'high', emoji: '🔥' },
    ],
  },
  {
    id: 'discussions',
    section: 'Engagement',
    question: 'Do you actively participate in group discussions?',
    type: 'selection',
    inputStyle: 'binary',
    options: [
      { label: 'Yes', value: 'yes', emoji: '🗣️' },
      { label: 'No', value: 'no', emoji: '🤐' },
    ],
  },
  {
    id: 'tech',
    section: 'Engagement',
    question: 'Do you use educational technology tools regularly?',
    description: 'Apps, online platforms, or learning software.',
    type: 'selection',
    inputStyle: 'binary',
    options: [
      { label: 'Yes', value: 'yes', emoji: '💻' },
      { label: 'No', value: 'no', emoji: '📵' },
    ],
  },
  {
    id: 'stress',
    section: 'Well-being',
    question: 'How would you rate your typical stress level?',
    type: 'selection',
    inputStyle: 'scale',
    options: [
      { label: 'Low', value: 'low', emoji: '😌' },
      { label: 'Moderate', value: 'moderate', emoji: '😤' },
      { label: 'High', value: 'high', emoji: '😰' },
    ],
  },
];

export const SECTION_COLORS: Record<string, string> = {
  'About You': '#a1a1aa',
  'Learning Environment': '#60a5fa',
  'Learning Habits': '#34d399',
  'Motivation': '#fbbf24',
  'Engagement': '#a78bfa',
  'Well-being': '#f87171',
};
