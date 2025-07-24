import Image from 'next/image'

type Props = {
  player: 'North' | 'South' | 'East' | 'West'
  hand?: string[]
}

// Sort and group hand into suits
function sortAndGroupHand(hand: string[]): Record<'♠' | '♥' | '♦' | '♣', string[]> {
  const suitOrder = ['♠', '♥', '♦', '♣'] as const
  const rankOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']

  const grouped: Record<'♠' | '♥' | '♦' | '♣', string[]> = {
    '♠': [],
    '♥': [],
    '♦': [],
    '♣': [],
  }

  for (const card of hand) {
    if (card.length < 2 || !grouped[card[0] as keyof typeof grouped]) {
      console.warn(`Invalid card format: "${card}"`)
      continue
    }
    const suit = card[0] as keyof typeof grouped
    grouped[suit].push(card)
  }

  for (const suit of suitOrder) {
    grouped[suit].sort((a, b) => {
      const rankA = a.slice(1)
      const rankB = b.slice(1)
      return rankOrder.indexOf(rankA) - rankOrder.indexOf(rankB)
    })
  }

  return grouped
}

// Map card strings like "♠A" to filenames like "ace_of_spades.png"
function convertCardToFilename(card: string): string {
  const suitMap: Record<string, string> = {
    '♠': 'spades',
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs',
  }

  const rankMap: Record<string, string> = {
    'A': 'ace',
    'K': 'king',
    'Q': 'queen',
    'J': 'jack',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2',
  }

  if (card.length < 2 || !suitMap[card[0]] || !rankMap[card.slice(1)]) {
    console.warn(`Invalid card: "${card}"`)
    return '/cards/back.png'
  }

  const suit = suitMap[card[0]]
  const rank = rankMap[card.slice(1)]

  const filename = `/cards/${rank}_of_${suit}.png`
  console.log(`Returning filename: "${filename}"`)
  return filename}

export default function PlayerHand({ player, hand }: Props) {
  if (!hand) return null

  if (player === 'South' || player === 'North') {
    // Group and sort hand by suit and value
    const grouped = sortAndGroupHand(hand);
    const suitOrder: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    // Bridge Table canvas width: 180px (center) + 120px (left) + 120px (right) + 48px padding = 468px
    // 13 cards, 4px gap between each, so total gap = 12*4px = 48px
    // Card width = (468px - 48px) / 13 = 32.3px
    return (
      <div style={{ display: 'flex', flexDirection: 'row', gap: 4, margin: '12px 0', justifyContent: 'center', width: 468 }}>
        {suitOrder.map((suit) => (
          grouped[suit].map((card, i) => {
            const value = card.slice(1);
            const color = suit === '♥' || suit === '♦' ? '#d32f2f' : '#222';
            return (
              <div
                key={card}
                style={{
                  width: 'calc((468px - 48px) / 13)',
                  minWidth: 0,
                  height: 64,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'white',
                  borderRadius: 6,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  position: 'relative',
                  fontSize: 22,
                  fontWeight: 700,
                  color,
                  border: '1.5px solid #1976d2',
                  letterSpacing: 1,
                  fontFamily: 'Segoe UI, Arial, sans-serif',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
                <span style={{ fontSize: 26, color, marginTop: 2 }}>{suit}</span>
              </div>
            );
          })
        ))}
      </div>
    )
  }

  const grouped = sortAndGroupHand(hand)

  return (
    <div style={{ marginBottom: 20 }}>
      <h3>{player}</h3>
      {(['♠', '♥', '♦', '♣'] as const).map((suit) => (
        <div key={suit} style={{ marginBottom: -80 }}>
          <strong>{suit}</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {grouped[suit].map((card, i) => (
              <div         
                key={i}
                style={{
                  position: 'relative',
                  // left:             `${-i * 25}%`, // Offset each card by 25% of the width
                  zIndex: i, // Ensure cards stack correctly
                  width: 60,
                  height: 90,
              }}
              >
                <Image
                  src={convertCardToFilename(card)}
                  alt={card}
                  fill
                  sizes="60px"
                  style={{
                    objectFit: 'contain',
                    backgroundColor: 'white', // Adds a white background to the container
                    borderRadius: 4,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
