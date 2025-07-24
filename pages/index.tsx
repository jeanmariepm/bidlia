import { useEffect, useState } from 'react'
import PlayerHand from '@/components/PlayerHand'
import BiddingBox from '@/components/BiddingBox'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'
type Card = `${Suit}${Rank}`

type Hands = {
  North: Card[]
  East: Card[]
  South: Card[]
  West: Card[]
}

export default function Home() {
  const [hands, setHands] = useState<Hands | null>(null)
  const [gameState, setGameState] = useState<'idle' | 'bidding' | 'playing'>('idle')
  const [biddingHistory, setBiddingHistory] = useState<{ bid: string, alert?: string }[]>([])
  // Removed trick and setTrick
  const [vulnerability, setVulnerability] = useState<string>("None")
  const [dealer, setDealer] = useState<number>(0)
  const [isAIThinking, setIsAIThinking] = useState(false)

  const suits: Suit[] = ['♠', '♥', '♦', '♣']
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
  const players = ['North', 'East', 'South', 'West']
  // Only allow these vulnerability options:
  const vulnerabilities = ["None", "NS", "EW", "Both"]

  // Convert hand from Card[] to bridge notation (e.g., "Kxx.KQx.xx.Axxxx")
  const formatHandForAI = (hand: Card[]): string => {
    const suitGroups = {
      '♠': [] as string[],
      '♥': [] as string[],
      '♦': [] as string[],
      '♣': [] as string[]
    }
    
    // Group cards by suit
    hand.forEach(card => {
      const suit = card[0] as Suit
      const rank = card.slice(1)
      suitGroups[suit].push(rank)
    })
    
    // Sort each suit by rank order (A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2)
    const rankOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
    Object.keys(suitGroups).forEach(suit => {
      suitGroups[suit as Suit].sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b))
    })
    
    // Convert to bridge notation: Spades.Hearts.Diamonds.Clubs
    const spades = suitGroups['♠'].length > 0 ? suitGroups['♠'].join('') : 'x'
    const hearts = suitGroups['♥'].length > 0 ? suitGroups['♥'].join('') : 'x'
    const diamonds = suitGroups['♦'].length > 0 ? suitGroups['♦'].join('') : 'x'
    const clubs = suitGroups['♣'].length > 0 ? suitGroups['♣'].join('') : 'x'
    
    return `${spades}.${hearts}.${diamonds}.${clubs}`
  }

  const generateDeck = (): Card[] => {
    const deck: Card[] = []
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(`${suit}${rank}` as Card)
      }
    }
    return deck
  }

  const shuffle = <T,>(array: T[]): T[] => {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const dealCards = () => {
    const deck = shuffle(generateDeck())
    setHands({
      North: deck.slice(0, 13),
      East: deck.slice(13, 26),
      South: deck.slice(26, 39),
      West: deck.slice(39, 52),
    })
    setGameState('bidding')
    setBiddingHistory([])
    setIsAIThinking(false) // Reset AI thinking flag
    // Randomly pick dealer and vulnerability
    const randomDealer = Math.floor(Math.random() * 4)
    setDealer(randomDealer)
    setVulnerability(vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)])
  }

  const callPythonAI = async (player: string, vulnerability: string, biddingHistory: { bid: string, alert?: string }[], playerHand: Card[]) => {
    if (isAIThinking) return // Prevent multiple AI calls
    
    setIsAIThinking(true)
    try {
      console.log(`Calling AI for ${player}...`)
      const formattedHand = formatHandForAI(playerHand)
      const auction = biddingHistory.map(b => b.bid).filter(bid => !!bid && typeof bid === 'string');
      const response = await fetch('/api/ai-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player,
          vulnerability,
          biddingHistory: auction,
          hand: formattedHand,
          dealer // <--- include dealer in the payload
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('AI API Response:', data);
        console.log('AI Response:', data)
        console.log(`AI ${player} bids: ${data.bid}`)
        // Auto-bid the AI's response
        setTimeout(() => {
          console.log(`Processing AI bid: ${data.bid}`)
          handleBidFromAI(data.bid, data); // Use a separate function for AI bids
        }, 1000) // 1 second delay to simulate thinking
      } else {
        console.error('AI Error:', data.error)
        setIsAIThinking(false)
        alert(`AI Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to call AI:', error)
      setIsAIThinking(false)
      alert(`Failed to call AI: ${error}`)
    }
  }

  const handleBidFromAI = (bid: string, apiResponse?: any) => {
    const updated = [...biddingHistory, { bid, apiResponse }];
    setBiddingHistory(updated);
    setIsAIThinking(false);
    if (biddingEnded(updated)) {
      setGameState('playing');
    } else {
      const nextBidderIndex = (dealer + updated.length) % 4;
      if (nextBidderIndex !== 2 && hands) {
        const nextPlayer = players[nextBidderIndex];
        const nextPlayerHand = hands[nextPlayer as keyof Hands];
        setPendingAICall({ player: nextPlayer, vulnerability, biddingHistory: updated, hand: nextPlayerHand });
      }
    }
  };

  const handleBid = (bid: string) => {
    let normalizedBid = bid;
    if (bid === 'Pass') normalizedBid = 'P';
    if (bid === 'Double') normalizedBid = 'X';
    if (bid === 'Redouble') normalizedBid = 'XX';
    const updated = [...biddingHistory, { bid: normalizedBid, apiResponse: { bid: normalizedBid } }];
    setBiddingHistory(updated);
    if (biddingEnded(updated)) {
      setGameState('playing');
    } else {
      const nextBidderIndex = (dealer + updated.length) % 4;
      if (nextBidderIndex !== 2 && hands) {
        const nextPlayer = players[nextBidderIndex];
        const nextPlayerHand = hands[nextPlayer as keyof Hands];
        setPendingAICall({ player: nextPlayer, vulnerability, biddingHistory: updated, hand: nextPlayerHand });
      }
    }
  };

  // Helper to check if a bid is a pass (either 'Pass' or 'P', case-insensitive)
  const isPass = (bid: string | undefined | null) => {
    if (!bid) return false;
    return bid.toLowerCase() === 'pass' || bid.toLowerCase() === 'p';
  };

  const biddingEnded = (bids: { bid: string, alert?: string }[]) => {
    // Case 1: Four consecutive passes (all pass out)
    if (bids.length >= 4 && bids.slice(-4).every(bidObj => isPass(bidObj.bid))) {
      return true
    }
    // Case 2: Three consecutive passes after any bid
    if (bids.length >= 4) {
      const lastThree = bids.slice(-3)
      if (lastThree.every(bidObj => isPass(bidObj.bid))) {
        // Check if there's at least one non-pass bid before these three passes
        const beforeLastThree = bids.slice(0, -3)
        if (beforeLastThree.some(bidObj => !isPass(bidObj.bid))) {
          return true
        }
      }
    }
    return false
  }

  // State to trigger AI call after state updates
  const [pendingAICall, setPendingAICall] = useState<{
    player: string
    vulnerability: string
    biddingHistory: { bid: string, alert?: string }[]
    hand: Card[]
  } | null>(null)

  // useEffect to handle pending AI call
  useEffect(() => {
    if (
      pendingAICall &&
      !isAIThinking &&
      !biddingEnded(pendingAICall.biddingHistory) // Prevent API call if bidding is over
    ) {
      callPythonAI(
        pendingAICall.player,
        pendingAICall.vulnerability,
        pendingAICall.biddingHistory,
        pendingAICall.hand
      )
      setPendingAICall(null)
    }
  }, [pendingAICall, isAIThinking])

  // useEffect to trigger initial AI call when bidding starts
  useEffect(() => {
    if (
      gameState === 'bidding' &&
      biddingHistory.length === 0 &&
      dealer !== 2 && // 2 is South (0=North, 1=East, 2=South, 3=West)
      !isAIThinking &&
      hands
    ) {
      const dealerPlayer = players[dealer]
      const dealerHand = hands[dealerPlayer as keyof Hands]
      setPendingAICall({ player: dealerPlayer, vulnerability, biddingHistory: [], hand: dealerHand })
    }
  }, [gameState, dealer, biddingHistory.length, isAIThinking, vulnerability, hands])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 30%, #2e7d32 60%, #145a32 100%)', // darker green
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        position: 'relative',
      }}
    >
      <h1 style={{ color: 'white', marginBottom: 8, letterSpacing: 2, textShadow: '1px 1px 4px #222' }}>Bridge Table</h1>
      {/* Table Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: '1fr',
          gridTemplateColumns: '120px 1fr 120px',
          gap: 0,
          background: 'linear-gradient(135deg, #e8f5e9 60%, #b2dfdb 100%)', // lighter shade for table
          borderRadius: 16,
          boxShadow: '0 4px 24px #2228',
          padding: 24,
          marginBottom: 32,
          minHeight: 400,
          height: 480,
        }}
      >
        {/* Center column: flex column for North, BiddingBox, South */}
        <div style={{ gridColumn: 2, gridRow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* North hand row (only after auction is over) */}
          {gameState !== 'bidding' && (
            <div style={{ marginBottom: 8 }}>
              {hands && <PlayerHand player="North" hand={hands.North} />}
            </div>
          )}
          {/* Bidding Box Row (centered) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 16 }}>
            <button
              onClick={dealCards}
              style={{
                padding: '12px 24px',
                fontSize: '18px',
                backgroundColor: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px #2224',
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              Deal
            </button>
            <BiddingBox
              biddingHistory={biddingHistory.map(b => b.bid)}
              biddingAlerts={biddingHistory.map(b => b.alert)}
              biddingApiResponses={biddingHistory.map(b => b.apiResponse)}
              currentBidderIndex={gameState === 'bidding' ? (dealer + biddingHistory.length) % 4 : -1}
              dealerIndex={dealer}
              vulnerability={vulnerability}
              onBid={handleBid}
            />
          </div>
          {/* South (inside table) */}
          <div style={{ marginTop: 8 }}>
            {hands && <PlayerHand player="South" hand={hands.South} />}
          </div>
        </div>
      </div>
    </main>
  )
}
