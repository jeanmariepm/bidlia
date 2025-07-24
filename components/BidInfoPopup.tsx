import React from 'react';

interface BidInfoPopupProps {
  apiResponse: any;
  onClose: () => void;
}

const BidInfoPopup: React.FC<BidInfoPopupProps> = ({ apiResponse, onClose }) => {
  if (!apiResponse) return null;

  // Suit info rendering
  let suitInfoDisplay: React.ReactNode = 'No suit info available.';
  if (apiResponse && typeof apiResponse === 'object') {
    const suits = Array.isArray(apiResponse.suits)
      ? apiResponse.suits
      : apiResponse.alert && Array.isArray(apiResponse.alert.suits)
        ? apiResponse.alert.suits
        : [];
    // Sort suits in S, H, D, C order
    const suitOrder = { S: 0, H: 1, D: 2, C: 3 };
    const sortedSuits = [...suits].sort((a, b) => {
      const aSuit = a.suit ?? a.alert?.variables?.suit;
      const bSuit = b.suit ?? b.alert?.variables?.suit;
      return (suitOrder[aSuit] ?? 99) - (suitOrder[bSuit] ?? 99);
    });
    if (sortedSuits.length > 0) {
      suitInfoDisplay = [
        <span key="distribution-label" style={{ fontWeight: 700 }}>Distribution: </span>,
        ...sortedSuits
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
          .reduce((prev: React.ReactNode[], curr: React.ReactNode, idx: number) => prev.length === 0 ? [curr] : [...prev, <span key={'comma'+idx} style={{color:'#888'}}>, </span>, curr], [] as React.ReactNode[])
      ];
      if (!suitInfoDisplay || (Array.isArray(suitInfoDisplay) && suitInfoDisplay.length === 0)) {
        suitInfoDisplay = [<span key="distribution-label" style={{ fontWeight: 700 }}>Distribution: </span>, 'No suit info available.'];
      }
    } else {
      suitInfoDisplay = [<span key="distribution-label" style={{ fontWeight: 700 }}>Distribution: </span>, 'No suit info available.'];
    }
  }

  // HCP Range logic
  let minHcp: string | number = 'N/A';
  let maxHcp: string | number = 'N/A';
  // 1. Check alert.hcp.variables
  if (apiResponse && apiResponse.alert && apiResponse.alert.hcp && apiResponse.alert.hcp.variables) {
    const min = apiResponse.alert.hcp.variables.min_hcp;
    const max = apiResponse.alert.hcp.variables.max_hcp;
    if (min !== undefined && min !== null && !isNaN(Number(min))) minHcp = String(min);
    if (max !== undefined && max !== null && !isNaN(Number(max))) maxHcp = String(max);
  }
  // 2. Check hcp.variables at top level
  if ((minHcp === 'N/A' || maxHcp === 'N/A') && apiResponse && apiResponse.hcp && apiResponse.hcp.variables) {
    const min = apiResponse.hcp.variables.min_hcp;
    const max = apiResponse.hcp.variables.max_hcp;
    if (min !== undefined && min !== null && !isNaN(Number(min))) minHcp = String(min);
    if (max !== undefined && max !== null && !isNaN(Number(max))) maxHcp = String(max);
  }
  // 3. If still not found, use global defaults
  if (minHcp === 'N/A') minHcp = '0';
  if (maxHcp === 'N/A') maxHcp = '37';

  return (
    <div style={{
      position: 'fixed',
      top: 80,
      left: 0,
      right: 0,
      margin: 'auto',
      zIndex: 9999,
      background: '#fff',
      color: '#111',
      border: '3px solid #1976d2',
      borderRadius: 8,
      padding: 24,
      maxWidth: 600,
      minWidth: 320,
      boxShadow: '0 4px 24px #2228',
      textAlign: 'center',
      position: 'fixed',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 20 }}>Bid Info</div>
        <button
          onClick={onClose}
          style={{
            marginLeft: 12,
            padding: '4px 14px',
            fontSize: 16,
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Close
        </button>
      </div>
      {apiResponse && apiResponse.bid && (
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Bid: <span style={{ fontWeight: 500 }}>{apiResponse.bid}</span>
        </div>
      )}
      <div>{suitInfoDisplay}</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>
        HCP Range: <span style={{ fontWeight: 500 }}>{minHcp} to {maxHcp}</span>
      </div>
      <pre style={{
        textAlign: 'left',
        background: '#f5f5f5',
        color: '#222',
        padding: 12,
        borderRadius: 6,
        maxHeight: 350,
        overflow: 'auto'
      }}>
        {JSON.stringify(apiResponse, null, 2)}
      </pre>
    </div>
  );
};

export default BidInfoPopup; 