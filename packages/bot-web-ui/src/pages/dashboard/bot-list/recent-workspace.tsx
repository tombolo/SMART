import React from 'react';
import { observer } from '@deriv/stores';
import { useDBotStore } from 'Stores/useDBotStore';
import { TRecentStrategy } from './types';
import './recent-workspace.scss';

const BOT_EMOJIS = ['🤖', '👾', '🦾', '🧠', '⚡', '💻', '🔮', '🎮'];

// Sample descriptions - you would replace with actual bot descriptions
const BOT_DESCRIPTIONS = [
    "This bot uses moving averages to identify trends. It enters trades when short-term averages cross above long-term ones.",
    "A volatility-based bot that expands position size during high volatility. It uses Bollinger Bands to determine entry points.",
    "This mean-reversion bot trades when prices deviate from historical averages. It works best in ranging markets.",
    "A breakout strategy that enters trades when price moves beyond support/resistance. Uses volume confirmation.",
    "This bot implements a simple scalping strategy. It aims for small profits with tight stop losses.",
    "A momentum-based bot that follows strong trending moves. Uses RSI to avoid overbought conditions.",
    "This grid bot places orders at fixed intervals above and below price. It profits from market oscillations.",
    "A news-based bot that reacts to economic events. Uses sentiment analysis to determine trade direction."
];

const RecentWorkspace = observer(({ workspace, index }: { workspace: TRecentStrategy, index: number }) => {
    const { dashboard, load_modal } = useDBotStore();

    const handleClick = async () => {
        await load_modal.loadFileFromRecent();
        dashboard.setActiveTab(1); // BOT_BUILDER
    };

    const randomEmoji = BOT_EMOJIS[index % BOT_EMOJIS.length];
    const botDescription = BOT_DESCRIPTIONS[index % BOT_DESCRIPTIONS.length];

    return (
        <div className="dbot-workspace-card" onClick={handleClick} data-index={index}>
            <div className="dbot-workspace-card__border-light"></div>
            <div className="dbot-workspace-card__emoji">{randomEmoji}</div>
            <div className="dbot-workspace-card__content">
                <div className="dbot-workspace-card__header">
                    <div className="dbot-workspace-card__name">
                        {workspace.name || 'Untitled Bot'}
                    </div>
                    <button className="dbot-workspace-card__action">
                        <span>Load</span>
                        <div className="dbot-workspace-card__arrow">→</div>
                    </button>
                </div>
                <div className="dbot-workspace-card__description">
                    {botDescription}
                </div>
            </div>
            <div className="dbot-workspace-card__shine"></div>
        </div>
    );
});

export default RecentWorkspace;