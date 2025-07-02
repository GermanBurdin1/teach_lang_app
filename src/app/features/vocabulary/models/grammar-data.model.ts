// ✅ Type de partie du discours
export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'expression';

// ✅ Ajout de l'interface ExpressionGrammar
export interface ExpressionGrammar {
  partOfSpeech: 'expression';
  expressionType?: 'idiom' | 'proverb' | 'saying' | 'collocation' | 'quote' | 'other';
  origin?: string; // par exemple, «proverbe français»
}

// ✅ Type global GrammarData
export type GrammarData =
  | NounGrammar
  | VerbGrammar
  | AdjectiveGrammar
  | AdverbGrammar
  | PronounGrammar
  | PrepositionGrammar
  | ConjunctionGrammar
  | InterjectionGrammar
  | ExpressionGrammar;

// ✅ Pour chaque partie du discours
export interface NounGrammar {
  partOfSpeech: 'noun';
  gender?: 'masculine' | 'feminine';
  number?: 'singular' | 'plural';
  isProper?: boolean;
}

export interface VerbGrammar {
  partOfSpeech: 'verb';
  transitivity?: 'transitive' | 'intransitive';
  isPronominal?: boolean;
  isIrregular?: boolean;
}


export interface AdjectiveGrammar {
    partOfSpeech: 'adjective';
    comparison?: 'positive' | 'comparative' | 'superlative'; // joli / plus joli / le plus joli
    variable?: boolean; // change-t-il selon le genre/nombre (ex: "chic" — non, "beau" — oui)
}


export interface AdverbGrammar {
  partOfSpeech: 'adverb';
  comparison?: 'positive' | 'comparative' | 'superlative';
}


export interface PronounGrammar {
  partOfSpeech: 'pronoun';
  person?: 1 | 2 | 3;
  gender?: 'masculine' | 'feminine';
  number?: 'singular' | 'plural';
  type?: 'personal' | 'reflexive' | 'demonstrative' | 'possessive' | 'interrogative' | 'relative' | 'indefinite';
}


export interface PrepositionGrammar {
  partOfSpeech: 'preposition';
}

export interface ConjunctionGrammar {
  partOfSpeech: 'conjunction';
  type?: 'coordinating' | 'subordinating';
}


export interface InterjectionGrammar {
  partOfSpeech: 'interjection';
  emotionType?: string; // ah! oh! zut!
}

