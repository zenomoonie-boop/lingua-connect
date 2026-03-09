export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

export type Quiz = {
  lessonId: string;
  questions: QuizQuestion[];
};

export const QUIZZES: Quiz[] = [
  {
    lessonId: "es-001",
    questions: [
      {
        id: "es001-q1",
        type: "multiple-choice",
        question: "How do you say 'Good morning' in Spanish?",
        options: ["Buenas noches", "Buenos días", "Buenas tardes", "Hola"],
        correctAnswer: "Buenos días",
        explanation: "Buenos días is used in the morning, buenas tardes in the afternoon, and buenas noches in the evening.",
      },
      {
        id: "es001-q2",
        type: "true-false",
        question: "'Me llamo' means 'I am from' in Spanish.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "'Me llamo' means 'My name is.' To say 'I am from,' you would use 'Soy de.'",
      },
      {
        id: "es001-q3",
        type: "multiple-choice",
        question: "Which pronoun means 'We' in Spanish?",
        options: ["Yo", "Tú", "Nosotros", "Ellos"],
        correctAnswer: "Nosotros",
        explanation: "Nosotros means 'we' in Spanish. Yo=I, Tú=You, Ellos=They.",
      },
      {
        id: "es001-q4",
        type: "fill-blank",
        question: "Complete: '_____, me llamo Carlos.' (Hello, my name is Carlos.)",
        correctAnswer: "Hola",
        explanation: "Hola is the most common greeting in Spanish, equivalent to 'Hello' or 'Hi' in English.",
      },
      {
        id: "es001-q5",
        type: "true-false",
        question: "In Spanish, 'Buenas tardes' is used in the morning.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "Buenas tardes means 'Good afternoon' and is used from noon until evening. Buenos días is used in the morning.",
      },
    ],
  },
  {
    lessonId: "es-002",
    questions: [
      {
        id: "es002-q1",
        type: "multiple-choice",
        question: "What color is 'rojo' in Spanish?",
        options: ["Blue", "Green", "Red", "Yellow"],
        correctAnswer: "Red",
        explanation: "Rojo means red. Azul=blue, verde=green, amarillo=yellow.",
      },
      {
        id: "es002-q2",
        type: "true-false",
        question: "In Spanish, adjectives always stay the same regardless of the noun's gender.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "Spanish adjectives agree in gender with the noun. Rojo (masculine) becomes roja (feminine). El libro rojo, la manzana roja.",
      },
      {
        id: "es002-q3",
        type: "multiple-choice",
        question: "How do you say 'How much does it cost?' in Spanish?",
        options: ["¿Dónde está?", "¿Cuánto cuesta?", "¿Cómo te llamas?", "¿Cuántos años tienes?"],
        correctAnswer: "¿Cuánto cuesta?",
        explanation: "¿Cuánto cuesta? is the standard phrase to ask about prices in Spanish-speaking countries.",
      },
    ],
  },
  {
    lessonId: "fr-001",
    questions: [
      {
        id: "fr001-q1",
        type: "multiple-choice",
        question: "How do you say 'Thank you' in French?",
        options: ["S'il vous plaît", "Bonjour", "Merci", "Au revoir"],
        correctAnswer: "Merci",
        explanation: "Merci means 'thank you.' Merci beaucoup means 'thank you very much.'",
      },
      {
        id: "fr001-q2",
        type: "true-false",
        question: "In French, 'vous' is always used with close friends.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "'Vous' is the formal form used with strangers and elders. 'Tu' is the informal form used with friends and family.",
      },
      {
        id: "fr001-q3",
        type: "multiple-choice",
        question: "How do you say 'My name is...' in French?",
        options: ["Je suis...", "J'habite...", "Je m'appelle...", "J'ai..."],
        correctAnswer: "Je m'appelle...",
        explanation: "Je m'appelle literally means 'I call myself...' and is the standard way to introduce your name in French.",
      },
      {
        id: "fr001-q4",
        type: "fill-blank",
        question: "Complete: 'Un café, _____ vous plaît.' (A coffee, please.)",
        correctAnswer: "s'il",
        explanation: "'S'il vous plaît' (formal) or 's'il te plaît' (informal) means 'please' in French.",
      },
    ],
  },
  {
    lessonId: "ja-001",
    questions: [
      {
        id: "ja001-q1",
        type: "multiple-choice",
        question: "What does 'こんにちは (Konnichiwa)' mean?",
        options: ["Good morning", "Goodbye", "Hello / Good afternoon", "Good evening"],
        correctAnswer: "Hello / Good afternoon",
        explanation: "Konnichiwa is used as a general greeting during the daytime, similar to 'Hello' or 'Good afternoon.'",
      },
      {
        id: "ja001-q2",
        type: "true-false",
        question: "Japanese uses Subject-Verb-Object word order, same as English.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "Japanese uses Subject-Object-Verb order. Instead of 'I eat sushi,' Japanese says 'I sushi eat' (Watashi wa sushi wo tabemasu).",
      },
      {
        id: "ja001-q3",
        type: "multiple-choice",
        question: "How many basic Hiragana characters are there?",
        options: ["26", "46", "52", "100"],
        correctAnswer: "46",
        explanation: "Hiragana has 46 basic characters. Including dakuten (voiced sounds) and combinations, there are more, but the core set is 46.",
      },
      {
        id: "ja001-q4",
        type: "multiple-choice",
        question: "What does 'ありがとう (Arigatou)' mean?",
        options: ["Hello", "Goodbye", "Excuse me", "Thank you"],
        correctAnswer: "Thank you",
        explanation: "Arigatou means 'thank you' (casual). The formal version is 'Arigatou gozaimasu' (ありがとうございます).",
      },
    ],
  },
  {
    lessonId: "de-001",
    questions: [
      {
        id: "de001-q1",
        type: "multiple-choice",
        question: "How many grammatical genders does German have?",
        options: ["1", "2", "3", "4"],
        correctAnswer: "3",
        explanation: "German has three genders: der (masculine), die (feminine), and das (neuter).",
      },
      {
        id: "de001-q2",
        type: "true-false",
        question: "In German, all nouns are capitalized.",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: "Unlike English, German capitalizes ALL nouns, not just proper names. Der Hund (the dog), Die Frau (the woman), Das Buch (the book).",
      },
      {
        id: "de001-q3",
        type: "multiple-choice",
        question: "How do you say 'My name is...' in German?",
        options: ["Ich bin...", "Ich heiße...", "Ich habe...", "Ich komme..."],
        correctAnswer: "Ich heiße...",
        explanation: "Ich heiße... means 'I am called...' or 'My name is...' in German. Ich bin... means 'I am...' and is used differently.",
      },
    ],
  },
  {
    lessonId: "zh-001",
    questions: [
      {
        id: "zh001-q1",
        type: "multiple-choice",
        question: "How many tones does Mandarin Chinese have?",
        options: ["2", "3", "4", "6"],
        correctAnswer: "4",
        explanation: "Mandarin has 4 tones plus a neutral/5th tone. The same syllable with different tones means different things: mā (mother), má (hemp), mǎ (horse), mà (scold).",
      },
      {
        id: "zh001-q2",
        type: "true-false",
        question: "'谢谢 (Xièxiè)' means 'Hello' in Mandarin.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "'谢谢 (Xièxiè)' means 'Thank you.' 'Hello' in Mandarin is '你好 (Nǐ hǎo).'",
      },
      {
        id: "zh001-q3",
        type: "multiple-choice",
        question: "What does '我 (Wǒ)' mean in Mandarin?",
        options: ["You", "He/She", "I/Me", "We"],
        correctAnswer: "I/Me",
        explanation: "我 (Wǒ) means 'I' or 'me.' 你 (Nǐ)=You, 他 (Tā)=He, 她 (Tā)=She, 我们 (Wǒmen)=We.",
      },
    ],
  },
  {
    lessonId: "pt-001",
    questions: [
      {
        id: "pt001-q1",
        type: "multiple-choice",
        question: "How do you say 'Hello' informally in Portuguese?",
        options: ["Bom dia", "Boa tarde", "Oi", "Obrigado"],
        correctAnswer: "Oi",
        explanation: "'Oi' is the informal way to say hello in Portuguese, especially in Brazil. 'Olá' is slightly more formal.",
      },
      {
        id: "pt001-q2",
        type: "true-false",
        question: "In Portuguese, a female speaker says 'Obrigado' to say thank you.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "Female speakers say 'Obrigada' while male speakers say 'Obrigado.' The ending changes based on the speaker's gender.",
      },
    ],
  },
  {
    lessonId: "tl-001",
    questions: [
      {
        id: "tl001-q1",
        type: "multiple-choice",
        question: "What does 'Kamusta?' mean in Filipino?",
        options: ["Good night", "Hello / How are you?", "Thank you", "Goodbye"],
        correctAnswer: "Hello / How are you?",
        explanation: "'Kamusta?' is a common Filipino greeting used like 'Hello' or 'How are you?' in conversation.",
      },
      {
        id: "tl001-q2",
        type: "multiple-choice",
        question: "How do you say 'Good morning' in Filipino?",
        options: ["Magandang gabi", "Magandang tanghali", "Magandang umaga", "Salamat"],
        correctAnswer: "Magandang umaga",
        explanation: "'Magandang umaga' means 'Good morning.'",
      },
      {
        id: "tl001-q3",
        type: "true-false",
        question: "'Po' and 'opo' are used to show respect in Filipino.",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: "Po and opo are polite Filipino expressions used when speaking respectfully.",
      },
    ],
  },
];
