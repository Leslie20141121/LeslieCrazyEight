import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  User, 
  Cpu, 
  Layers, 
  Info,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Suit, 
  Rank, 
  CardData, 
  GameStatus, 
  Turn, 
  SUITS, 
  RANKS, 
  SUIT_SYMBOLS, 
  SUIT_COLORS 
} from './types';

// --- Utilities ---
const createDeck = (): CardData[] => {
  const deck: CardData[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        isFaceUp: false,
      });
    });
  });
  return shuffle(deck);
};

const shuffle = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Components ---

interface PlayingCardProps {
  card: CardData;
  onClick?: () => void;
  isPlayable?: boolean;
  isAI?: boolean;
  index?: number;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ 
  card, 
  onClick, 
  isPlayable = false, 
  isAI = false,
  index = 0
}) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  return (
    <motion.div
      layout
      initial={{ scale: 0, rotateY: 180 }}
      animate={{ 
        scale: 1, 
        rotateY: card.isFaceUp ? 0 : 180,
        y: isPlayable ? -10 : 0
      }}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={isPlayable ? onClick : undefined}
      className={`
        relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl shadow-lg cursor-pointer select-none
        flex items-center justify-center border-2
        ${card.isFaceUp ? 'bg-white border-slate-200' : 'bg-indigo-700 border-indigo-400'}
        ${isPlayable ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}
        transition-shadow duration-200
      `}
      style={{
        transformStyle: 'preserve-3d',
        zIndex: index
      }}
    >
      {card.isFaceUp ? (
        <div className="w-full h-full p-2 flex flex-col justify-between">
          <div className={`flex flex-col items-start leading-none ${SUIT_COLORS[card.suit]}`}>
            <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
            <span className="text-sm sm:text-base">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
          <div className={`text-3xl sm:text-4xl self-center ${SUIT_COLORS[card.suit]}`}>
            {SUIT_SYMBOLS[card.suit]}
          </div>
          <div className={`flex flex-col items-end leading-none rotate-180 ${SUIT_COLORS[card.suit]}`}>
            <span className="text-lg sm:text-xl font-bold">{card.rank}</span>
            <span className="text-sm sm:text-base">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-16 sm:w-16 sm:h-24 border-2 border-white/20 rounded-lg flex items-center justify-center">
            <Layers className="text-white/30 w-8 h-8" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [deck, setDeck] = useState<CardData[]>([]);
  const [playerHand, setPlayerHand] = useState<CardData[]>([]);
  const [aiHand, setAiHand] = useState<CardData[]>([]);
  const [discardPile, setDiscardPile] = useState<CardData[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Turn>('player');
  const [status, setStatus] = useState<GameStatus>('waiting');
  const [activeSuit, setActiveSuit] = useState<Suit | null>(null);
  const [winner, setWinner] = useState<Turn | null>(null);
  const [message, setMessage] = useState<string>("欢迎来到 Leslie 疯狂八点！");

  const topDiscard = discardPile[discardPile.length - 1];

  // --- Game Logic ---

  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const pHand = fullDeck.splice(0, 8).map(c => ({ ...c, isFaceUp: true }));
    const aHand = fullDeck.splice(0, 8).map(c => ({ ...c, isFaceUp: false }));
    const firstDiscard = fullDeck.pop()!;
    
    setDeck(fullDeck);
    setPlayerHand(pHand);
    setAiHand(aHand);
    setDiscardPile([{ ...firstDiscard, isFaceUp: true }]);
    setActiveSuit(firstDiscard.suit);
    setCurrentTurn('player');
    setStatus('playing');
    setWinner(null);
    setMessage("轮到你了！请出相同花色或点数的牌。");
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const canPlayCard = (card: CardData) => {
    if (!topDiscard) return false;
    if (card.rank === '8') return true;
    return card.suit === activeSuit || card.rank === topDiscard.rank;
  };

  const playCard = (card: CardData, turn: Turn) => {
    if (status !== 'playing') return;

    const isEight = card.rank === '8';
    
    if (turn === 'player') {
      setPlayerHand(prev => prev.filter(c => c.id !== card.id));
      setDiscardPile(prev => [...prev, { ...card, isFaceUp: true }]);
      
      if (isEight) {
        setStatus('pickingSuit');
        setMessage("你出了 8！请选择一个新的花色。");
      } else {
        setActiveSuit(card.suit);
        checkWin('player', playerHand.length - 1);
      }
    } else {
      setAiHand(prev => prev.filter(c => c.id !== card.id));
      setDiscardPile(prev => [...prev, { ...card, isFaceUp: true }]);
      
      if (isEight) {
        // AI picks suit (most frequent in hand)
        const suitsInHand = aiHand.filter(c => c.id !== card.id).map(c => c.suit);
        const counts = suitsInHand.reduce((acc, s) => {
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {} as Record<Suit, number>);
        
        const bestSuit = (Object.keys(counts) as Suit[]).sort((a, b) => counts[b] - counts[a])[0] || SUITS[Math.floor(Math.random() * 4)];
        setActiveSuit(bestSuit);
        const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
        setMessage(`AI 出了 8 并选择了 ${suitNames[bestSuit]}！`);
        checkWin('ai', aiHand.length - 1);
      } else {
        setActiveSuit(card.suit);
        checkWin('ai', aiHand.length - 1);
      }
    }
  };

  const checkWin = (turn: Turn, handCount: number) => {
    if (handCount === 0) {
      setWinner(turn);
      setStatus('gameOver');
      if (turn === 'player') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        setMessage("恭喜！你赢了！");
      } else {
        setMessage("AI 赢了！下次再接再厉。");
      }
    } else {
      setCurrentTurn(turn === 'player' ? 'ai' : 'player');
      if (turn === 'player') setMessage("AI 正在思考...");
      else setMessage("轮到你了！");
    }
  };

  const drawCard = (turn: Turn) => {
    if (deck.length === 0) {
      setMessage("牌堆已空！跳过此回合。");
      setCurrentTurn(turn === 'player' ? 'ai' : 'player');
      return;
    }

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);

    if (turn === 'player') {
      setPlayerHand(prev => [...prev, { ...card, isFaceUp: true }]);
      setCurrentTurn('ai');
      setMessage("你摸了一张牌。轮到 AI 了。");
    } else {
      setAiHand(prev => [...prev, { ...card, isFaceUp: false }]);
      setCurrentTurn('player');
      setMessage("AI 摸了一张牌。轮到你了。");
    }
  };

  // --- AI Logic ---
  useEffect(() => {
    if (currentTurn === 'ai' && status === 'playing' && !winner) {
      const timer = setTimeout(() => {
        const playableCards = aiHand.filter(canPlayCard);
        
        if (playableCards.length > 0) {
          // AI Strategy: Play non-8 cards first
          const nonEight = playableCards.find(c => c.rank !== '8');
          if (nonEight) {
            playCard(nonEight, 'ai');
          } else {
            playCard(playableCards[0], 'ai');
          }
        } else {
          drawCard('ai');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, aiHand, status, winner]);

  const handleSuitPick = (suit: Suit) => {
    setActiveSuit(suit);
    setStatus('playing');
    checkWin('player', playerHand.length);
  };

  const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };

  return (
    <div className="min-h-screen bg-emerald-900 text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Layers className="text-emerald-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Leslie 疯狂八点</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-mono">剩余 {deck.length} 张牌</span>
          </div>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="重新开始"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col p-4 sm:p-8 gap-4 overflow-y-auto">
        
        {/* AI Hand */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white/60 mb-1">
            <Cpu className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">对手 ({aiHand.length})</span>
          </div>
          <div className="flex justify-center -space-x-10 sm:-space-x-14 h-28 sm:h-36">
            {aiHand.map((card, i) => (
              <PlayingCard key={card.id} card={card} isAI index={i} />
            ))}
          </div>
        </div>

        {/* Center Area: Deck and Discard */}
        <div className="flex flex-row items-center justify-center gap-8 sm:gap-16 my-4">
          {/* Deck */}
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => currentTurn === 'player' && status === 'playing' && drawCard('player')}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl shadow-2xl border-2 border-indigo-400 bg-indigo-700
                flex items-center justify-center cursor-pointer group
                ${currentTurn === 'player' && status === 'playing' ? 'hover:-translate-y-1 active:translate-y-0' : 'opacity-50 cursor-not-allowed'}
                transition-all
              `}
            >
              <div className="w-12 h-16 sm:w-16 sm:h-24 border-2 border-white/20 rounded-lg flex items-center justify-center">
                <Layers className="text-white/30 w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              {deck.length > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-emerald-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {deck.length}
                </div>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">摸牌堆</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-20 h-28 sm:w-24 sm:h-36">
              <AnimatePresence mode="popLayout">
                {discardPile.slice(-3).map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.8, opacity: 0, rotate: Math.random() * 20 - 10 }}
                    animate={{ scale: 1, opacity: 1, x: i * 2, y: i * 2 }}
                    className="absolute inset-0"
                  >
                    <PlayingCard card={card} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">弃牌堆</span>
              {activeSuit && (
                <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 bg-white/10 rounded-full border border-white/10 ${SUIT_COLORS[activeSuit]}`}>
                  <span className="text-sm">{SUIT_SYMBOLS[activeSuit]}</span>
                  <span className="text-[10px] font-bold uppercase">{suitNames[activeSuit]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Hand */}
        <div className="flex flex-col items-center gap-4 mt-auto">
          <div className="flex items-center gap-2 text-white/60">
            <User className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">你的手牌 ({playerHand.length})</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl px-4 pb-8">
            {playerHand.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                index={i}
                isPlayable={currentTurn === 'player' && status === 'playing' && canPlayCard(card)}
                onClick={() => playCard(card, 'player')}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${currentTurn === 'player' ? 'bg-yellow-400' : 'bg-white/20'}`} />
          <p className="text-sm sm:text-base font-medium text-white/80">{message}</p>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {status === 'pickingSuit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2">选择新花色</h2>
              <p className="text-white/60 mb-8">请为下一位玩家指定花色。</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleSuitPick(suit)}
                    className={`
                      flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-white/5 
                      hover:bg-white/5 hover:border-white/20 transition-all group
                      ${SUIT_COLORS[suit]}
                    `}
                  >
                    <span className="text-4xl group-hover:scale-125 transition-transform">{SUIT_SYMBOLS[suit]}</span>
                    <span className="text-xs font-bold uppercase tracking-widest">{suitNames[suit]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {status === 'gameOver' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 p-10 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${winner === 'player' ? 'bg-yellow-500 text-emerald-900' : 'bg-slate-800 text-white/40'}`}>
                <Trophy className="w-10 h-10" />
              </div>
              
              <h2 className="text-3xl font-bold mb-2">
                {winner === 'player' ? '胜利！' : '失败'}
              </h2>
              <p className="text-white/60 mb-8">
                {winner === 'player' ? '你率先出完了所有的牌！' : 'AI 赢得了比赛。'}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                再玩一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Overlay (Optional/Toggleable) */}
      <div className="fixed bottom-20 right-4 z-40">
        <button 
          className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors group"
          onClick={() => setMessage("匹配花色或点数。8 是万能牌！")}
        >
          <Info className="w-5 h-5 text-white/60 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
