import { EuchreGame, Ranks, RankValues, Suits, Card, EstimatedRankValues } from "./gamestate.ts";

const cardTypes = Array.from(Object.keys(RankValues) as (keyof typeof RankValues)[])

const cardValueCounts = cardTypes.map((card) => {
  return {
    card,
    previousEstimate: EstimatedRankValues[card],
    playedCount: 0,
    wonCount: 0,
  };
});

const dealerMustPickTrumpAloneHeuristic: number[] = [];
const dealermustPickTrumpAloneCounts: number[] = [];
const dealerMustPickTrumpTwoSuitedHeuristic: number[] = [];
const dealermustPickTrumpTwoSuitedCounts: number[] = [];
const dealerMustPickTrumpThreeSuitedHeuristic: number[] = [];
const dealermustPickTrumpThreeSuitedCounts: number[] = [];
const dealerMustPickTrumpFourSuitedHeuristic: number[] = [];
const dealermustPickTrumpFourSuitedCounts: number[] = [];

const euchreGame: EuchreGame = {
  players: [
    { hand: [], team: 0, seat: 1 },
    { hand: [], team: 1, seat: 2 },
    { hand: [], team: 0, seat: 3 },
    { hand: [], team: 1, seat: 4 },
  ],
  deck: Suits.flatMap((suit) => Ranks.map((rank) => ({ suit, rank }))),
  upCard: null,
  trump: null,
  leftBauerTrumpSuit: null,
  dealer: 1,
  leadPlayer: 2,
  suitCaller: null,
  suitCallerIsAlone: false,
  phase: "PassPickup",
  turn: 2,
  trick: { cards: [], leadSuit: null },
  roundUnknownCards: Suits.flatMap((suit) => Ranks.map((rank) => ({ suit, rank }))),
  roundScore: [0, 0],
  gameScore: [0, 0],
};

const getLeftBauerTrumpSuit = (trumpSuit: typeof Suits[number]) => {
  if (trumpSuit === "Spades") {
    return "Clubs";
  } else if (trumpSuit === "Hearts") {
    return "Diamonds";
  } else if (trumpSuit === "Clubs") {
    return "Spades";
  } else {
    return "Hearts";
  }
}

const setLeftBauerTrumpSuit = () => {
  if (euchreGame.trump === "Spades") {
    euchreGame.leftBauerTrumpSuit = "Clubs";
  } else if (euchreGame.trump === "Hearts") {
    euchreGame.leftBauerTrumpSuit = "Diamonds";
  } else if (euchreGame.trump === "Clubs") {
    euchreGame.leftBauerTrumpSuit = "Spades";
  } else {
    euchreGame.leftBauerTrumpSuit = "Hearts";
  }
}

const simulateDeal = () => {
  const shuffledDeck = Suits.flatMap((suit) => Ranks.map((rank) => ({ suit, rank }))).sort(() => Math.random() - 0.5);
  euchreGame.players.forEach((player, j) => {
    player.hand = shuffledDeck.slice(j * 5, (j + 1) * 5);
  });
  euchreGame.upCard = shuffledDeck[20];
  euchreGame.trump = null;
  const newDealerSeat = Math.floor(Math.random() * 4) + 1;
  euchreGame.dealer = newDealerSeat;
  euchreGame.leadPlayer = (newDealerSeat % 4) + 1;
  euchreGame.turn = euchreGame.leadPlayer;
  euchreGame.trick = { cards: [], leadSuit: null };
};

const playerPlayTrickAI = (playableCards: { card: Card, value: keyof typeof RankValues}[], playerSeat: number) => {
  const teamControlsTrick = euchreGame.trick.cards.length === 0 ||
    euchreGame.trick.cards.length === 2 && RankValues[euchreGame.trick.cards[0].value] > RankValues[euchreGame.trick.cards[1].value] ||
    euchreGame.trick.cards.length === 3 && RankValues[euchreGame.trick.cards[1].value] > RankValues[euchreGame.trick.cards[2].value] && RankValues[euchreGame.trick.cards[1].value] > RankValues[euchreGame.trick.cards[0].value];
  if (teamControlsTrick) {
    if (euchreGame.trick.cards.length === 0) {
      // play good cards if you're leading
      const highestCard = playableCards.reduce((prev, curr) => {
        return RankValues[prev.value] > RankValues[curr.value] ? prev : curr;
      });
      // only play trump if no higher trump is possible
      const higherTrumpPossible = euchreGame.roundUnknownCards.filter(card => euchreGame.players.find(player => player.seat === playerSeat)?.hand.some(handCard => handCard.rank === card.rank && handCard.suit === card.suit)).some((card) => card.suit === euchreGame.trump && RankValues[card.rank] > RankValues[highestCard.card.rank] || card.suit === euchreGame.leftBauerTrumpSuit && card.rank === "Jack" && RankValues["LeftBauerTrump"] > RankValues[highestCard.card.rank]);
      if (higherTrumpPossible) {
        const nonTrumpCards = playableCards.filter(card => RankValues[card.value] < 7);
        if (nonTrumpCards.length === 0) {
          return highestCard.card;
        } else {
          const highestNonTrumpCard = nonTrumpCards.filter(card => RankValues[card.value] < 7).reduce((prev, curr) => {
            return RankValues[prev.value] > RankValues[curr.value] || RankValues[curr.value] > 6 ? prev : curr;
          });
          return highestNonTrumpCard.card;
        }
      }
      return highestCard.card;
    }
    // play your worst card if you're not leading and your team controls
    // short suit yourself if possible
    const suitCounts = Suits.map(suit => ({
      suit,
      count: playableCards.filter(card => {
        if (euchreGame.trump === suit) {
          if (card.card.suit === euchreGame.trump || card.value === "LeftBauerTrump") {
            return true;
          }
        } else {
          if (card.card.suit === suit && card.value !== "LeftBauerTrump") {
            return true;
          }
        }
        card.card.suit === suit
      }).length
    }));
    const trumpCount = suitCounts.find(suitCount => suitCount.suit === euchreGame.trump)!.count;
    if (trumpCount > 0 && suitCounts.some(suitCount => suitCount.suit !== euchreGame.trump && suitCount.count === 1)) {
      const suitsToShort = suitCounts.filter(suitCount => suitCount.suit !== euchreGame.trump && suitCount.count === 1);
      const shortSuitCandidates = playableCards.filter(card => suitsToShort.some(suitToShort => suitToShort.suit === card.card.suit) && RankValues[card.value] < 5);
      const lowestShortSuitCard = shortSuitCandidates.reduce((prev, curr) => {
        return RankValues[prev.value] < RankValues[curr.value] ? prev : curr;
      });
      return lowestShortSuitCard.card;
    }
    const lowestCard = playableCards.reduce((prev, curr) => {
      return RankValues[prev.value] < RankValues[curr.value] ? prev : curr;
    });
    return lowestCard.card;
  }
  // we don't control the trick
  const controllingCardValue = Math.max(...euchreGame.trick.cards.map((card) => RankValues[card.value]));
  const playerCardsThatControl = playableCards.filter(card => RankValues[card.value] > controllingCardValue);
  if (playerCardsThatControl.length > 0) {
    // play your lowest controlling card if possible
    const lowestControllingCard = playerCardsThatControl.reduce((prev, curr) => {
      return RankValues[prev.value] < RankValues[curr.value] ? prev : curr;
    });
    return lowestControllingCard.card;
  }
  // if no cards could control, play your lowest card
  // short suit yourself if possible
  const suitCounts = Suits.map(suit => ({
    suit,
    count: playableCards.filter(card => {
      if (euchreGame.trump === suit) {
        if (card.card.suit === euchreGame.trump || card.value === "LeftBauerTrump") {
          return true;
        }
      } else {
        if (card.card.suit === suit && card.value !== "LeftBauerTrump") {
          return true;
        }
      }
      card.card.suit === suit
    }).length
  }));
  const trumpCount = suitCounts.find(suitCount => suitCount.suit === euchreGame.trump)!.count;
  if (trumpCount > 0 && suitCounts.some(suitCount => suitCount.suit !== euchreGame.trump && suitCount.count === 1)) {
    const suitsToShort = suitCounts.filter(suitCount => suitCount.suit !== euchreGame.trump && suitCount.count === 1);
    const shortSuitCandidates = playableCards.filter(card => suitsToShort.some(suitToShort => suitToShort.suit === card.card.suit) && RankValues[card.value] < 5);
    const lowestShortSuitCard = shortSuitCandidates.reduce((prev, curr) => {
      return RankValues[prev.value] < RankValues[curr.value] ? prev : curr;
    });
    return lowestShortSuitCard.card;
  }
  const lowestCard = playableCards.reduce((prev, curr) => {
    return RankValues[prev.value] < RankValues[curr.value] ? prev : curr;
  });
  return lowestCard.card;
}

const simulatePlayerPlayTrick = (playerSeat: number) => {
  const playerData = euchreGame.players.find((player) => player.seat === playerSeat)!;
  const cardsWithValue = playerData.hand.map((card) => {
    let cardIdentifier: keyof typeof RankValues = card.rank;
    const cardIsLeftBauer = card.suit === euchreGame.leftBauerTrumpSuit && card.rank === "Jack"
    if (card.suit === euchreGame.trump || cardIsLeftBauer) {
      cardIdentifier = `${card.rank}Trump`;
      if (cardIsLeftBauer) {
        cardIdentifier = "LeftBauerTrump";
      }
    } else if (card.suit === euchreGame.trick.leadSuit) {
      cardIdentifier = card.rank;
    } else {
      cardIdentifier = "None";
    }
    return { card, value: cardIdentifier };
  });
  const playableCardsWithValue = !cardsWithValue.some((playerCard) => {
    if (euchreGame.trick.leadSuit === euchreGame.trump) {
      if (playerCard.card.suit === euchreGame.trump || playerCard.value === "LeftBauerTrump") {
        return true;
      }
    } else {
      if (playerCard.card.suit === euchreGame.trick.leadSuit && playerCard.value !== "LeftBauerTrump") {
        return true;
      }
    }
  }) ? cardsWithValue : cardsWithValue.filter(filteredCard => {
    if (euchreGame.trick.cards.length === 0) {
      return true;
    }
    if (filteredCard.card.suit === euchreGame.trick.leadSuit || (euchreGame.trick.leadSuit === euchreGame.trump && filteredCard.card.suit === euchreGame.leftBauerTrumpSuit && filteredCard.card.rank === "Jack")) {
      if (euchreGame.trick.leadSuit === euchreGame.trump) {
        if (filteredCard.card.suit === euchreGame.trump || filteredCard.value === "LeftBauerTrump") {
          return true;
        }
      } else {
        if (filteredCard.card.suit === euchreGame.trick.leadSuit && filteredCard.value !== "LeftBauerTrump") {
          return true;
        }
      }
    }
  });
  const cardToPlay = playerPlayTrickAI(playableCardsWithValue, playerSeat);
  if (euchreGame.trick.cards.length === 0) {
    euchreGame.trick.leadSuit = cardToPlay.suit;
  }
  const cardIndex = playerData.hand.findIndex((card) => card.suit === cardToPlay.suit && card.rank === cardToPlay.rank);
  const newPlayerHand = [playerData.hand.slice(0, cardIndex), playerData.hand.slice(cardIndex + 1)].flat();

  let cardIdentifier: keyof typeof RankValues = cardToPlay.rank;
  const cardIsLeftBauer = cardToPlay.suit === euchreGame.leftBauerTrumpSuit && cardToPlay.rank === "Jack"
  if (cardToPlay.suit === euchreGame.trump || cardIsLeftBauer) {
    cardIdentifier = `${cardToPlay.rank}Trump`;
    if (cardIsLeftBauer) {
      cardIdentifier = "LeftBauerTrump";
    }
  } else if (cardToPlay.suit === euchreGame.trick.leadSuit) {
    cardIdentifier = cardToPlay.rank;
  } else {
    cardIdentifier = "None";
  }
  cardValueCounts.find((cardValueCount) => cardValueCount.card === cardIdentifier)!.playedCount++;
  euchreGame.trick.cards.push({ rank: cardToPlay.rank, suit: cardToPlay.suit, value: cardIdentifier, player: playerSeat });
  euchreGame.roundUnknownCards.splice(euchreGame.roundUnknownCards.findIndex((card) => card.suit === cardToPlay.suit && card.rank === cardToPlay.rank), 1);
  euchreGame.players.find((player) => player.seat === playerSeat)!.hand = newPlayerHand;
  euchreGame.turn = (euchreGame.turn! % 4) + 1;
  if (euchreGame.suitCallerIsAlone) {
    if (euchreGame.turn === ((euchreGame.suitCaller! + 1) % 4) + 1) {
      euchreGame.turn = (euchreGame.turn % 4) + 1;
    }
  }
}

const simulateTrick = () => {
  // console.log("player hands: ", euchreGame.players.map(player => player.hand));

  for (let i = 0; i < (euchreGame.suitCallerIsAlone ? 3 : 4); i++) {
    if (!euchreGame.suitCallerIsAlone || (euchreGame.suitCallerIsAlone && euchreGame.turn !== (((euchreGame.suitCaller! + 1) % 4) + 1))) {
      simulatePlayerPlayTrick(euchreGame.players.find((player) => player.seat === euchreGame.turn)!.seat);
    }
  }

  const winningCard = euchreGame.trick.cards.reduce((prev, curr) => {
    return RankValues[prev.value] > RankValues[curr.value] ? prev : curr;
  });

  // debug logs for hand logic
  /* console.log("lead suit: ", euchreGame.trick.cards[0].suit);
  console.log("trump suit: ", euchreGame.trump);
  console.log("played cards: ", euchreGame.trick.cards);
  console.log("winning card: ", winningCard); */

  const winningCardSeat = winningCard.player;
  cardValueCounts.find((cardValueCount) => cardValueCount.card === winningCard.value)!.wonCount++;
  euchreGame.roundScore[winningCardSeat === 1 || winningCardSeat === 3 ? 0 : 1]++;
  euchreGame.leadPlayer = winningCardSeat;
  euchreGame.turn = winningCardSeat;
  euchreGame.trick = { cards: [], leadSuit: null };
}

const simulateRound = (callerHandValueEstimate: number, callerHandSuitCount: number) => {
  while ((euchreGame.roundScore[0] + euchreGame.roundScore[1]) < 5) {
    simulateTrick();
  }
  let teamZeroPointsAdded = 0;
  let teamOnePointsAdded = 0;
  if (euchreGame.suitCaller === 1 || euchreGame.suitCaller === 3) {
    if (euchreGame.roundScore[0] === 5) {
      if (euchreGame.suitCallerIsAlone) {
        teamZeroPointsAdded == 4;
      } else {
        teamZeroPointsAdded == 2;
      }
    } else {
      if (euchreGame.roundScore[0] >= 3) {
        teamZeroPointsAdded++;
      } else {
        teamOnePointsAdded = 2;
      }
    }
  } else {
    if (euchreGame.roundScore[1] === 5) {
      if (euchreGame.suitCallerIsAlone) {
        teamOnePointsAdded == 4;
      } else {
        teamOnePointsAdded == 2;
      }
    } else {
      if (euchreGame.roundScore[1] >= 3) {
        teamOnePointsAdded++;
      } else {
        teamZeroPointsAdded = 2;
      }
    }
  }
  euchreGame.gameScore[0] += teamZeroPointsAdded;
  euchreGame.gameScore[1] += teamOnePointsAdded;
  if (euchreGame.suitCaller === euchreGame.dealer) {
    const relativePointsGained = euchreGame.dealer === 1 || euchreGame.dealer === 3 ? teamZeroPointsAdded - teamOnePointsAdded : teamOnePointsAdded - teamZeroPointsAdded;
    const suitHueristicIndex = Math.round(callerHandValueEstimate * 10);
    if (euchreGame.suitCallerIsAlone) {
      dealerMustPickTrumpAloneHeuristic[suitHueristicIndex] = (dealerMustPickTrumpAloneHeuristic[suitHueristicIndex] ?? 0) + relativePointsGained;
      dealermustPickTrumpAloneCounts[suitHueristicIndex] = (dealermustPickTrumpAloneCounts[suitHueristicIndex] ?? 0) + 1;
    } else if (callerHandSuitCount === 2) {
      dealerMustPickTrumpTwoSuitedHeuristic[suitHueristicIndex] = (dealerMustPickTrumpTwoSuitedHeuristic[suitHueristicIndex] ?? 0) + relativePointsGained;
      dealermustPickTrumpTwoSuitedCounts[suitHueristicIndex] = (dealermustPickTrumpTwoSuitedCounts[suitHueristicIndex] ?? 0) + 1;
    } else if (callerHandSuitCount === 3) {
      dealerMustPickTrumpThreeSuitedHeuristic[suitHueristicIndex] = (dealerMustPickTrumpThreeSuitedHeuristic[suitHueristicIndex] ?? 0) + relativePointsGained;
      dealermustPickTrumpThreeSuitedCounts[suitHueristicIndex] = (dealermustPickTrumpThreeSuitedCounts[suitHueristicIndex] ?? 0) + 1;
    } else if (callerHandSuitCount === 4) {
      dealerMustPickTrumpFourSuitedHeuristic[suitHueristicIndex] = (dealerMustPickTrumpFourSuitedHeuristic[suitHueristicIndex] ?? 0) + relativePointsGained;
      dealermustPickTrumpFourSuitedCounts[suitHueristicIndex] = (dealermustPickTrumpFourSuitedCounts[suitHueristicIndex] ?? 0) + 1;
    }
  }
  // reset round state
  euchreGame.roundUnknownCards = Suits.flatMap((suit) => Ranks.map((rank) => ({ suit, rank })));
  euchreGame.roundScore = [0, 0];
}

const isCardValueIncreasedByKnowledge = (hand: Card[], card: Card, proposedSuit: typeof Suits[number]) => {
  if (card.suit === proposedSuit) {
    if (hand.some((handCard) => handCard.suit === proposedSuit && handCard.rank === "Jack") && hand.some((handCard) => handCard.suit === getLeftBauerTrumpSuit(proposedSuit) && handCard.rank === "Jack")) {
      return true;
    }
  }
  if (card.suit === getLeftBauerTrumpSuit(proposedSuit) && card.rank === "Jack") {
    if (hand.some((handCard) => handCard.suit === euchreGame.trump && handCard.rank === "Jack")) {
      return true;
    }
  }
}

const estimateHandValue = (hand: Card[], proposedSuit: typeof Suits[number]) => {
  let handValue = 0;
  hand.forEach((card) => {
    let cardValue: keyof typeof RankValues = card.rank;
    if (card.suit === proposedSuit) {
      cardValue = `${card.rank}Trump`;
    }
    if (card.suit === getLeftBauerTrumpSuit(proposedSuit) && card.rank === "Jack") {
      cardValue = "LeftBauerTrump";
    }
    handValue += isCardValueIncreasedByKnowledge(hand, card, proposedSuit) ? 1 : EstimatedRankValues[cardValue];
  });
  return handValue;
}

const simulateTrumpSelection = () => {
  // dealer must pick trump
  const dealerHand = euchreGame.players.find((player) => player.seat === euchreGame.dealer)!.hand;
  const dealerHandValuesPerSuit = Suits.map((suit) => ({value: estimateHandValue(dealerHand, suit), suit}));
  const highestValueTrumpSuit = dealerHandValuesPerSuit.reduce((prev, curr) => {
    return prev.value > curr.value ? prev : curr;
  });
  euchreGame.trump = highestValueTrumpSuit.suit;
  setLeftBauerTrumpSuit();
  euchreGame.suitCaller = euchreGame.dealer;
  euchreGame.suitCallerIsAlone = Math.random() > 0.5;
  return {callerHandValueEstimate: highestValueTrumpSuit.value, callerSuitCount: Suits.map((suit) => dealerHand.filter((card) => card.suit === suit).length).filter((count) => count > 0).length};
}

const numberOfGames = 10000000;

for (let i = 0; i < numberOfGames; i++) {
  simulateDeal();
  const {callerHandValueEstimate, callerSuitCount } = simulateTrumpSelection();
  simulateRound(callerHandValueEstimate, callerSuitCount);
}

console.log("win counts when called alone per hand value estimate: ");
console.log(JSON.stringify(dealerMustPickTrumpAloneHeuristic.map((value, index) => `${index} ${value / dealermustPickTrumpAloneCounts[index]}`), null, 2));
console.log("win counts when called two suited per hand value estimate: ");
console.log(JSON.stringify(dealerMustPickTrumpTwoSuitedHeuristic.map((value, index) => `${index} ${value / dealermustPickTrumpTwoSuitedCounts[index]})`), null, 2));
console.log("win counts when called three suited per hand value estimate: ");
console.log(JSON.stringify(dealerMustPickTrumpThreeSuitedHeuristic.map((value, index) => `${index} ${value / dealermustPickTrumpThreeSuitedCounts[index]}`), null, 2));
console.log("win counts when called four suited per hand value estimate: ");
console.log(JSON.stringify(dealerMustPickTrumpFourSuitedHeuristic.map((value, index) => `${index} ${value / dealermustPickTrumpFourSuitedCounts[index]}`), null, 2));
