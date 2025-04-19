import { GrammarData } from "../../vocabulary/models/grammar-data.model";

export interface WordEntry {
  word: string;
  translation: string;
  grammar?: GrammarData;
}
