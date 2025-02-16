export const Suits = ["Spades", "Hearts", "Clubs", "Diamonds"] as const;

export const Ranks = ["Nine", "Ten", "Jack", "Queen", "King", "Ace"] as const;

export const RankValues = {
  None: 0,
  Nine: 1,
  Ten: 2,
  Jack: 3,
  Queen: 4,
  King: 5,
  Ace: 6,
  NineTrump: 7,
  TenTrump: 8,
  QueenTrump: 9,
  KingTrump: 10,
  AceTrump: 11,
  LeftBauerTrump: 12,
  JackTrump: 13,
} as const;

export const EstimatedRankValues = {
  None: 0,
  Nine: .02754,
  Ten: .05086,
  Jack: .09659,
  Queen: .19607,
  King: .39910,
  Ace: .72050,
  NineTrump: .27270,
  TenTrump: .29242,
  QueenTrump: .32882,
  KingTrump: .39150,
  AceTrump: .46907,
  LeftBauerTrump: .76092,
  JackTrump: 1,
} as const;

type Phase = "PassPickup" | "CallSuit" | "PlayTrick";

export interface Card {
  rank: typeof Ranks[number];
  suit: typeof Suits[number];
}

export interface Player {
  hand: Card[];
  team: number;
  seat: number;
}

export interface CardWithValueAndPlayer extends Card {
  player: number;
  value: keyof typeof RankValues;
}

export interface Trick {
  cards: CardWithValueAndPlayer[];
  leadSuit: typeof Suits[number] | null;
}

export interface EuchreGame {
  players: Player[];
  deck: Card[];
  upCard: Card | null;
  trump: typeof Suits[number] | null;
  leftBauerTrumpSuit: typeof Suits[number] | null;
  dealer: number;
  leadPlayer: number;
  suitCaller: number | null;
  suitCallerIsAlone: boolean;
  phase: Phase;
  turn: number | null;
  trick: Trick;
  roundUnknownCards: Card[];
  roundScore: number[];
  gameScore: number[];
}
