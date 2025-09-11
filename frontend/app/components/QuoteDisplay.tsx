import React from 'react';
import './QuoteDisplay.css';  // スタイルをインポート

interface Quote
{
    id: number;
    quote_en: string;
    quote_ja: string;
    author: string;
}

interface Props
{
    quote: Quote | null;
}

// quoteオブジェクトをプロパティ(props)として受け取る
const QuoteDisplay: React.FC<Props> = ({ quote }) => {
    // quoteデータが存在しない場合は、何も表示しない
    if (!quote) {
        return <div className="quote-empty">今日の名言はまだありません。</div>;
    }

    return (
        <div className="quote-container">
            <blockquote className="quote-text-ja">
                {quote.quote_ja}
            </blockquote>
            <p className="quote-text-en">
                {quote.quote_en}
            </p>
            <footer className="quote-author">
                {quote.author}
            </footer>
        </div>
    );
};

export default QuoteDisplay;