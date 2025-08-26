import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './strategy.module.scss';

type TickData = {
    value: number;
    isEven: boolean;
    isOver: boolean;
    timestamp: number;
};

const Strategy = () => {
    const [activeTab, setActiveTab] = useState('over-under');
    const [tickData, setTickData] = useState<TickData[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    // Simulate live tick data
    useEffect(() => {
        const generateTickData = () => {
            const data = [];
            for (let i = 0; i < 20; i++) {
                data.push({
                    value: Math.floor(Math.random() * 100),
                    isEven: i % 2 === 0,
                    isOver: Math.random() > 0.5,
                    timestamp: Date.now() - i * 1000
                });
            }
            setTickData(data);
        };

        generateTickData();
        const interval = setInterval(() => {
            generateTickData();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleTabChange = (tab) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setActiveTab(tab);
        setTimeout(() => setIsAnimating(false), 500);
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundAnimation}></div>

            <div className={styles.contentWrapper}>
                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className={styles.titleGradient}>Quantum Trading Strategies</span>
                    <div className={styles.titleUnderline}></div>
                </motion.h1>

                <div className={styles.tabContainer}>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'over-under' ? styles.active : ''}`}
                        onClick={() => handleTabChange('over-under')}
                    >
                        <span className={styles.tabIcon}>📈</span> Over/Under
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'even-odd' ? styles.active : ''}`}
                        onClick={() => handleTabChange('even-odd')}
                    >
                        <span className={styles.tabIcon}>🔢</span> Even/Odd
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'trends' ? styles.active : ''}`}
                        onClick={() => handleTabChange('trends')}
                    >
                        <span className={styles.tabIcon}>📊</span> Trend Analysis
                    </button>
                </div>

                <AnimatePresence>
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className={styles.strategyContent}
                    >
                        {activeTab === 'over-under' && (
                            <OverUnderStrategy tickData={tickData} />
                        )}
                        {activeTab === 'even-odd' && (
                            <EvenOddStrategy tickData={tickData} />
                        )}
                        {activeTab === 'trends' && (
                            <TrendAnalysisStrategy />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

const OverUnderStrategy = ({ tickData }: { tickData: TickData[] }) => {
    return (
        <div className={styles.strategySection}>
            <div className={styles.liveDataVisualization}>
                <h3 className={styles.visualizationTitle}>Live Tick Movement</h3>
                <div className={styles.tickChart}>
                    {tickData.map((tick, index) => (
                        <motion.div
                            key={index}
                            className={`${styles.tickBar} ${tick.isOver ? styles.overBar : styles.underBar}`}
                            initial={{ height: 0 }}
                            animate={{ height: `${tick.value}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <div className={styles.tickValue}>{tick.value}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className={styles.strategyGrid}>
                <motion.div
                    className={`${styles.strategyCard} ${styles.overCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(16, 185, 129, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>🟢</div>
                        <h3 className={styles.cardTitle}>Quantum Over Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Green momentum</span> must be above prediction threshold
                            <div className={styles.probabilityIndicator} data-probability="85%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Red resistance</span> must show downward trend
                            <div className={styles.probabilityIndicator} data-probability="78%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Entry point:</span> Optimal when volatility index &lt; 30
                            <div className={styles.probabilityIndicator} data-probability="92%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Quantum Pattern Detected:</div>
                        <p>When predicting 75, enter at 70 with 3 consecutive green ticks above 70</p>
                    </div>
                    <div className={styles.successRate}>
                        <div className={styles.rateMeter}>
                            <div className={styles.rateFill} style={{ width: '87%' }}></div>
                        </div>
                        <span>87% Success Rate</span>
                    </div>
                </motion.div>

                <motion.div
                    className={`${styles.strategyCard} ${styles.underCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(239, 68, 68, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>🔴</div>
                        <h3 className={styles.cardTitle}>Neural Under Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Red pressure</span> must maintain below prediction
                            <div className={styles.probabilityIndicator} data-probability="82%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Green pullback</span> should not exceed 15% threshold
                            <div className={styles.probabilityIndicator} data-probability="75%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Entry point:</span> When RSI shows oversold conditions
                            <div className={styles.probabilityIndicator} data-probability="89%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Neural Pattern Example:</div>
                        <p>If predicting 25, enter at 30 with MACD showing downward crossover</p>
                    </div>
                    <div className={styles.successRate}>
                        <div className={styles.rateMeter}>
                            <div className={styles.rateFill} style={{ width: '83%' }}></div>
                        </div>
                        <span>83% Success Rate</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const EvenOddStrategy = ({ tickData }: { tickData: TickData[] }) => {
    return (
        <div className={styles.strategySection}>
            <div className={styles.parityVisualization}>
                <h3 className={styles.visualizationTitle}>Parity Distribution</h3>
                <div className={styles.parityChart}>
                    {tickData.map((tick, index) => (
                        <motion.div
                            key={index}
                            className={`${styles.parityDot} ${tick.isEven ? styles.evenDot : styles.oddDot}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: 'spring',
                                stiffness: 100,
                                damping: 10,
                                delay: index * 0.1
                            }}
                        >
                            {tick.isEven ? 'E' : 'O'}
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className={styles.strategyGrid}>
                <motion.div
                    className={`${styles.strategyCard} ${styles.evenCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(59, 130, 246, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>🔵</div>
                        <h3 className={styles.cardTitle}>Fractal Even Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Both bars</span> must show even Fibonacci levels
                            <div className={styles.probabilityIndicator} data-probability="88%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Cluster confirmation:</span> 3+ even numbers &lt;15%
                            <div className={styles.probabilityIndicator} data-probability="81%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Volume spike</span> on even numbers confirms signal
                            <div className={styles.probabilityIndicator} data-probability="90%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Fractal Example:</div>
                        <p>Bars at 22 (even) and 36 (even) with volume spike on 24, 28, 32</p>
                    </div>
                    <div className={styles.successRate}>
                        <div className={styles.rateMeter}>
                            <div className={styles.rateFill} style={{ width: '85%' }}></div>
                        </div>
                        <span>85% Success Rate</span>
                    </div>
                </motion.div>

                <motion.div
                    className={`${styles.strategyCard} ${styles.oddCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(139, 92, 246, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>🟣</div>
                        <h3 className={styles.cardTitle}>Harmonic Odd Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Both bars</span> must align with odd harmonics
                            <div className={styles.probabilityIndicator} data-probability="86%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Price rejection</span> at odd pivot points
                            <div className={styles.probabilityIndicator} data-probability="79%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Time frames</span> must sync with odd intervals
                            <div className={styles.probabilityIndicator} data-probability="91%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Harmonic Example:</div>
                        <p>Bars at 35 (odd) and 47 (odd) with rejection at 37, 41, 43</p>
                    </div>
                    <div className={styles.successRate}>
                        <div className={styles.rateMeter}>
                            <div className={styles.rateFill} style={{ width: '84%' }}></div>
                        </div>
                        <span>84% Success Rate</span>
                    </div>
                </motion.div>
            </div>

            <div className={styles.importantNote}>
                <div className={styles.warningIcon}>⚠️</div>
                <div>
                    <strong>QUANTUM RULE:</strong> Only trade when parity divergence exceeds 25% and time-alignment confirms
                </div>
            </div>
        </div>
    );
};

const TrendAnalysisStrategy = () => {
    return (
        <div className={styles.strategySection}>
            <div className={styles.trendVisualization}>
                <h3 className={styles.visualizationTitle}>3D Trend Matrix</h3>
                <div className={styles.trendCube}>
                    {[1, 2, 3, 4, 5, 6].map((side) => (
                        <div key={side} className={styles.cubeSide} data-side={side}>
                            <div className={styles.trendLine}></div>
                            <div className={styles.trendLine}></div>
                            <div className={styles.trendLine}></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.strategyGrid}>
                <motion.div
                    className={`${styles.strategyCard} ${styles.trendUpCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(16, 185, 129, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>🚀</div>
                        <h3 className={styles.cardTitle}>Momentum Surge Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Volume acceleration</span> with price breakout
                            <div className={styles.probabilityIndicator} data-probability="89%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>3 consecutive</span> higher highs confirmation
                            <div className={styles.probabilityIndicator} data-probability="84%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>EMA cross</span> on 5/15 minute timeframe
                            <div className={styles.probabilityIndicator} data-probability="92%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Surge Pattern:</div>
                        <p>Breakout above 75 with volume 2x average and RSI &lt; 60</p>
                    </div>
                </motion.div>

                <motion.div
                    className={`${styles.strategyCard} ${styles.trendDownCard}`}
                    whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(239, 68, 68, 0.2)' }}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon}>📉</div>
                        <h3 className={styles.cardTitle}>Capitation Wave Strategy</h3>
                    </div>
                    <ul className={styles.strategyList}>
                        <li>
                            <span className={styles.highlight}>Volume expansion</span> on downward moves
                            <div className={styles.probabilityIndicator} data-probability="87%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Lower lows</span> with increasing spread
                            <div className={styles.probabilityIndicator} data-probability="82%"></div>
                        </li>
                        <li>
                            <span className={styles.highlight}>Bollinger band</span> exit signal confirmation
                            <div className={styles.probabilityIndicator} data-probability="90%"></div>
                        </li>
                    </ul>
                    <div className={styles.example}>
                        <div className={styles.exampleLabel}>Wave Example:</div>
                        <p>Breakdown below 25 with volume spike and BB %B &lt; 0.2</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Strategy;
