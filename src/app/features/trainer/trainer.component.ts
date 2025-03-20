import { Component } from '@angular/core';

@Component({
  selector: 'app-trainer',
  templateUrl: './trainer.component.html',
  styleUrls: ['./trainer.component.css']
})
export class TrainerComponent {
  activeTab = 'audio';

  // Аудирование
  audioTask = 'dictation';

  // Аудиофайл
  currentAudio = 'assets/audio/sample.mp3';

  // Диктант
  maskedText = "Le ___ est magnifique aujourd'hui.";
  correctDictation = "soleil";
  userDictation = "";
  resultDictation = "";

  // Выбор ответа
  choiceOptions = ['Le soleil', 'La lune', 'Les étoiles'];
  correctChoice = 'Le soleil';
  resultChoice = '';

  // Расстановка событий
  events = ['Il achète un billet.', 'Il monte dans le train.', 'Il trouve une place.'];
  shuffledEvents = [...this.events].sort(() => Math.random() - 0.5);
  resultSequence = '';

  // Перефразирование
  paraphraseInput = '';
  resultParaphrase = '';

  // Интонация
  correctIntonation = 'joy';
  resultIntonation = '';

  ///////////////////////////////////////////////////////////////////////////////

  // Чтение
  // Тренажёры для чтения
  readingTask = 'matchTitle';

  // 1️⃣ Найди соответствие (заголовки)
  readingText = 'La pollution est un problème majeur dans le monde moderne...';
  readingOptions = ['L’environnement', 'Les technologies', 'Le sport'];
  correctReading = 'L’environnement';
  readingResult: string | undefined;

  // 2️⃣ Смысловой анализ
  analysisText = 'Le réchauffement climatique cause de nombreux changements dans notre environnement...';
  analysisOptions = ['Les conséquences du climat', 'Les progrès scientifiques', 'Les droits humains'];
  correctAnalysis = 'Les conséquences du climat';
  analysisResult: string | undefined;

  // 3️⃣ Перефразирование
  paraphraseText = 'Les nouvelles technologies ont transformé notre manière de communiquer.';
  correctParaphraseReading = 'La communication a changé grâce aux avancées technologiques.';
  paraphraseReadingInput = '';
  readingParaphraseResult: string | undefined;

  // 4️⃣ Определение аргументации
  argumentationText = 'Certains pensent que les voitures électriques sont la meilleure solution pour réduire la pollution.';
  argumentationOptions = ['Opinion personnelle', 'Thèse avec argument', 'Faits historiques'];
  correctArgumentation = 'Thèse avec argument';
  argumentationResult: string | undefined;

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Письмо
  // Тренажёры для письма
  writingTask = 'plan';

  // 1️⃣ Составление плана
  essayPlan = '';
  essayFeedback = '';

  // 2️⃣ Автопроверка стиля
  essayText = '';
  styleFeedback: string | undefined;

  // 3️⃣ Тренажёр выражений
  expressionSentence = '_____ est important de protéger la nature.';
  expressionOptions = ['Il me semble que', 'Il est clair que', 'Il'];
  correctExpression = 'Il est clair que';
  expressionFeedback: string | undefined;

  // 4️⃣ Генерация тем
  topics = ['L\'importance de l\'éducation', 'Les nouvelles technologies', 'Le changement climatique'];
  generatedTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
  generatedEssayPlan = '';
  generatedPlanFeedback: string | undefined;

  // 5️⃣ Редактирование ошибок
  incorrectSentence = 'Il faut faire attention a les règles grammaticaux.';
  correctSentence = 'Il faut faire attention aux règles grammaticales.';
  correctedSentence = '';
  correctionFeedback: string | undefined;

  /////////////////////////////////////////////////////////////////////////////////////////////
  // Устная речь
  // Тренажёры для устной речи
  speakingTask = 'argumentation';

  // 1️⃣ Разбор аргументации
  speakingQuestion = 'Pourquoi faut-il protéger l’environnement?';
  recording = false;
  recordingMessage = '';

  // 2️⃣ Импровизированные темы
  improvTopics = ['Faut-il interdire les voitures en centre-ville?', 'Le télétravail est-il une bonne solution?', 'Quelle est l’importance des langues étrangères?'];
  improvTopic = this.improvTopics[Math.floor(Math.random() * this.improvTopics.length)];
  improvTimer = false;
  improvTimerMessage = '';

  // 3️⃣ Синхронный перевод
  translationSentence = 'The world is changing rapidly due to technological advances.';
  correctTranslation = 'Le monde change rapidement grâce aux avancées technologiques.';
  userTranslation = '';
  translationFeedback: string | undefined;

  // 4️⃣ Разговорные сценарии
  dialoguePrompt = 'Comment répondre poliment à un client mécontent?';
  dialogueOptions = ['Désolé pour le désagrément, comment puis-je vous aider?', 'Ce n’est pas mon problème.', 'Je ne peux rien faire.'];
  correctDialogue = 'Désolé pour le désagrément, comment puis-je vous aider?';
  dialogueFeedback: string | undefined;

  // 5️⃣ Интонация и акцент
  intonationSentence = 'Je suis tellement content de cette nouvelle!';
  intonationFeedback: string | undefined;

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Тренажёры по грамматике и лексике
  grammarTask = 'connectors';

  // 1️⃣ Связки
  sentenceWithBlank = 'Il pleuvait, _____ nous avons annulé le voyage.';
  connectorOptions = ['ainsi', 'néanmoins', 'toutefois'];
  correctConnector = 'ainsi';
  connectorResult: string | undefined;

  // 2️⃣ Конструктор предложений
  correctSentenceOrder = ['Je', 'vais', 'au', 'cinéma', 'ce', 'soir.'];
  shuffledSentenceWords = [...this.correctSentenceOrder].sort(() => Math.random() - 0.5);
  sentenceOrderResult: string | undefined;

  // 3️⃣ Грамматические мини-игры
  verbQuestion = 'Hier, il _____ (aller) au musée.';
  verbOptions = ['va', 'allait', 'ira'];
  correctVerb = 'allait';
  verbResult: string | undefined;

  // 4️⃣ Контекстный тренажёр лексики
  contextSentence = 'Il a trouvé une solution très _____ à ce problème.';
  contextOptions = ['efficace', 'inutile', 'compliqué'];
  correctContext = 'efficace';
  contextResult: string | undefined;

  // 5️⃣ Синонимы и антонимы
  synonymQuestion = 'Quel est le synonyme de "rapide" ?';
  synonymOptions = ['lent', 'vite', 'facile'];
  correctSynonym = 'vite';
  synonymResult: string | undefined;

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Симуляция экзамена
  examStarted = false;
  examStep = 'listening'; // Этапы: 'listening', 'reading', 'writing', 'speaking', 'results'
  examScore = 0;
  examFeedback: string | undefined;

  // 1️⃣ Аудирование
  examAudio = 'assets/audio/exam_sample.mp3';
  listeningOptions = ['Il fait beau', 'Il pleut', 'Il neige'];
  correctListening = 'Il pleut';
  listeningResult: string | undefined;

  // 2️⃣ Чтение
  examReadingText = 'Le changement climatique est un problème mondial...';
  // readingOptions, correctReading,readingResult такие же как в чтении

  // 3️⃣ Письмо
  examWritingTopic = 'Quel est l’impact des réseaux sociaux sur la société?';
  examWritingAnswer = '';
  writingResult: string | undefined;

  // 4️⃣ Устная речь
  examSpeakingQuestion = 'Quels sont les avantages et les inconvénients du télétravail?';
  speakingRecording = false;
  speakingRecordingMessage = '';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // Проверка диктанта
  setAudioTask(task: string) {
    this.audioTask = task;
  }

  // Проверка диктанта
  checkDictation() {
    this.resultDictation = this.userDictation.toLowerCase().trim() === this.correctDictation
      ? '✅ Верно!' : '❌ Неверно, попробуйте ещё раз.';
  }

  // Проверка выбора ответа
  checkChoice(option: string) {
    this.resultChoice = option === this.correctChoice
      ? '✅ Верно!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  // Функция для перестановки событий (по нажатию)
  reorder(event: string) {
    const index = this.shuffledEvents.indexOf(event);
    if (index > 0) {
      // Меняем местами выбранный элемент с предыдущим
      [this.shuffledEvents[index - 1], this.shuffledEvents[index]] =
        [this.shuffledEvents[index], this.shuffledEvents[index - 1]];
    }
  }

  // Проверка правильности расстановки
  checkSequence() {
    const isCorrect = JSON.stringify(this.shuffledEvents) === JSON.stringify(this.events);
    this.resultSequence = isCorrect
      ? '✅ Всё в правильном порядке!'
      : '❌ Ошибка, попробуйте переставить.';
  }

  // Проверка перефразирования (простая версия)
  checkParaphrase() {
    this.resultParaphrase = this.paraphraseInput.length > 10
      ? '✅ Хороший пересказ!' : '❌ Нужно подробнее.';
  }

  // Проверка интонации
  checkIntonation(selectedEmotion: string) {
    this.resultIntonation = selectedEmotion === this.correctIntonation
      ? '✅ Верно!' : '❌ Ошибка.';
  }

  /////////////////////////////////////////////////////////////////////////////////////
  // Проверка заголовка к тексту
  // Выбор активного задания для чтения
  setReadingTask(task: string) {
    this.readingTask = task;
  }

  // Проверка заголовка
  checkReading(option: string) {
    this.readingResult = option === this.correctReading ? '✅ Верно!' : '❌ Неверно.';
  }

  // Проверка смыслового анализа
  checkMainIdea(option: string) {
    this.analysisResult = option === this.correctAnalysis ? '✅ Верно!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  // Проверка перефразирования
  checkReadingParaphrase() {
    this.readingParaphraseResult = this.paraphraseReadingInput.toLowerCase().trim() === this.correctParaphraseReading.toLowerCase()
      ? '✅ Хороший пересказ!' : '❌ Нужно подробнее.';
  }

  // Проверка аргументации
  checkArgumentation(option: string) {
    this.argumentationResult = option === this.correctArgumentation ? '✅ Верно!' : '❌ Ошибка, попробуйте снова.';
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // Проверка плана эссе
  // Выбор активного задания для письма
  setWritingTask(task: string) {
    this.writingTask = task;
  }

  // Проверка плана эссе
  checkEssayPlan() {
    this.essayFeedback = this.essayPlan.length > 20 ? '✅ Хороший план!' : '❌ Нужно подробнее.';
  }

  // Автопроверка стиля
  checkStyle() {
    const wordCount = this.essayText.split(' ').length;
    if (wordCount < 10) {
      this.styleFeedback = '❌ Текст слишком короткий.';
    } else if (this.essayText.includes('très très') || this.essayText.includes('beaucoup beaucoup')) {
      this.styleFeedback = '⚠️ Используйте более точные выражения.';
    } else {
      this.styleFeedback = '✅ Стиль хороший!';
    }
  }

  // Проверка выражений
  checkExpression(option: string) {
    this.expressionFeedback = option === this.correctExpression ? '✅ Верно!' : '❌ Ошибка.';
  }

  // Генерация случайной темы
  generateTopic() {
    this.generatedTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
  }

  // Проверка плана по сгенерированной теме
  checkGeneratedPlan() {
    this.generatedPlanFeedback = this.generatedEssayPlan.length > 20 ? '✅ Хороший план!' : '❌ Нужно подробнее.';
  }

  // Проверка исправления ошибок
  checkCorrection() {
    this.correctionFeedback = this.correctedSentence.toLowerCase().trim() === this.correctSentence.toLowerCase()
      ? '✅ Верно!' : '❌ Попробуйте снова.';
  }

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Запись речи
  // Выбор активного задания для устной речи
  setSpeakingTask(task: string) {
    this.speakingTask = task;
  }

  // Запись речи
  startRecording() {
    this.recording = true;
    this.recordingMessage = '🎙 Запись началась...';
    setTimeout(() => {
      this.recording = false;
      this.recordingMessage = '✔️ Запись завершена!';
    }, 5000);
  }

  // Генерация новой импровизированной темы
  generateImprovTopic() {
    this.improvTopic = this.improvTopics[Math.floor(Math.random() * this.improvTopics.length)];
  }

  // Таймер для подготовки к импровизации
  startImprovTimer() {
    this.improvTimer = true;
    this.improvTimerMessage = '⏳ Время пошло...';
    setTimeout(() => {
      this.improvTimer = false;
      this.improvTimerMessage = '✔️ Время подготовки закончилось!';
    }, 60000);
  }

  // Проверка синхронного перевода
  checkTranslation() {
    this.translationFeedback = this.userTranslation.toLowerCase().trim() === this.correctTranslation.toLowerCase()
      ? '✅ Отличный перевод!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  // Проверка диалогов
  checkDialogue(option: string) {
    this.dialogueFeedback = option === this.correctDialogue ? '✅ Хороший ответ!' : '❌ Ошибка, попробуйте снова.';
  }

  // Проверка интонации, пока тот же метод, что и в аудировании


  ///////////////////////////////////////////////////////////////////////////////////////////////
  // грамматика и лексика
  // Выбор активного задания для грамматики
  setGrammarTask(task: string) {
    this.grammarTask = task;
  }

  // Проверка связок
  checkConnector(option: string) {
    this.connectorResult = option === this.correctConnector ? '✅ Верно!' : '❌ Ошибка.';
  }

  // Проверка порядка слов
  reorderSentence(word: string) {
    const index = this.shuffledSentenceWords.indexOf(word);
    if (index > 0) {
      [this.shuffledSentenceWords[index - 1], this.shuffledSentenceWords[index]] =
        [this.shuffledSentenceWords[index], this.shuffledSentenceWords[index - 1]];
    }
  }

  checkSentenceOrder() {
    const isCorrect = JSON.stringify(this.shuffledSentenceWords) === JSON.stringify(this.correctSentenceOrder);
    this.sentenceOrderResult = isCorrect ? '✅ Всё верно!' : '❌ Ошибка, попробуйте снова.';
  }

  // Проверка глагольных форм
  checkVerb(option: string) {
    this.verbResult = option === this.correctVerb ? '✅ Верно!' : '❌ Ошибка.';
  }

  // Проверка слов в контексте
  checkContext(option: string) {
    this.contextResult = option === this.correctContext ? '✅ Верно!' : '❌ Ошибка.';
  }

  // Проверка синонимов
  checkSynonym(option: string) {
    this.synonymResult = option === this.correctSynonym ? '✅ Верно!' : '❌ Ошибка.';
  }

  /////////////////////////////////////////////////////////////////////////
  // Начало экзамена
  // Запуск экзамена
  startExam() {
    this.examStarted = true;
    this.examStep = 'listening';
    this.examScore = 0;
    this.examFeedback = '';
  }

  // Проверка аудирования
  checkListening(option: string) {
    if (option === this.correctListening) {
      this.examScore += 25;
    }
    this.examStep = 'reading'; // Переход к следующему этапу
  }

  // Проверка чтения такая же
  // Проверка письма (очень упрощённая)
  checkWriting() {
    if (this.examWritingAnswer.length > 20) {
      this.examScore += 25;
    }
    this.examStep = 'speaking'; // Переход к устной части
  }

  // Запись ответа на устную часть
  startSpeakingExam() {
    this.speakingRecording = true;
    this.speakingRecordingMessage = '🎙 Запись началась...';
    setTimeout(() => {
      this.speakingRecording = false;
      this.speakingRecordingMessage = '✔️ Запись завершена!';
      this.examScore += 25;
      this.examStep = 'results'; // Переход к результатам
      this.calculateExamResults();
    }, 5000);
  }

  // Итоговый анализ экзамена
  calculateExamResults() {
    if (this.examScore >= 80) {
      this.examFeedback = '🎉 Поздравляем! Вы сдали экзамен.';
    } else {
      this.examFeedback = '❌ К сожалению, вы не набрали достаточно баллов. Попробуйте снова!';
    }
  }

  // Перезапуск экзамена
  restartExam() {
    this.examStarted = false;
    this.examScore = 0;
    this.examStep = 'listening';
  }
}
