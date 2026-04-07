// ────────────────────────────────────────────────
//  i18n — Russian / English translations
// ────────────────────────────────────────────────

export type Lang = 'ru' | 'en';

const translations = {
  // Header
  'app.subtitle': { ru: 'Тренажёр произношения', en: 'Pronunciation Trainer' },
  'header.progress': { ru: '📊 Прогресс', en: '📊 Progress' },
  'header.level': { ru: 'Уровень', en: 'Level' },
  'header.logout': { ru: 'Выйти', en: 'Logout' },
  'header.signin': { ru: 'Войти / Регистрация', en: 'Sign In / Sign Up' },

  // Level selector
  'level.select': { ru: 'Выберите уровень', en: 'Select Your Level' },

  // Topic selector
  'topic.select': { ru: '📚 Выберите тему', en: '📚 Choose a Topic' },

  // Tabs
  'tab.practice': { ru: '🎙 Практика фраз', en: '🎙 Practice Phrases' },
  'tab.twisters': { ru: '🌀 Скороговорки', en: '🌀 Tongue Twisters' },

  // Phrase card
  'phrase.prev': { ru: 'Назад', en: 'Prev' },
  'phrase.next': { ru: 'Далее', en: 'Next' },
  'phrase.counter': { ru: 'Фраза', en: 'Phrase' },
  'phrase.listen': { ru: 'Прослушать', en: 'Listen First' },

  // Recording
  'mic.notice': {
    ru: 'Для мобильного использования разрешите доступ к микрофону в настройках браузера. Удерживайте кнопку для записи.',
    en: 'For mobile use, allow microphone access in browser settings. Hold the button to record.',
  },
  'mic.denied': {
    ru: 'Доступ к микрофону заблокирован или недоступен.',
    en: 'Microphone access denied or unavailable.',
  },

  // Analyzing
  'analyzing.title': { ru: 'Анализируем произношение...', en: 'Analyzing Your Pronunciation...' },
  'analyzing.subtitle': { ru: 'Сравниваем слово за словом', en: 'Comparing word-by-word accuracy' },

  // Results
  'result.you_said': { ru: 'Вы сказали:', en: 'You said:' },
  'result.no_issues': { ru: 'Серьёзных ошибок произношения не обнаружено.', en: 'No major pronunciation issues detected.' },
  'result.issues_found': { ru: 'Обнаружено ошибок произношения:', en: 'pronunciation issue(s) to work on.' },
  'result.no_speech': {
    ru: 'Речь не распознана. Убедитесь, что микрофон работает и говорите чётко.',
    en: 'No speech was detected. Please make sure your microphone is working and speak clearly.',
  },

  // Score labels
  'score.total': { ru: 'Общий балл', en: 'Total Score' },
  'score.accuracy': { ru: 'Точность', en: 'Accuracy' },
  'score.fluency': { ru: 'Беглость', en: 'Fluency' },
  'score.complete': { ru: 'Полнота', en: 'Complete' },
  'score.intonation': { ru: 'Интонация', en: 'Intonation' },
  'score.stress': { ru: 'Ударение', en: 'Stress' },

  // Score verdicts
  'verdict.excellent': { ru: 'Отлично!', en: 'Excellent!' },
  'verdict.great': { ru: 'Здорово!', en: 'Great Job!' },
  'verdict.good': { ru: 'Хорошо!', en: 'Good Effort!' },
  'verdict.keep': { ru: 'Продолжайте', en: 'Keep Practicing' },
  'verdict.try': { ru: 'Попробуйте ещё', en: 'Try Again' },

  // Word analysis
  'words.correct': { ru: 'Правильные слова', en: 'Correct Words' },
  'words.mispronounced': { ru: 'Ошибки произношения', en: 'Mispronounced' },
  'words.missing': { ru: 'Пропущенные', en: 'Missing' },
  'words.extra': { ru: 'Лишние слова', en: 'Extra Words' },
  'words.breakdown': { ru: 'Разбор по словам', en: 'Word-by-Word Breakdown' },

  // Phonetic guide
  'phonetic.title': { ru: 'Руководство по произношению — Слушайте и практикуйтесь', en: 'Pronunciation Guide — Listen & Practice' },
  'phonetic.hint': {
    ru: 'Нажмите «Прослушать», чтобы услышать правильное произношение.',
    en: 'Click "Listen" to hear the correct pronunciation.',
  },
  'phonetic.your_sound': { ru: 'Ваш звук', en: 'Your Sound' },
  'phonetic.correct_sound': { ru: 'Правильный звук', en: 'Correct Sound' },
  'phonetic.listen': { ru: 'Прослушать', en: 'Listen' },

  // Stress
  'stress.title': { ru: '💬 Руководство по ударениям', en: '💬 Stress & Emphasis Guide' },
  'stress.hint': {
    ru: 'В этих словах часто ставят неправильное ударение. Обратите внимание.',
    en: 'These words have tricky stress patterns. Listen carefully.',
  },
  'stress.pattern': { ru: 'Схема ударения', en: 'Stress Pattern' },
  'stress.common_mistake': { ru: 'Частая ошибка:', en: 'Common mistake:' },

  // Full phrase
  'full_phrase.title': { ru: 'Прослушать всю фразу', en: 'Listen to the Full Phrase' },
  'full_phrase.hint': { ru: 'Послушайте правильное произношение, затем попробуйте снова.', en: 'Listen to the correct pronunciation, then try again.' },
  'full_phrase.play': { ru: 'Воспроизвести фразу', en: 'Play Full Phrase' },

  // Action buttons
  'action.try_again': { ru: 'Попробовать ещё', en: 'Try Again' },
  'action.next_phrase': { ru: 'Следующая фраза', en: 'Next Phrase' },

  // History sidebar
  'history.title': { ru: 'Мой прогресс', en: 'My Progress' },
  'history.empty': { ru: 'Записей пока нет. Произнесите фразу!', en: 'No recordings yet. Speak to save your progress!' },
  'history.avg_score': { ru: 'Средний балл', en: 'Average Score' },
  'history.issues': { ru: 'ошибок обнаружено', en: 'issue(s) detected' },

  // Tongue twisters
  'twister.title': { ru: '🌀 Скороговорка', en: '🌀 Tongue Twister' },
  'twister.listen': { ru: 'Прослушать медленно', en: 'Listen Slowly' },
  'twister.playing': { ru: 'Воспроизведение...', en: 'Playing...' },
  'twister.next': { ru: 'Следующая', en: 'Next' },
  'twister.hint': {
    ru: 'Тренируйте скороговорки для улучшения скорости и чёткости произношения',
    en: 'Practice tongue twisters to improve pronunciation speed and clarity',
  },

  // Auth page
  'auth.login_tab': { ru: 'Вход', en: 'Login' },
  'auth.register_tab': { ru: 'Регистрация', en: 'Register' },
  'auth.email': { ru: 'Электронная почта', en: 'Email' },
  'auth.password': { ru: 'Пароль', en: 'Password' },
  'auth.name': { ru: 'Имя', en: 'Name' },
  'auth.login_btn': { ru: 'Войти', en: 'Sign In' },
  'auth.register_btn': { ru: 'Зарегистрироваться', en: 'Sign Up' },
  'auth.back': { ru: '← На главную', en: '← Back to Main' },

  // Level check
  'levelcheck.title': { ru: 'Определите свой уровень английского', en: 'Determine Your English Level' },
  'levelcheck.subtitle': {
    ru: 'Прочитайте фразу и запишите произношение. Мы определим ваш уровень.',
    en: 'Read the phrase and record your pronunciation. We will determine your level.',
  },
  'levelcheck.recording': { ru: 'Запись...', en: 'Recording...' },
  'levelcheck.hold_record': { ru: 'Удерживайте для записи', en: 'Hold to Record' },
  'levelcheck.analyzing': { ru: 'Анализируем...', en: 'Analyzing...' },
  'levelcheck.result': { ru: 'Ваш уровень:', en: 'Your level:' },
  'levelcheck.continue': { ru: 'Продолжить', en: 'Continue' },
  'levelcheck.skip': { ru: 'Пропустить тест', en: 'Skip Test' },

  // Progress page
  'progress.title': { ru: 'Мой прогресс', en: 'My Progress' },
  'progress.back': { ru: '← Назад', en: '← Back' },
  'progress.sessions': { ru: 'Занятий', en: 'Sessions' },
  'progress.avg': { ru: 'Средний балл', en: 'Avg Score' },
  'progress.best': { ru: 'Лучший балл', en: 'Best Score' },
  'progress.improvement': { ru: 'Прогресс', en: 'Improvement' },
  'progress.history': { ru: 'История занятий', en: 'Session History' },
  'progress.no_data': { ru: 'Данных пока нет. Начните практику!', en: 'No data yet. Start practicing!' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry['en'] || key;
}

export function getScoreLabelLocalized(score: number, lang: Lang): string {
  if (score >= 90) return t('verdict.excellent', lang);
  if (score >= 75) return t('verdict.great', lang);
  if (score >= 60) return t('verdict.good', lang);
  if (score >= 40) return t('verdict.keep', lang);
  return t('verdict.try', lang);
}
