import React, { useEffect, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import './GlobalLoading.scss';
import LOGO from './Logo/LOGO9.png';

const GlobalLoading = () => {
    const [progress, setProgress] = useState(0);
    const controls = useAnimation();
    const [showElements, setShowElements] = useState(false);
    const [marketData, setMarketData] = useState({
        eurusd: `1.08${Math.floor(Math.random() * 9)}`,
        btcusd: `6${Math.floor(Math.random() * 9000) + 1000}`,
        volatility: `75.${Math.floor(Math.random() * 9)}%`,
    });

    useEffect(() => {
        // Update market data every 1.5 seconds
        const marketInterval = setInterval(() => {
            setMarketData({
                eurusd: `1.08${Math.floor(Math.random() * 9)}`,
                btcusd: `6${Math.floor(Math.random() * 9000) + 1000}`,
                volatility: `75.${Math.floor(Math.random() * 9)}%`,
            });
        }, 1500);

        // 10 second progress timer
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                const newProgress = prev + 1;
                if (newProgress >= 100) {
                    clearInterval(progressInterval);
                    clearInterval(marketInterval);
                }
                return newProgress;
            });
        }, 100);

        // Animated entrance
        setTimeout(() => {
            controls.start('visible');
            setShowElements(true);
        }, 500);

        return () => {
            clearInterval(progressInterval);
            clearInterval(marketInterval);
        };
    }, []);

    const chartPath = `M 0,50 
                    C 50,30 100,70 150,40 
                    S 200,60 250,30 
                    S 300,70 350,50 
                    S 400,20 450,60 
                    S 500,40 550,70 
                    S 600,30 650,50 
                    S 700,80 750,40 
                    S 800,60 850,30 
                    S 900,70 950,50 
                    L 1000,50`;

    return (
        <div className='global-loading'>
            {/* Animated background elements */}
            <div className='particle-layer'>
                {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className='particle'
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0, 0.6, 0],
                            x: Math.random() * 100 - 50,
                            y: Math.random() * 100 - 50,
                        }}
                        transition={{
                            duration: 3 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Glowing orb background */}
            <div className='orb-layer'>
                <motion.div
                    className='orb orb-1'
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 0.8, 0.6],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className='orb orb-2'
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2,
                    }}
                />
            </div>

            {/* Main content */}
            <motion.div
                className='logo-container'
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={controls}
                variants={{
                    visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                            duration: 0.8,
                            ease: [0.17, 0.67, 0.24, 0.99],
                        },
                    },
                }}
            >
                <img src={LOGO} alt='Deriv Logo' className='logo' />
                <motion.div
                    className='logo-glow'
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                    }}
                />
            </motion.div>

            {showElements && (
                <div className='content-wrapper'>
                    {/* Animated trading terminal */}
                    <motion.div
                        className='trading-terminal'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className='chart-container'>
                            <svg width='100%' height='160' viewBox='0 0 1000 100'>
                                <defs>
                                    <linearGradient id='chartGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                                        <stop offset='0%' stopColor='#FF444F' />
                                        <stop offset='50%' stopColor='#9C27B0' />
                                        <stop offset='100%' stopColor='#00D2FF' />
                                    </linearGradient>
                                    <filter id='glow' x='-30%' y='-30%' width='160%' height='160%'>
                                        <feGaussianBlur stdDeviation='4' result='blur' />
                                        <feComposite in='SourceGraphic' in2='blur' operator='over' />
                                    </filter>
                                </defs>
                                <motion.path
                                    d={chartPath}
                                    stroke='url(#chartGradient)'
                                    strokeWidth='3'
                                    fill='none'
                                    filter='url(#glow)'
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 3, ease: 'easeInOut' }}
                                />
                                <AnimatePresence>
                                    {progress < 100 && (
                                        <motion.circle
                                            cx='0'
                                            cy='50'
                                            r='6'
                                            fill='url(#chartGradient)'
                                            initial={{ x: 0 }}
                                            animate={{
                                                x: progress * 10,
                                                y: [
                                                    50, 30, 70, 40, 60, 30, 70, 50, 20, 60, 40, 70, 30, 50, 80, 40, 60,
                                                    30, 70, 50,
                                                ][Math.floor(progress / 5)],
                                            }}
                                            transition={{
                                                duration: 0.1,
                                                ease: 'linear',
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                            </svg>

                            {/* Candlestick animation */}
                            <div className='candlestick-animation'>
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className='candlestick'
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: Math.random() * 30 + 10,
                                            opacity: 1,
                                            y: Math.random() * 40 - 20,
                                        }}
                                        transition={{
                                            delay: i * 0.1,
                                            duration: 0.5,
                                            repeat: Infinity,
                                            repeatType: 'reverse',
                                            repeatDelay: 15 * 0.1,
                                        }}
                                    >
                                        <div className='wick' />
                                        <div className='body' />
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Market data ticker */}
                        <div className='market-ticker'>
                            <div className='ticker-item'>
                                <span className='ticker-label'>EUR/USD</span>
                                <motion.span
                                    className='ticker-value'
                                    key={`eurusd-${marketData.eurusd}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {marketData.eurusd}
                                </motion.span>
                            </div>
                            <div className='ticker-item'>
                                <span className='ticker-label'>BTC/USD</span>
                                <motion.span
                                    className='ticker-value'
                                    key={`btcusd-${marketData.btcusd}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {marketData.btcusd}
                                </motion.span>
                            </div>
                            <div className='ticker-item'>
                                <span className='ticker-label'>Volatility</span>
                                <motion.span
                                    className='ticker-value'
                                    key={`vol-${marketData.volatility}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {marketData.volatility}
                                </motion.span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Progress section */}
                    <div className='progress-section'>
                        <div className='progress-container'>
                            <motion.div
                                className='progress-bar'
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 10, ease: 'linear' }}
                            >
                                <div className='progress-glow' />
                            </motion.div>
                            <div className='progress-labels'>
                                <span className='progress-text'>{progress}%</span>
                                <span className='progress-message'>Initializing trading modules...</span>
                            </div>
                        </div>
                    </div>

                    {/* Animated trading bots */}
                    <div className='trading-bots'>
                        {['📈', '💹', '📊', '📉', '💲'].map((emoji, i) => (
                            <motion.div
                                key={i}
                                className='bot-icon'
                                initial={{ x: -100, opacity: 0, rotate: -20 }}
                                animate={{
                                    x: 0,
                                    opacity: 1,
                                    rotate: 0,
                                    y: [0, -15, 0],
                                }}
                                transition={{
                                    delay: 0.8 + i * 0.2,
                                    duration: 0.8,
                                    y: {
                                        duration: 2 + Math.random(),
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    },
                                }}
                            >
                                {emoji}
                                <motion.div
                                    className='bot-trail'
                                    animate={{
                                        scale: [0.8, 1.2, 0.8],
                                        opacity: [0.4, 0.8, 0.4],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                    }}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Status message */}
            <AnimatePresence>
                <motion.div
                    className='status-message'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.6 },
                    }}
                    exit={{ opacity: 0 }}
                >
                    <motion.span
                        animate={{
                            backgroundPosition: ['0% 50%', '100% 50%'],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            repeatType: 'reverse',
                        }}
                    >
                        Preparing your ultimate trading experience...
                    </motion.span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default GlobalLoading;
