"use client";
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiCopy,
    FiTrendingUp,
    FiDollarSign,
    FiUsers,
    FiClock,
    FiActivity,
    FiAlertCircle,
    FiArrowUp,
    FiArrowDown
} from "react-icons/fi";
import styles from "./CopyTradingPage.module.scss";

const REAL_TRADER_TOKEN = "iPuvuZAvESLPPjR";
const DEMO_TRADER_TOKEN = "HRFC3rmRFikCBiV";
const APP_ID = 70344;
const PING_INTERVAL = 20000;
const RECONNECT_DELAY = 3000;
const MINIMUM_BALANCE = 1;

// Hardcoded stats for real account
const HARDCODED_REAL_STATS = {
    active_since: Math.floor(Date.now() / 1000) - 86400 * 180, // 6 months ago
    avg_duration: 5.2,
    avg_loss: -12.5,
    avg_profit: 18.7,
    copiers: 42,
    total_trades: 287,
    trades_profitable: 198,
    trader_loginid: "CR12345678",
    allow_copiers: true
};

// Hardcoded stats for demo account
const HARDCODED_DEMO_STATS = {
    active_since: Math.floor(Date.now() / 1000) - 86400 * 90, // 3 months ago
    avg_duration: 4.8,
    avg_loss: -10.2,
    avg_profit: 15.3,
    copiers: 87,
    total_trades: 412,
    trades_profitable: 265,
    trader_loginid: "VR98765432",
    allow_copiers: true
};

type CopyStats = {
    active_since?: number;
    avg_duration?: number;
    avg_loss?: number;
    avg_profit?: number;
    copiers?: number;
    last_12months_profitable_trades?: number;
    monthly_profitable_trades?: Record<string, string>;
    performance_probability?: number;
    total_trades?: number;
    trades_breakdown?: Record<string, any>;
    trades_profitable?: number;
    yearly_profitable_trades?: Record<string, number>;
    trader_loginid?: string;
    allow_copiers?: boolean;
};

type TradingMode = 'real' | 'demo';

type ContractParameters = {
    amount: number;
    basis: string;
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: string;
    symbol: string;
};

export default function CopyTradingPage() {
    const [stats, setStats] = useState<CopyStats>(HARDCODED_REAL_STATS);
    const [demoStats, setDemoStats] = useState<CopyStats>(HARDCODED_DEMO_STATS);
    const [copierToken, setCopierToken] = useState("");
    const [isCopying, setIsCopying] = useState(false);
    const [trades, setTrades] = useState<any[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState({
        real: false, // Set to false since we're using hardcoded data
        demo: false  // Set to false since we're using hardcoded data
    });
    const [copyStatus, setCopyStatus] = useState("");
    const [accountBalance, setAccountBalance] = useState<number | null>(null);
    const [showBalanceWarning, setShowBalanceWarning] = useState(false);
    const [tradingMode, setTradingMode] = useState<TradingMode>('demo');
    const [contractDetails, setContractDetails] = useState<any>(null);
    const [isBuyingContract, setIsBuyingContract] = useState(false);
    const [lastBuyRequest, setLastBuyRequest] = useState(0);
    const wsCopier = useRef<WebSocket | null>(null);
    const wsTrader = useRef<WebSocket | null>(null);
    const wsDemoTrader = useRef<WebSocket | null>(null);
    const pingInterval = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const logWebSocketState = (ws: WebSocket | null, prefix: string) => {
        if (!ws) {
            console.log(`[${prefix}] WebSocket is null`);
            return;
        }
        const states = [
            "CONNECTING",
            "OPEN",
            "CLOSING",
            "CLOSED"
        ];
        console.log(`[${prefix}] WebSocket state: ${states[ws.readyState]}`);
    };

    const setupPing = (ws: WebSocket, prefix: string) => {
        console.log(`[${prefix}] Setting up ping interval`);
        cleanupPing();
        if (ws.readyState === WebSocket.OPEN) {
            console.log(`[${prefix}] Sending initial ping`);
            ws.send(JSON.stringify({ ping: 1 }));
        }
        pingInterval.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log(`[${prefix}] Sending periodic ping`);
                ws.send(JSON.stringify({ ping: 1 }));
            } else {
                console.log(`[${prefix}] WebSocket not open, readyState: ${ws.readyState}`);
            }
        }, PING_INTERVAL);
    };

    const cleanupPing = () => {
        if (pingInterval.current) {
            console.log(`[PING] Clearing ping interval`);
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
    };

    const cleanupReconnect = () => {
        if (reconnectTimeout.current) {
            console.log(`[RECONNECT] Clearing reconnect timeout`);
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
    };

    const validateContractParams = (params: ContractParameters) => {
        if (params.amount < 1) {
            throw new Error("Amount must be at least 1");
        }
        if (!['s', 'm', 'h', 'd'].includes(params.duration_unit)) {
            throw new Error("Invalid duration unit. Use 's', 'm', 'h', or 'd'");
        }
        if (!['CALL', 'PUT'].includes(params.contract_type)) {
            throw new Error("Invalid contract type. Use 'CALL' or 'PUT'");
        }
    };

    const buyContract = (balance: number) => {
        if (!wsCopier.current || wsCopier.current.readyState !== WebSocket.OPEN) {
            console.error("[BUY] WebSocket not ready");
            setError("Connection not ready for trading");
            return false;
        }

        if (Date.now() - lastBuyRequest < 1000) {
            setError("Please wait before placing another trade");
            return false;
        }

        setIsBuyingContract(true);
        setCopyStatus("Purchasing contract...");
        setLastBuyRequest(Date.now());

        const contractParams: ContractParameters = {
            amount: balance,
            basis: "stake",
            contract_type: "CALL",
            currency: "USD",
            duration: 5,
            duration_unit: "m",
            symbol: "R_100"
        };

        try {
            validateContractParams(contractParams);
        } catch (e: any) {
            console.error("[BUY] Validation error:", e.message);
            setError(`Invalid contract parameters: ${e.message}`);
            setIsBuyingContract(false);
            return false;
        }

        console.log("[BUY] Sending buy request with parameters:", contractParams);

        wsCopier.current.send(JSON.stringify({
            buy: 1,
            price: balance, // Price at root level
            parameters: contractParams,
            req_id: 200
        }));

        return true;
    };

    useEffect(() => {
        console.log(`[INIT] Using hardcoded stats for both real and demo accounts`);

        // Simulate loading completion
        setTimeout(() => {
            setLoading({ real: false, demo: false });
        }, 500);

        return () => {
            console.log(`[CLEANUP] Closing WebSocket connections`);
            cleanupPing();
            cleanupReconnect();
            if (wsTrader.current) {
                console.log(`[TRADER-REAL] Closing connection`);
                wsTrader.current.close();
            }
            if (wsDemoTrader.current) {
                console.log(`[TRADER-DEMO] Closing connection`);
                wsDemoTrader.current.close();
            }
        };
    }, []);

    const startCopying = () => {
        console.group(`[COPY] Starting copy trading`);
        console.log(`Mode: ${tradingMode}`);
        console.log(`Trader token: ${tradingMode === 'real' ? REAL_TRADER_TOKEN : DEMO_TRADER_TOKEN}`);
        console.log(`Copier token: ${copierToken ? 'provided' : 'missing'}`);

        if (!copierToken) {
            console.error(`[COPY] Error: No API token provided`);
            setError("Please enter your API token");
            console.groupEnd();
            return;
        }

        const currentTraderLoginId = tradingMode === 'real'
            ? stats.trader_loginid
            : demoStats.trader_loginid;

        if (!currentTraderLoginId) {
            console.error(`[COPY] Error: Trader information not loaded`);
            setError("Trader information not loaded yet");
            console.groupEnd();
            return;
        }

        console.log(`[COPY] Initializing copy trading`);
        setIsCopying(true);
        setError("");
        setTrades([]);
        setCopyStatus("Connecting to server...");
        setShowBalanceWarning(false);
        setContractDetails(null);
        setIsBuyingContract(false);

        if (wsCopier.current) {
            console.log(`[COPY] Closing existing WebSocket`);
            wsCopier.current.close();
        }

        console.log(`[COPY] Creating new WebSocket connection`);
        wsCopier.current = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);

        wsCopier.current.onopen = () => {
            console.log(`[COPY] WebSocket connected`);
            logWebSocketState(wsCopier.current, 'COPY');
            setCopyStatus("Authenticating...");
            setupPing(wsCopier.current!, 'COPY');
            console.log(`[COPY] Sending authorization`);
            wsCopier.current?.send(JSON.stringify({
                authorize: copierToken,
                req_id: 4
            }));
        };

        wsCopier.current.onerror = (error) => {
            console.error(`[COPY] WebSocket error:`, error);
            setError("Connection error - please try again");
            setCopyStatus("Connection error");
            stopCopying();
        };

        wsCopier.current.onclose = (event) => {
            console.log(`[COPY] WebSocket closed`, {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            cleanupPing();
            if (isCopying) {
                console.log(`[COPY] Attempting reconnect`);
                setError("Connection lost - reconnecting...");
                setCopyStatus("Reconnecting...");
                cleanupReconnect();
                reconnectTimeout.current = setTimeout(() => {
                    console.log(`[COPY] Reconnecting now`);
                    startCopying();
                }, RECONNECT_DELAY);
            }
        };

        wsCopier.current.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                console.log(`[COPY] Received message:`, data);

                if (data.msg_type === "ping") {
                    console.log(`[COPY] Ping response received`);
                    return;
                }

                if (data.error) {
                    console.error(`[COPY] Error:`, data.error);
                    setError(`Error: ${data.error.message}`);
                    setCopyStatus(`Error: ${data.error.message}`);
                    stopCopying();
                    return;
                }

                if (data.msg_type === "authorize" && data.req_id === 4) {
                    console.log(`[COPY] Authorization successful`, {
                        loginid: data.authorize.loginid,
                        balance: data.authorize.balance,
                        currency: data.authorize.currency
                    });
                    setCopyStatus("Starting copy trading...");
                    setAccountBalance(data.authorize.balance);

                    if (data.authorize.balance < MINIMUM_BALANCE) {
                        console.error(`[COPY] Insufficient balance: ${data.authorize.balance} < ${MINIMUM_BALANCE}`);
                        setError(`Insufficient balance (minimum ${MINIMUM_BALANCE} required)`);
                        setCopyStatus("Insufficient balance");
                        setShowBalanceWarning(true);
                        stopCopying();
                        return;
                    }

                    // Buy contract with full balance immediately
                    const buySuccess = buyContract(data.authorize.balance);
                    if (!buySuccess) {
                        stopCopying();
                        return;
                    }
                }

                if (data.msg_type === "buy" && data.req_id === 200) {
                    setIsBuyingContract(false);
                    if (data.error) {
                        console.error("[BUY] Error buying contract:", data.error);
                        let errorMsg = `Failed to buy contract: ${data.error.message}`;
                        if (data.error.details) {
                            errorMsg += ` (${JSON.stringify(data.error.details)})`;
                        }
                        setError(errorMsg);
                        setCopyStatus("Failed to purchase contract");
                        stopCopying();
                        return;
                    }
                    console.log("[BUY] Contract purchased successfully:", data.buy);
                    setContractDetails(data.buy);
                    setCopyStatus("Contract purchased - starting copy trading...");

                    const traderToken = tradingMode === 'real' ? REAL_TRADER_TOKEN : DEMO_TRADER_TOKEN;
                    console.log(`[COPY] Sending copy_start for trader: ${traderToken}`);
                    wsCopier.current?.send(JSON.stringify({
                        copy_start: traderToken,
                        req_id: 5
                    }));
                }

                if (data.msg_type === "copy_start" && data.req_id === 5) {
                    if (data.error) {
                        console.error(`[COPY] copy_start failed:`, data.error);
                        setError(`Failed to start copying: ${data.error.message}`);
                        setCopyStatus(`Failed: ${data.error.message}`);
                        stopCopying();
                        return;
                    }

                    console.log(`[COPY] Copy trading started successfully`);
                    setIsCopying(true);
                    setError("");
                    setCopyStatus("Copy trading active - waiting for trades...");

                    console.log(`[COPY] Subscribing to transactions`);
                    wsCopier.current?.send(JSON.stringify({
                        transaction: 1,
                        subscribe: 1,
                        passthrough: {
                            subscription_type: "full_transaction_details"
                        },
                        req_id: 6
                    }));

                    console.log(`[COPY] Requesting portfolio`);
                    wsCopier.current?.send(JSON.stringify({
                        portfolio: 1,
                        req_id: 7
                    }));

                    wsCopier.current?.send(JSON.stringify({
                        active_symbols: "brief",
                        req_id: 100
                    }));
                }

                if (data.msg_type === "transaction") {
                    console.log(`[COPY] Transaction received:`, {
                        action: data.transaction.action,
                        amount: data.transaction.amount,
                        contract_id: data.transaction.contract_id,
                        symbol: data.transaction.symbol,
                        transaction_id: data.transaction.transaction_id
                    });

                    if (data.transaction.action === "buy") {
                        console.log(`[COPY] BUY transaction detected`);
                        setTrades(prev => [{
                            ...data.transaction,
                            timestamp: new Date().toISOString()
                        }, ...prev.slice(0, 49)]);
                        setCopyStatus("Trade executed - processing...");
                    } else {
                        console.log(`[COPY] Non-buy transaction: ${data.transaction.action}`);
                    }
                }

                if (data.msg_type === "portfolio") {
                    console.log(`[COPY] Portfolio update:`, {
                        balance: data.portfolio.balance,
                        contract_count: data.portfolio.contracts?.length || 0
                    });
                    setAccountBalance(data.portfolio.balance);
                }

                if (data.msg_type === "active_symbols" && data.req_id === 100) {
                    console.log(`[COPY] Active symbols:`, data.active_symbols.map((s: any) => s.symbol).join(', '));
                }
            } catch (e) {
                console.error(`[COPY] Message parse error:`, e);
            }
        };
        console.groupEnd();
    };

    const stopCopying = () => {
        console.log(`[COPY] Stopping copy trading`);
        setIsCopying(false);
        setIsBuyingContract(false);
        setCopyStatus("Copy trading stopped");
        cleanupReconnect();

        if (!wsCopier.current) {
            console.log(`[COPY] No WebSocket instance to stop`);
            return;
        }

        logWebSocketState(wsCopier.current, 'COPY-STOP');

        if (wsCopier.current.readyState === WebSocket.OPEN) {
            const traderToken = tradingMode === 'real' ? REAL_TRADER_TOKEN : DEMO_TRADER_TOKEN;
            console.log(`[COPY] Sending stop commands for trader: ${traderToken}`);

            wsCopier.current.send(JSON.stringify({
                copy_stop: traderToken,
                req_id: 8
            }));

            wsCopier.current.send(JSON.stringify({
                transaction: 1,
                unsubscribe: 1,
                req_id: 9
            }));

            wsCopier.current.send(JSON.stringify({
                portfolio: 1,
                unsubscribe: 1,
                req_id: 10
            }));
        } else {
            console.log(`[COPY] WebSocket not open, readyState: ${wsCopier.current.readyState}`);
        }

        cleanupPing();
        if (wsCopier.current) {
            console.log(`[COPY] Closing WebSocket`);
            wsCopier.current.close();
        }
        setTrades([]);
        setContractDetails(null);
    };

    const handleModeChange = (mode: TradingMode) => {
        console.log(`[MODE] Request to change to ${mode} mode`);
        if (isCopying) {
            console.log(`[MODE] Cannot switch while copying is active`);
            setError("Please stop current copy trading before switching mode");
            return;
        }
        console.log(`[MODE] Switching to ${mode} mode`);
        setTradingMode(mode);
        setError("");
    };

    const isLoading = tradingMode === 'real' ? loading.real : loading.demo;
    const currentStats = tradingMode === 'real' ? stats : demoStats;

    const calculateWinRate = (stats: CopyStats) => {
        if (!stats.total_trades || !stats.trades_profitable) return 0;
        return (stats.trades_profitable / stats.total_trades) * 100;
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "-";
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={styles.copyTrading}>
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={styles.copyTrading__error}
                    >
                        <FiAlertCircle /> {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={styles.copyTrading__header}>
                <h2>Copy Trading Dashboard</h2>
                <p>Follow professional traders automatically</p>
            </div>

            <div className={styles.copyTrading__modeSelector}>
                <button
                    className={`${styles.copyTrading__modeButton} ${tradingMode === 'real' ? styles.copyTrading__modeButtonActive : ''}`}
                    onClick={() => handleModeChange('real')}
                >
                    Real Account
                </button>
                <button
                    className={`${styles.copyTrading__modeButton} ${tradingMode === 'demo' ? styles.copyTrading__modeButtonActive : ''}`}
                    onClick={() => handleModeChange('demo')}
                >
                    Demo Account
                </button>
            </div>

            <div className={styles.copyTrading__content}>
                <div className={styles.copyTrading__leftPanel}>
                    <div className={styles.copyTrading__card}>
                        <h3 className={styles.copyTrading__cardTitle}>
                            <FiActivity /> Trader Performance ({tradingMode === 'real' ? 'Real' : 'Demo'})
                        </h3>

                        {isLoading ? (
                            <div className={styles.copyTrading__loading}>
                                <div className={styles.copyTrading__loadingSpinner} />
                                <p>Loading trader data...</p>
                            </div>
                        ) : (
                            <div className={styles.copyTrading__statsGrid}>
                                <div className={styles.copyTrading__statCard}>
                                    <h4>Win Rate</h4>
                                    <p>{calculateWinRate(currentStats).toFixed(2)}%</p>
                                </div>

                                <div className={styles.copyTrading__statCard}>
                                    <h4>Avg Profit</h4>
                                    <p>${currentStats.avg_profit?.toFixed(2) || '0.00'}</p>
                                </div>

                                <div className={styles.copyTrading__statCard}>
                                    <h4>Avg Loss</h4>
                                    <p>${currentStats.avg_loss?.toFixed(2) || '0.00'}</p>
                                </div>

                                <div className={styles.copyTrading__statCard}>
                                    <h4>Total Trades</h4>
                                    <p>{currentStats.total_trades?.toLocaleString() || '0'}</p>
                                </div>

                                <div className={styles.copyTrading__statCard}>
                                    <h4>Active Since</h4>
                                    <p>{formatDate(currentStats.active_since)}</p>
                                </div>

                                <div className={styles.copyTrading__statCard}>
                                    <h4>Copiers</h4>
                                    <p>{currentStats.copiers?.toLocaleString() || '0'}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {contractDetails && (
                        <div className={styles.copyTrading__card}>
                            <h3 className={styles.copyTrading__cardTitle}>
                                <FiTrendingUp /> Active Contract
                            </h3>
                            <div className={styles.copyTrading__contractDetails}>
                                <div>
                                    <span>Contract ID:</span>
                                    <span>{contractDetails.contract_id}</span>
                                </div>
                                <div>
                                    <span>Purchase Price:</span>
                                    <span>${contractDetails.buy_price}</span>
                                </div>
                                <div>
                                    <span>Payout:</span>
                                    <span>${contractDetails.payout}</span>
                                </div>
                                <div>
                                    <span>Symbol:</span>
                                    <span>{contractDetails.symbol}</span>
                                </div>
                                <div>
                                    <span>Contract Type:</span>
                                    <span>{contractDetails.contract_type}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.copyTrading__rightPanel}>
                    <div className={styles.copyTrading__card}>
                        <h3 className={styles.copyTrading__cardTitle}>
                            <FiCopy /> Copy Trading Controls ({tradingMode === 'real' ? 'Real' : 'Demo'})
                        </h3>

                        <div className={styles.copyTrading__formGroup}>
                            <label>Your {tradingMode === 'real' ? 'Real' : 'Demo'} API Token</label>
                            <input
                                type="password"
                                placeholder={`Enter your ${tradingMode === 'real' ? 'real' : 'demo'} API token`}
                                value={copierToken}
                                onChange={(e) => setCopierToken(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {accountBalance !== null && (
                            <div className={`${styles.copyTrading__balance} ${showBalanceWarning ? styles.copyTrading__balanceWarning : ''}`}>
                                <FiDollarSign />
                                <span>Balance: {typeof accountBalance === 'number' ? accountBalance.toFixed(2) : 'Loading...'}</span>
                                {showBalanceWarning && (
                                    <div className={styles.copyTrading__balanceAlert}>
                                        <FiAlertCircle /> Minimum {MINIMUM_BALANCE} required
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={styles.copyTrading__actions}>
                            {!isCopying ? (
                                <button
                                    className={styles.copyTrading__button}
                                    onClick={startCopying}
                                    disabled={isLoading || !currentStats.trader_loginid}
                                >
                                    <FiCopy /> Start Copy Trading
                                </button>
                            ) : (
                                <button
                                    className={`${styles.copyTrading__button} ${styles.copyTrading__buttonStop}`}
                                    onClick={stopCopying}
                                >
                                    <FiCopy /> Stop Copy Trading
                                </button>
                            )}
                        </div>

                        {isCopying && (
                            <div className={styles.copyTrading__status}>
                                <FiActivity />
                                <span>{copyStatus}</span>
                                {isBuyingContract && (
                                    <div className={styles.copyTrading__loadingSpinnerSmall} />
                                )}
                            </div>
                        )}
                    </div>

                    {isCopying && (
                        <div className={styles.copyTrading__card}>
                            <h3 className={styles.copyTrading__cardTitle}>
                                <FiClock /> Live Trades
                            </h3>

                            {trades.length === 0 ? (
                                <div className={styles.copyTrading__empty}>
                                    <FiClock />
                                    <p>Waiting for trades...</p>
                                </div>
                            ) : (
                                <div className={styles.copyTrading__trades}>
                                    {trades.map((t, idx) => (
                                        <div key={idx} className={styles.copyTrading__trade}>
                                            <div>
                                                <span>Contract:</span>
                                                <span>{t.contract_id}</span>
                                            </div>
                                            <div>
                                                <span>Action:</span>
                                                <span>{t.action}</span>
                                            </div>
                                            <div>
                                                <span>Amount:</span>
                                                <span>${t.amount}</span>
                                            </div>
                                            <div>
                                                <span>P/L:</span>
                                                <span className={t.profit >= 0 ? styles.profit : styles.loss}>
                                                    {t.profit >= 0 ? <FiArrowUp /> : <FiArrowDown />}
                                                    ${Math.abs(t.profit).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}