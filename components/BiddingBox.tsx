import React, { useState } from "react";
import BidInfoPopup from './BidInfoPopup';

type BiddingBoxProps = {
  biddingHistory: string[];
  currentBidderIndex: number;
  dealerIndex: number;
  vulnerability: string;
  onBid: (bid: string) => void;
  biddingApiResponses?: any[];
};

const BiddingBox: React.FC<BiddingBoxProps> = ({
  biddingHistory,
  currentBidderIndex,
  dealerIndex,
  vulnerability,
  onBid,
  biddingApiResponses = [],
}) => {
  const players = ["North", "East", "South", "West"];
  const numbers = ["1", "2", "3", "4", "5", "6", "7"];
  const suits = ["C", "D", "H", "S", "NT"];
  const actions = ["Pass", "Double", "Redouble"];

  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [apiResponseToShow, setApiResponseToShow] = useState<any | null>(null);


  // Determine the background color for vulnerability
  const getHeaderStyle = (player: string) => {
    // Vulnerability logic
    if (
      (vulnerability === "Both") ||
      (vulnerability === "NS" && (player === "North" || player === "South")) ||
      (vulnerability === "EW" && (player === "East" || player === "West"))
    ) {
      return { backgroundColor: "red", color: "white" }; // Vulnerable
    }
    return { backgroundColor: "green", color: "white" }; // Not vulnerable
  };

  // Highlight the current bidder in the last (current) row only
  const getCellStyle = ( colIdx: number, isLastRow: boolean) => {
    // Only highlight if we're in active bidding mode (not read-only)
    if (isLastRow && colIdx === currentBidderIndex && currentBidderIndex !== -1) {
      return { backgroundColor: "#ffeb3b" }; // Highlight with yellow
    }
    return {};
  };

  // Format the bidding history into rows and ensure at least one row
  // Always display hyphens for cells before the dealer on the first line
  let paddedHistory: string[] = [];
  paddedHistory = Array(dealerIndex).fill("").concat(biddingHistory);

  const formattedBiddingHistory = [];
  const totalRows = Math.max(1, Math.ceil(paddedHistory.length / 4));
  for (let i = 0; i < totalRows; i++) {
    const row = [];
    for (let j = 0; j < 4; j++) {
      const bidIndex = i * 4 + j;
      // On the first row, show hyphens for cells before the dealer if empty
      if (i === 0 && j < dealerIndex) {
        row.push("—");
      } else {
        row.push(paddedHistory[bidIndex] || "");
      }
    }
    formattedBiddingHistory.push(row);
  }
  
  // Only show a line for the current round if we're in active bidding mode
  if (
    currentBidderIndex !== -1 && // Not read-only mode
    (formattedBiddingHistory.length === 0 ||
    (paddedHistory.length % 4 === 0 && paddedHistory.length !== 0))
  ) {
    formattedBiddingHistory.push(Array(4).fill(""));
  }

  // Helper: suit order for comparison
  const suitOrder: Record<string, number> = { "C": 0, "D": 1, "H": 2, "S": 3, "NT": 4 };

  // Helper: get a bid's index in bridge order
  const getBidIndex = (number: string, suit: string) => {
    return (parseInt(number, 10) - 1) * 5 + suitOrder[suit];
  };

  // Validate if a bid is valid
  const isValidBid = (number: string, suit: string) => {
    const lastBid = biddingHistory
      .filter((bid) => !["P", "X", "XX"].includes(bid))
      .pop();
    if (!lastBid) return true; // Any bid is valid if no previous bid exists
    // Parse last bid's number and suit
    let lastNumber: string, lastSuit: string;
    if (lastBid.endsWith("NT")) {
      lastNumber = lastBid.slice(0, -2);
      lastSuit = "NT";
    } else {
      lastNumber = lastBid.slice(0, -1);
      lastSuit = lastBid.slice(-1);
    }
    const lastIndex = getBidIndex(lastNumber, lastSuit);
    const thisIndex = getBidIndex(number, suit);
    return thisIndex > lastIndex;
  };

  // Validate if "Double" is valid
  const isDoubleValid = () => {
    // Traverse backwards to find the last non-Pass bid
    let lastIdx = biddingHistory.length - 1;
    while (lastIdx >= 0 && biddingHistory[lastIdx] === "P") {
      lastIdx--;
    }
    if (lastIdx < 0) return false;
    const lastBid = biddingHistory[lastIdx];
    // After a Redouble or Double, Double is never valid until a new suit bid is made
    if (lastBid === "XX" || lastBid === "X") return false;
    // Only allow Double if the last non-Pass bid is a suit bid (not Double/Redouble)
    // and there are no intervening bids other than Pass
    if (
      lastBid === "X" ||
      lastBid === "XX"
    ) {
      return false;
    }
    // Check for intervening non-Pass bids after the last suit bid
    for (let i = lastIdx + 1; i < biddingHistory.length; i++) {
      if (biddingHistory[i] !== "P") {
        return false;
      }
    }
    // The player who made the last suit bid
    const lastBidder = lastIdx % 4;
    // Current bidder
    const currentBidder = biddingHistory.length % 4;
    // Only allow Double if last suit bid was by an opponent (not same team)
    // North/South vs East/West: even vs odd
    const isOpponent =
      (lastBidder % 2 === 0 && currentBidder % 2 === 1) ||
      (lastBidder % 2 === 1 && currentBidder % 2 === 0);
    return isOpponent;
  };

  // Validate if "Redouble" is valid
  const isRedoubleValid = () => {
    // Find the last non-Pass bid
    let lastNonPassIndex = -1;
    for (let i = biddingHistory.length - 1; i >= 0; i--) {
      if (biddingHistory[i] !== "P") {
        lastNonPassIndex = i;
        break;
      }
    }
    if (lastNonPassIndex === -1) return false;
    // The last non-Pass bid must be "X"
    if (biddingHistory[lastNonPassIndex] !== "X") return false;
    // After a Redouble, Redouble is never valid until a new suit bid is made
    // (Redouble cannot follow Redouble)
    if (biddingHistory[lastNonPassIndex] === "XX") return false;
    // The player who made the last Double
    const lastDoubler = lastNonPassIndex % 4;
    // Current bidder
    const currentBidder = biddingHistory.length % 4;
    // Only allow Redouble if last Double was by an opponent (not same team)
    // North/South vs East/West: even vs odd
    const isOpponent =
      (lastDoubler % 2 === 0 && currentBidder % 2 === 1) ||
      (lastDoubler % 2 === 1 && currentBidder % 2 === 0);
    return isOpponent;
  };

  // Helper: check if last non-Pass bid was Redouble
  const lastNonPassBid = biddingHistory.slice().reverse().find(bid => bid !== "P");
  const afterRedouble = lastNonPassBid === "XX";

  // Suit info rendering for popup
  let suitInfoDisplay: React.ReactNode = 'No suit info available.';
  if (apiResponseToShow && typeof apiResponseToShow === 'object') {
    const suits = Array.isArray(apiResponseToShow.suits)
      ? apiResponseToShow.suits
      : apiResponseToShow.alert && Array.isArray(apiResponseToShow.alert.suits)
        ? apiResponseToShow.alert.suits
        : [];
    if (suits.length > 0) {
      suitInfoDisplay = suits
        .map((s: { suit?: string; suit_length_info?: string; alert?: { variables?: { suit?: string; suit_length_info?: string } } }, idx: number) => {
          const suitRaw = s.suit ?? s.alert?.variables?.suit;
          const suitLength = s.suit_length_info ?? s.alert?.variables?.suit_length_info;
          let icon = '';
          let color = '';
          switch (suitRaw) {
            case 'C': icon = '♣'; color = '#222'; break;
            case 'S': icon = '♠'; color = '#222'; break;
            case 'D': icon = '♦'; color = '#d32f2f'; break;
            case 'H': icon = '♥'; color = '#d32f2f'; break;
            case 'NT': icon = 'NT'; color = '#1976d2'; break;
            default: icon = suitRaw || ''; color = '#222'; break;
          }
          if (!icon && !suitLength) return null;
          return (
            <span key={String(suitRaw) + String(suitLength) + idx} style={{ color, fontWeight: 700, marginRight: 4 }}>
              {suitLength ? suitLength + ' ' : ''}{icon}
            </span>
          );
        })
        .filter((x: React.ReactNode) => x !== null)
        .reduce((prev: React.ReactNode[], curr: React.ReactNode, idx: number) => prev.length === 0 ? [curr] : [...prev, <span key={'comma'+idx} style={{color:'#888'}}>, </span>, curr], [] as React.ReactNode[]);
      if (!suitInfoDisplay || (Array.isArray(suitInfoDisplay) && suitInfoDisplay.length === 0)) {
        suitInfoDisplay = 'No suit info available.';
      }
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 10,
      boxShadow: '0 2px 8px #2222',
      padding: 10,
      minWidth: 220,
      maxWidth: 270,
      margin: '0 auto',
      // border: '2px solid #1976d2', // removed border
    }}>
      {/* Debug info */}
      {/* <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
        Debug: dealerIndex = {dealerIndex}
      </div> */}
      <table style={{ margin: '6px 0', borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {players.map((player) => (
              <th
                key={player}
                style={{
                  ...getHeaderStyle(player),
                  padding: 2,
                  border: '1px solid #ccc',
                  fontSize: 15, // increased
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                {player}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Render auction rows */}
          {(() => {
            let runningBidIndex = 0;
            return formattedBiddingHistory.map((row, i) => (
              <tr key={i} style={{ height: 26 }}>
                {row.map((bid, j) => {
                  const displayBid = fotmatBidForDisplay(bid);
                  const isLastRow = i === formattedBiddingHistory.length - 1;
                  const isCellWithBid = bid.trim() !== '' && bid !== '-' && bid !== '—';
                  let bidIdx = -1;
                  if (isCellWithBid) {
                    bidIdx = runningBidIndex;
                    runningBidIndex++;
                  }
                  return (
                    <td
                      key={j}
                      style={{
                        ...getCellStyle(j, isLastRow),
                        padding: 2,
                        border: '1px solid #ccc',
                        minWidth: 32,
                        textAlign: 'center',
                        height: 26,
                        fontWeight: 600,
                        fontSize: 15, // increased
                        color:
                          displayBid === 'X' ? '#d32f2f' :
                          displayBid === 'XX' ? '#1976d2' :
                          displayBid === 'P' ? '#888' :
                          '#222',
                        background:
                          displayBid === 'X' ? '#ffd6d6' :
                          displayBid === 'XX' ? '#d6e4ff' :
                          'transparent',
                        cursor: isCellWithBid ? 'pointer' : 'default',
                      }}
                      onClick={isCellWithBid ? () => {
                        if (bidIdx < 0) return;
                        if (biddingApiResponses[bidIdx]) {
                          setApiResponseToShow(biddingApiResponses[bidIdx]);
                        } else if (bid) {
                          setApiResponseToShow({ bid });
                        }
                      } : undefined}
                      title={''}
                    >
                      {displayBid}
                    </td>
                  );
                })}
              </tr>
            ));
          })()}
        </tbody>
      </table>
      {/* Only show bidding controls if it's South's turn (currentBidderIndex === 2) */}
      {currentBidderIndex === 2 && (
        <div style={{ marginBottom: 2, marginTop: 6 }}>
          {/* Numbers row */}
          <div style={{ marginBottom: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {numbers.map((num) => {
              // Only enable the number if at least one suit at this level is a valid bid
              const suitEnabled = suits.some((suit) => isValidBid(num, suit));
              const available = suitEnabled;
              return (
                <button
                  key={num}
                  style={{
                    marginRight: 0,
                    background: selectedNumber === num ? '#1976d2' : available ? '#e3f2fd' : '#f8d7da',
                    color: selectedNumber === num ? 'white' : available ? '#1976d2' : '#a94442',
                    border: '1px solid #1976d2',
                    borderRadius: 5,
                    padding: '3px 8px', // increased
                    fontSize: 15, // increased
                    minWidth: 24,
                    minHeight: 24,
                    opacity: available ? 1 : 0.6,
                    cursor: available ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    boxShadow: selectedNumber === num ? '0 1px 4px #1976d288' : undefined,
                    transition: 'background 0.2s',
                  }}
                  onClick={() => {
                    if (available) {
                      setSelectedNumber(num);
                      setSelectedSuit(null);
                      setSelectedAction(null);
                    }
                  }}
                  disabled={!available}
                >
                  {num}
                </button>
              );
            })}
          </div>
          {/* Suits row */}
          <div style={{ marginBottom: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {suits.map((suit) => {
              // Only enable the suit if the selected number+suit is a valid bid
              let available = false;
              if (selectedNumber) {
                available = isValidBid(selectedNumber, suit);
              }
              return (
                <button
                  key={suit}
                  style={{
                    marginRight: 0,
                    background: selectedSuit === suit ? (suit === 'H' ? '#d32f2f' : suit === 'D' ? '#1976d2' : suit === 'S' ? '#222' : suit === 'C' ? '#388e3c' : '#1976d2') : available ? '#fff' : '#f8d7da',
                    color: selectedSuit === suit ? '#fff' : suit === 'H' ? '#d32f2f' : suit === 'D' ? '#1976d2' : suit === 'S' ? '#222' : suit === 'C' ? '#388e3c' : '#1976d2',
                    border: '1px solid #1976d2',
                    borderRadius: 5,
                    padding: '3px 8px', // increased
                    fontSize: 16, // increased
                    minWidth: 24,
                    minHeight: 24,
                    height: 24,
                    opacity: available ? 1 : 0.6,
                    cursor: available ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    boxShadow: selectedSuit === suit ? '0 1px 4px #1976d288' : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    verticalAlign: 'middle',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => {
                    if (available) {
                      setSelectedSuit(suit);
                      setSelectedAction(null);
                    }
                  }}
                  disabled={!available}
                >
                  {suit === 'NT' ? (
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: selectedSuit === suit ? '#fff' : '#1976d2' }}>NT</span>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: selectedSuit === suit ? '#fff' : suit === 'H' ? '#d32f2f' : suit === 'D' ? '#1976d2' : suit === 'S' ? '#222' : suit === 'C' ? '#388e3c' : '#1976d2' }}>{suit === 'C' ? '♣' : suit === 'D' ? '♦' : suit === 'H' ? '♥' : suit === 'S' ? '♠' : ''}</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Actions and Confirm row */}
          <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 2 }}>
            {actions.map((action) => {
              const available =
                !afterRedouble && // After Redouble, no Double or Redouble allowed
                !(
                  (action === 'Double' && !isDoubleValid()) ||
                  (action === 'Redouble' && !isRedoubleValid())
                );
              const actionLabel =
                action === 'Double' ? 'X' : action === 'Redouble' ? 'XX' : action;
              return (
                <button
                  key={action}
                  style={{
                    background: selectedAction === action ? (action === 'Double' ? '#d32f2f' : action === 'Redouble' ? '#1976d2' : '#1976d2') : available ? '#fff' : '#f8d7da',
                    color: selectedAction === action ? '#fff' : action === 'Double' ? '#d32f2f' : action === 'Redouble' ? '#1976d2' : '#1976d2',
                    border: '1px solid #1976d2',
                    borderRadius: 5,
                    padding: '3px 8px', // increased
                    fontSize: 15, // increased
                    minWidth: 26,
                    minHeight: 24,
                    opacity: available ? 1 : 0.6,
                    cursor: available ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    boxShadow: selectedAction === action ? '0 1px 4px #1976d288' : undefined,
                    marginRight: 0,
                    transition: 'background 0.2s',
                  }}
                  onClick={() => {
                    setSelectedAction(action);
                    setSelectedNumber(null);
                    setSelectedSuit(null);
                  }}
                  disabled={!available}
                >
                  {actionLabel}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
            <button
              style={{
                width: 60,
                padding: '4px 0',
                background:
                  (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) ||
                  selectedAction
                    ? '#1976d2'
                    : '#f8d7da',
                color:
                  (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) ||
                  selectedAction
                    ? 'white'
                    : '#a94442',
                border: 'none',
                borderRadius: 7,
                fontWeight: 'bold',
                fontSize: 14,
                opacity:
                  (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) ||
                  selectedAction
                    ? 1
                    : 0.6,
                cursor:
                  (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) ||
                  selectedAction
                    ? 'pointer'
                    : 'not-allowed',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'background 0.2s',
              }}
              disabled={
                !(
                  (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) ||
                  selectedAction
                )
              }
              onClick={() => {
                if (selectedNumber && selectedSuit && isValidBid(selectedNumber, selectedSuit)) {
                  onBid(selectedNumber + selectedSuit);
                  setSelectedNumber(null);
                  setSelectedSuit(null);
                  setSelectedAction(null);
                } else if (selectedAction) {
                  onBid(selectedAction);
                  setSelectedNumber(null);
                  setSelectedSuit(null);
                  setSelectedAction(null);
                }
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
      {/* Robust Alert/API Response Box */}
      <BidInfoPopup apiResponse={apiResponseToShow} onClose={() => setApiResponseToShow(null)} />
    </div>
  );
};


export default BiddingBox;
function fotmatBidForDisplay(bid: string) {
  let displayBid = bid;
  // No translation: use API representation directly
  // Always display Pass as a bold 'P'
  if (displayBid === "P") {
    return <b>P</b>;
  }
  // Convert suit letters to icons
  if (displayBid && typeof displayBid === 'string') {
    displayBid = displayBid
      .replace(/C/g, '♣')
      .replace(/D/g, '♦')
      .replace(/H/g, '♥')
      .replace(/S/g, '♠');
  }
  return displayBid;
}

