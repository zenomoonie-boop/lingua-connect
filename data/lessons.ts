export type Language = {
  code: string;
  name: string;
  flag: string;
  color: string;
};

export type LessonLevel = "Beginner" | "Intermediate" | "Advanced";

export type Lesson = {
  id: string;
  languageCode: string;
  title: string;
  description: string;
  level: LessonLevel;
  xpReward: number;
  duration: number;
  content: LessonContent[];
};

export type LessonContent = {
  type: "text" | "vocab" | "phrase" | "grammar";
  title?: string;
  body: string;
  translation?: string;
  example?: string;
  exampleTranslation?: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "EN", color: "#2563EB" },
  { code: "es", name: "Spanish", flag: "ES", color: "#FF6B35" },
  { code: "fr", name: "French", flag: "FR", color: "#45B7D1" },
  { code: "ja", name: "Japanese", flag: "JP", color: "#FF4757" },
  { code: "de", name: "German", flag: "DE", color: "#F7C948" },
  { code: "pt", name: "Portuguese", flag: "PT", color: "#6BCB77" },
  { code: "zh", name: "Mandarin", flag: "CN", color: "#8B7CF6" },
  { code: "ko", name: "Korean", flag: "KR", color: "#4ECDC4" },
  { code: "it", name: "Italian", flag: "IT", color: "#FF6B9D" },
];

export const LESSONS: Lesson[] = [
  // SPANISH
  {
    id: "es-001",
    languageCode: "es",
    title: "Greetings & Introductions",
    description: "Learn how to greet people and introduce yourself in Spanish.",
    level: "Beginner",
    xpReward: 50,
    duration: 5,
    content: [
      {
        type: "text",
        title: "Greetings",
        body: "In Spanish, greetings change based on the time of day. They are essential for making a good first impression.",
      },
      {
        type: "phrase",
        body: "Hola",
        translation: "Hello",
        example: "Hola, ¿cómo estás?",
        exampleTranslation: "Hello, how are you?",
      },
      {
        type: "phrase",
        body: "Buenos días",
        translation: "Good morning",
        example: "Buenos días, me llamo María.",
        exampleTranslation: "Good morning, my name is María.",
      },
      {
        type: "phrase",
        body: "Buenas tardes",
        translation: "Good afternoon",
        example: "Buenas tardes, ¿en qué puedo ayudarle?",
        exampleTranslation: "Good afternoon, how can I help you?",
      },
      {
        type: "vocab",
        body: "Me llamo...",
        translation: "My name is...",
        example: "Me llamo Carlos. ¿Y tú?",
        exampleTranslation: "My name is Carlos. And you?",
      },
      {
        type: "grammar",
        title: "Subject Pronouns",
        body: "Yo (I), Tú (You), Él/Ella (He/She), Nosotros (We), Ellos (They). Use these before verbs to indicate who is performing the action.",
      },
    ],
  },
  {
    id: "es-002",
    languageCode: "es",
    title: "Numbers & Colors",
    description: "Master Spanish numbers 1-20 and essential color vocabulary.",
    level: "Beginner",
    xpReward: 60,
    duration: 7,
    content: [
      {
        type: "text",
        title: "Numbers 1-10",
        body: "Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.",
      },
      {
        type: "vocab",
        body: "Rojo / Azul / Verde",
        translation: "Red / Blue / Green",
        example: "El cielo es azul.",
        exampleTranslation: "The sky is blue.",
      },
      {
        type: "phrase",
        body: "¿Cuánto cuesta?",
        translation: "How much does it cost?",
        example: "¿Cuánto cuesta esta camisa roja?",
        exampleTranslation: "How much does this red shirt cost?",
      },
      {
        type: "grammar",
        title: "Gender Agreement",
        body: "In Spanish, adjectives agree in gender with the noun they modify. Rojo (masc.) / Roja (fem.). El libro rojo, la manzana roja.",
      },
    ],
  },
  {
    id: "es-003",
    languageCode: "es",
    title: "Restaurant & Food",
    description: "Order food and navigate Spanish restaurants with confidence.",
    level: "Intermediate",
    xpReward: 80,
    duration: 8,
    content: [
      {
        type: "text",
        title: "At the Restaurant",
        body: "Spanish cuisine is rich and varied. Knowing how to order food is one of the most practical skills you can learn.",
      },
      {
        type: "phrase",
        body: "Una mesa para dos, por favor",
        translation: "A table for two, please",
        example: "¿Tienen una mesa para dos disponible?",
        exampleTranslation: "Do you have a table for two available?",
      },
      {
        type: "phrase",
        body: "La cuenta, por favor",
        translation: "The bill, please",
        example: "Cuando pueda, la cuenta, por favor.",
        exampleTranslation: "When you can, the bill, please.",
      },
      {
        type: "vocab",
        body: "Quiero / Me gustaría",
        translation: "I want / I would like",
        example: "Me gustaría el pollo asado.",
        exampleTranslation: "I would like the roasted chicken.",
      },
    ],
  },
  // FRENCH
  {
    id: "fr-001",
    languageCode: "fr",
    title: "Bonjour! First Words",
    description: "Start your French journey with essential greetings and phrases.",
    level: "Beginner",
    xpReward: 50,
    duration: 5,
    content: [
      {
        type: "text",
        title: "French Greetings",
        body: "French people value politeness. Always use proper greetings when meeting someone — it goes a long way!",
      },
      {
        type: "phrase",
        body: "Bonjour",
        translation: "Hello / Good morning",
        example: "Bonjour, comment vous appelez-vous?",
        exampleTranslation: "Hello, what is your name?",
      },
      {
        type: "phrase",
        body: "Je m'appelle...",
        translation: "My name is...",
        example: "Je m'appelle Sophie. Et vous?",
        exampleTranslation: "My name is Sophie. And you?",
      },
      {
        type: "vocab",
        body: "S'il vous plaît / Merci",
        translation: "Please / Thank you",
        example: "Un café, s'il vous plaît. Merci beaucoup!",
        exampleTranslation: "A coffee, please. Thank you very much!",
      },
      {
        type: "grammar",
        title: "Formal vs Informal",
        body: "In French, use 'vous' (formal) with strangers and elders, and 'tu' (informal) with friends and family. This distinction is very important.",
      },
    ],
  },
  {
    id: "fr-002",
    languageCode: "fr",
    title: "Directions & Places",
    description: "Navigate French cities and ask for directions like a local.",
    level: "Intermediate",
    xpReward: 75,
    duration: 9,
    content: [
      {
        type: "phrase",
        body: "Où est...?",
        translation: "Where is...?",
        example: "Excusez-moi, où est la Tour Eiffel?",
        exampleTranslation: "Excuse me, where is the Eiffel Tower?",
      },
      {
        type: "vocab",
        body: "À gauche / À droite / Tout droit",
        translation: "To the left / To the right / Straight ahead",
        example: "Tournez à gauche au feu rouge.",
        exampleTranslation: "Turn left at the red light.",
      },
      {
        type: "phrase",
        body: "À quelle distance?",
        translation: "How far is it?",
        example: "À quelle distance est la gare?",
        exampleTranslation: "How far is the train station?",
      },
    ],
  },
  // JAPANESE
  {
    id: "ja-001",
    languageCode: "ja",
    title: "Hiragana Basics",
    description: "Learn the foundations of Japanese writing with Hiragana.",
    level: "Beginner",
    xpReward: 70,
    duration: 10,
    content: [
      {
        type: "text",
        title: "What is Hiragana?",
        body: "Hiragana is one of three Japanese writing systems. It has 46 basic characters and is the first script Japanese children learn. It represents syllables rather than individual sounds.",
      },
      {
        type: "vocab",
        body: "あ (a), い (i), う (u), え (e), お (o)",
        translation: "The 5 vowels in Japanese",
        example: "あおい (aoi) = Blue, いぬ (inu) = Dog",
        exampleTranslation: "Blue, Dog",
      },
      {
        type: "phrase",
        body: "こんにちは (Konnichiwa)",
        translation: "Hello / Good afternoon",
        example: "こんにちは！おげんきですか？",
        exampleTranslation: "Hello! How are you?",
      },
      {
        type: "phrase",
        body: "ありがとう (Arigatou)",
        translation: "Thank you",
        example: "どうもありがとうございます。",
        exampleTranslation: "Thank you very much.",
      },
      {
        type: "grammar",
        title: "Sentence Structure",
        body: "Japanese uses Subject-Object-Verb order, opposite to English. 'I sushi eat' instead of 'I eat sushi'. Watashi wa sushi wo tabemasu (私はすしを食べます).",
      },
    ],
  },
  {
    id: "ja-002",
    languageCode: "ja",
    title: "Daily Expressions",
    description: "Essential Japanese phrases for everyday life and situations.",
    level: "Beginner",
    xpReward: 60,
    duration: 7,
    content: [
      {
        type: "phrase",
        body: "おはよう (Ohayou)",
        translation: "Good morning (casual)",
        example: "おはようございます！ (Ohayou gozaimasu) - Formal",
        exampleTranslation: "Good morning! (Formal version)",
      },
      {
        type: "phrase",
        body: "すみません (Sumimasen)",
        translation: "Excuse me / I'm sorry",
        example: "すみません、駅はどこですか？",
        exampleTranslation: "Excuse me, where is the station?",
      },
      {
        type: "vocab",
        body: "はい / いいえ",
        translation: "Yes / No",
        example: "はい、そうです。いいえ、ちがいます。",
        exampleTranslation: "Yes, that's right. No, that's wrong.",
      },
    ],
  },
  // GERMAN
  {
    id: "de-001",
    languageCode: "de",
    title: "Willkommen! Welcome to German",
    description: "Begin your German learning with fundamental greetings and introductions.",
    level: "Beginner",
    xpReward: 50,
    duration: 6,
    content: [
      {
        type: "text",
        title: "German Basics",
        body: "German is spoken by over 100 million people worldwide. It's the official language of Germany, Austria, and Switzerland. German nouns are capitalized!",
      },
      {
        type: "phrase",
        body: "Guten Morgen / Guten Tag",
        translation: "Good morning / Good day",
        example: "Guten Tag! Wie heißen Sie?",
        exampleTranslation: "Good day! What is your name?",
      },
      {
        type: "vocab",
        body: "Ich heiße...",
        translation: "My name is...",
        example: "Ich heiße Max. Und Sie?",
        exampleTranslation: "My name is Max. And you?",
      },
      {
        type: "grammar",
        title: "Three Genders",
        body: "German has three grammatical genders: der (masculine), die (feminine), das (neuter). Der Mann, die Frau, das Kind. You must memorize the gender with each noun.",
      },
    ],
  },
  // PORTUGUESE
  {
    id: "pt-001",
    languageCode: "pt",
    title: "Olá! Portuguese Basics",
    description: "Start speaking Portuguese with essential everyday phrases.",
    level: "Beginner",
    xpReward: 50,
    duration: 5,
    content: [
      {
        type: "phrase",
        body: "Olá / Oi",
        translation: "Hello (formal / informal)",
        example: "Oi! Tudo bem?",
        exampleTranslation: "Hi! Everything good?",
      },
      {
        type: "phrase",
        body: "Como vai você?",
        translation: "How are you?",
        example: "Oi, como vai você? Estou bem, obrigado!",
        exampleTranslation: "Hi, how are you? I'm well, thank you!",
      },
      {
        type: "vocab",
        body: "Obrigado / Obrigada",
        translation: "Thank you (male speaker / female speaker)",
        example: "Muito obrigado pela ajuda!",
        exampleTranslation: "Thank you very much for the help!",
      },
    ],
  },
  // MANDARIN
  {
    id: "zh-001",
    languageCode: "zh",
    title: "Nǐ Hǎo! Mandarin Fundamentals",
    description: "Learn the basics of Mandarin Chinese, tones, and essential phrases.",
    level: "Beginner",
    xpReward: 80,
    duration: 10,
    content: [
      {
        type: "text",
        title: "Understanding Tones",
        body: "Mandarin Chinese uses 4 tones + a neutral tone. The same syllable with different tones means completely different things! Mā (mother), Má (hemp), Mǎ (horse), Mà (scold).",
      },
      {
        type: "phrase",
        body: "你好 (Nǐ hǎo)",
        translation: "Hello",
        example: "你好！我叫大卫。(Nǐ hǎo! Wǒ jiào Dàwèi.)",
        exampleTranslation: "Hello! My name is David.",
      },
      {
        type: "phrase",
        body: "谢谢 (Xièxiè)",
        translation: "Thank you",
        example: "非常谢谢！(Fēicháng xièxiè!) = Thank you very much!",
        exampleTranslation: "Thank you very much!",
      },
      {
        type: "vocab",
        body: "我 / 你 / 他 / 她",
        translation: "I/me / You / He/Him / She/Her",
        example: "我爱你。(Wǒ ài nǐ.)",
        exampleTranslation: "I love you.",
      },
    ],
  },
];
