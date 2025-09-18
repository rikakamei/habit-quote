import React from "react";
import QuoteDisplay from "./QuoteDisplay";

interface Quote {
  id: number;
  quote_en: string;
  quote_ja: string;
  author: string;
}

interface Props {
  achievementId: number | null;
  quoteChances: number;
  isLoadingQuote: boolean;
  error: string | null;
  revealedQuotes: Quote[];
  handleGetQuoteClick: () => void;
}

export default function QuoteSection({
  achievementId,
  quoteChances,
  isLoadingQuote,
  error,
  revealedQuotes,
  handleGetQuoteClick
}: Props) {
  return (
    <section className="quote-section">
      {achievementId && (
        <div className="reveal-quote-controls">
          <button
            onClick={handleGetQuoteClick}
            disabled={quoteChances <= 0 || isLoadingQuote}
            className="save-button"
          >
            {isLoadingQuote ? "取得中..." : "名言を見る"}
          </button>
          <span style={{ marginLeft: '1rem' }}>
            （残り {quoteChances} 回）
          </span>
        </div>
      )}
      {error && <div style={{ color: "red" }}>{error}</div>}
      <QuoteDisplay quote={revealedQuotes.length > 0 ? revealedQuotes[revealedQuotes.length - 1] : null} />
    </section>
  );
}
