'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaYoutube } from 'react-icons/fa';

type Msg = Record<string, any>;

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=70344';
const TRADER_TOKEN = 'sBI6BL1yP6YDl02';  // Real account token
const DEMO_TRADER_TOKEN = 'sBI6BL1yP6YDl02';  // Replace with your demo account token

// Auto Trading Component (will be integrated)
interface WebSocketMessage {
    msg_type?: string;
    buy?: {
        contract_id: string;
    };
    sell?: {
        profit: string;
    };
    error?: {
        message: string;
    };
    [key: string]: any;
}

const CopyTrading: React.FC = () => {
    // Original states
    const wsRef = useRef<WebSocket | null>(null);
    const [token, setToken] = useState('');
    const [connected, setConnected] = useState(false);
    const [authorized, setAuthorized] = useState(false);
    const [status, setStatus] = useState('Disconnected');
    const [copying, setCopying] = useState(false);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const flowRef = useRef<{
        mode: null | 'setup-and-copy';
        stage: null | 'auth_trader' | 'set_allow' | 'auth_copier' | 'copy_start';
        copierToken?: string;
        copierLoginId?: string;
        traderLoginId?: string;
        lastLoginId?: string;
        batchMode?: null | 'start' | 'stop';
        batchTokens?: string[];
        batchIndex?: number;
        isDemoToReal?: boolean;
        isSimulatedCopy?: boolean;
    }>({ mode: null, stage: null, copierToken: undefined });

    const [copierTokens, setCopierTokens] = useState<string[]>([]);
    const [perStatus, setPerStatus] = useState<Record<string, 'idle' | 'copying' | 'error'>>({});
    const pingRef = useRef<number | null>(null);

    // Auto Trading states (for demo-to-real simulation)
    const [isAutoTrading, setIsAutoTrading] = useState<boolean>(false);
    const [contractId, setContractId] = useState<string | null>(null);
    const [isBuying, setIsBuying] = useState<boolean>(false);
    const [autoTradingAuthorized, setAutoTradingAuthorized] = useState<boolean>(false);
    const [totalProfit, setTotalProfit] = useState<number>(0);
    const [tradeCount, setTradeCount] = useState<number>(0);
    
    // Auto Trading refs
    const isAutoTradingRef = useRef<boolean>(false);
    const contractIdRef = useRef<string | null>(null);
    const isProcessingRef = useRef<boolean>(false);
    const autoWsRef = useRef<WebSocket | null>(null);
    const autoPingInterval = useRef<NodeJS.Timeout | null>(null);

    // Auto Trading functions
    const autoLog = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[Auto-Trading] ${timestamp}: ${msg}`);
        // We could update status but keeping minimal for now
    }, []);

    const autoAuthorize = useCallback((authToken: string) => {
        if (!autoWsRef.current || autoWsRef.current.readyState !== WebSocket.OPEN) {
            autoLog("✗ WebSocket not connected for auto-trading");
            return false;
        }

        try {
            autoWsRef.current.send(
                JSON.stringify({
                    authorize: authToken,
                })
            );
            autoLog("→ Auto-trading authorization request sent");
            return true;
        } catch (error) {
            autoLog(`✗ Error sending auto-trading auth: ${error}`);
            return false;
        }
    }, [autoLog]);

    const autoBuyContract = useCallback(() => {
        if (!autoWsRef.current || autoWsRef.current.readyState !== WebSocket.OPEN || !autoTradingAuthorized) {
            autoLog("✗ Cannot buy: WebSocket not ready or not authorized");
            return false;
        }

        if (contractIdRef.current) {
            autoLog("✗ Contract already active. Sell it first.");
            return false;
        }

        if (isBuying) {
            autoLog("✗ Buy request already in progress");
            return false;
        }

        try {
            setIsBuying(true);
            autoWsRef.current.send(
                JSON.stringify({
                    buy: 1,
                    price: 0.35,
                    parameters: {
                        amount: 0.35,
                        basis: "stake",
                        contract_type: "CALL",
                        currency: "USD",
                        duration: 1,
                        duration_unit: "m",
                        symbol: "R_100",
                    },
                })
            );
            autoLog("→ Buy request sent");
            return true;
        } catch (error) {
            autoLog(`✗ Error sending buy request: ${error}`);
            setIsBuying(false);
            isProcessingRef.current = false;
            return false;
        }
    }, [autoLog, autoTradingAuthorized]);

    const autoSellContract = useCallback((specificContractId?: string) => {
        const idToSell = specificContractId || contractIdRef.current;
        
        if (!idToSell) {
            autoLog("✗ No active contract to sell");
            return false;
        }

        if (!autoWsRef.current || autoWsRef.current.readyState !== WebSocket.OPEN || !autoTradingAuthorized) {
            autoLog("✗ Cannot sell: WebSocket not ready or not authorized");
            return false;
        }

        try {
            autoWsRef.current.send(
                JSON.stringify({
                    sell: idToSell,
                    price: 0,
                })
            );
            autoLog("→ Sell request sent");
            return true;
        } catch (error) {
            autoLog(`✗ Error sending sell request: ${error}`);
            isProcessingRef.current = false;
            return false;
        }
    }, [autoLog, autoTradingAuthorized]);

    const startAutoTrading = useCallback(() => {
        if (!autoTradingAuthorized) {
            autoLog("✗ Please wait for authorization before starting auto-trading");
            return;
        }

        if (!autoWsRef.current || autoWsRef.current.readyState !== WebSocket.OPEN) {
            autoLog("✗ Cannot start auto-trading: WebSocket not connected");
            return;
        }

        if (isAutoTradingRef.current) {
            autoLog("⚠️ Auto-trading is already running");
            return;
        }

        setIsAutoTrading(true);
        isAutoTradingRef.current = true;
        autoLog("🚀 Auto-trading STARTED");
        
        // Update UI status
        setStatus("Demo to Real Auto-Trading Started");
        setToast({ type: 'ok', text: 'Demo to Real auto-trading started' });
        
        // Start the trading cycle if no contract is active
        if (!contractIdRef.current && !isBuying) {
            autoBuyContract();
        }
    }, [autoLog, autoTradingAuthorized, autoBuyContract]);

    const stopAutoTrading = useCallback(() => {
        if (!isAutoTradingRef.current) {
            return; // Already stopped
        }

        setIsAutoTrading(false);
        isAutoTradingRef.current = false;
        isProcessingRef.current = false;
        autoLog("⏹️ Auto-trading STOPPED");
        
        // Update UI status
        setStatus("Demo to Real Auto-Trading Stopped");
        setToast({ type: 'ok', text: 'Demo to Real auto-trading stopped' });
        setCopying(false);
    }, [autoLog]);

    const initAutoTradingWebSocket = useCallback((authToken: string) => {
        // Close existing connection if any
        if (autoWsRef.current) {
            autoWsRef.current.close();
        }

        const socket = new WebSocket(WS_URL);
        autoWsRef.current = socket;

        socket.onopen = () => {
            autoLog("Auto-trading WebSocket connected");
            setStatus("Auto-trading connected");
            
            // Start ping interval
            autoPingInterval.current = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ ping: 1 }));
                }
            }, 30000);

            // Authorize with the copier's token
            autoAuthorize(authToken);
        };

        socket.onmessage = (event: MessageEvent) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);

                if (data.msg_type === "authorize") {
                    if (data.error) {
                        autoLog(`✗ Authorization failed: ${data.error.message}`);
                        setAutoTradingAuthorized(false);
                        setStatus("Auto-trading auth failed");
                    } else {
                        setAutoTradingAuthorized(true);
                        autoLog("✓ Auto-trading authorized");
                        setStatus("Auto-trading authorized");
                        
                        // Start auto-trading immediately after authorization
                        setTimeout(() => {
                            startAutoTrading();
                        }, 500);
                    }
                } else if (data.msg_type === "buy" && data.buy) {
                    const id = String(data.buy.contract_id);
                    setContractId(id);
                    contractIdRef.current = id;
                    setIsBuying(false);
                    isProcessingRef.current = false;
                    autoLog(`✓ Contract bought. ID: ${id}`);
                    
                    // If auto-trading is on, schedule sell after 2 seconds
                    if (isAutoTradingRef.current) {
                        setTimeout(() => {
                            if (isAutoTradingRef.current && contractIdRef.current === id) {
                                autoSellContract(id);
                            }
                        }, 2000);
                    }
                } else if (data.msg_type === "sell" && data.sell) {
                    const profit = parseFloat(data.sell.profit);
                    setTotalProfit(prev => prev + profit);
                    setTradeCount(prev => prev + 1);
                    autoLog(`✓ Contract sold. Profit: ${profit.toFixed(2)} USD`);
                    setContractId(null);
                    contractIdRef.current = null;
                    isProcessingRef.current = false;
                    
                    // If auto-trading is on, buy again after short delay
                    if (isAutoTradingRef.current) {
                        setTimeout(() => {
                            if (isAutoTradingRef.current && !contractIdRef.current && !isBuying) {
                                autoBuyContract();
                            }
                        }, 500);
                    }
                } else if (data.error) {
                    autoLog(`✗ Error: ${data.error.message}`);
                    setIsBuying(false);
                    isProcessingRef.current = false;
                    
                    // If error during auto-trading, retry after delay
                    if (isAutoTradingRef.current) {
                        setTimeout(() => {
                            if (isAutoTradingRef.current && !contractIdRef.current && !isBuying) {
                                autoBuyContract();
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                autoLog(`✗ Error processing message: ${error}`);
                setIsBuying(false);
                isProcessingRef.current = false;
            }
        };

        socket.onerror = (error: Event) => {
            autoLog(`✗ Auto-trading WebSocket error: ${error}`);
            setStatus("Auto-trading connection error");
        };

        socket.onclose = () => {
            autoLog("Auto-trading WebSocket disconnected");
            setAutoTradingAuthorized(false);
            setIsBuying(false);
            isProcessingRef.current = false;
            stopAutoTrading();
            
            if (autoPingInterval.current) {
                clearInterval(autoPingInterval.current);
                autoPingInterval.current = null;
            }
        };
    }, [autoLog, autoAuthorize, startAutoTrading, stopAutoTrading, autoSellContract, autoBuyContract]);

    // Update refs when auto-trading states change
    useEffect(() => {
        isAutoTradingRef.current = isAutoTrading;
        contractIdRef.current = contractId;
    }, [isAutoTrading, contractId]);

    // Demo to Real Auto Trading Start/Stop
    const startDemoToRealAutoTrading = useCallback(() => {
        if (!token) {
            setStatus('Enter your API token');
            setToast({ type: 'err', text: 'Please enter your API token' });
            return;
        }

        // Initialize auto-trading WebSocket with copier's token
        initAutoTradingWebSocket(token);
        setCopying(true);
    }, [token, initAutoTradingWebSocket]);

    const stopDemoToRealAutoTrading = useCallback(() => {
        stopAutoTrading();
        setCopying(false);
        
        // Close auto-trading WebSocket
        if (autoWsRef.current) {
            autoWsRef.current.close();
            autoWsRef.current = null;
        }
    }, [stopAutoTrading]);

    // Original functions (keep as is)
    const send = useCallback((payload: Msg) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[WS] send skipped, socket not open');
            return false;
        }
        try {
            console.debug('[WS] -> send', payload);
            ws.send(JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('[WS] send error', err);
            return false;
        }
    }, []);

    const sendTagged = useCallback((payload: Msg, tag: string) => {
        const withTag = { ...payload, passthrough: { tag } };
        return send(withTag);
    }, [send]);

    const authorizeWith = useCallback((tkn: string, tag?: string) => {
        const payload: Msg = { authorize: tkn };
        if (tag) return sendTagged(payload, tag);
        return send(payload);
    }, [send, sendTagged]);

    const logoutTagged = useCallback((tag: string) => {
        return sendTagged({ logout: 1 }, tag);
    }, [sendTagged]);

    const getSettingsTagged = useCallback((tag: string) => {
        return sendTagged({ get_settings: 1 }, tag);
    }, [sendTagged]);

    const setSettingsTagged = useCallback((settings: Msg, tag: string) => {
        return sendTagged({ set_settings: 1, ...settings }, tag);
    }, [sendTagged]);

    const connect = useCallback(() => {
        console.info('[WS] connect() called', { url: WS_URL });
        setStatus('Connecting...');
        setConnected(false);
        setAuthorized(false);
        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = () => {
                console.info('[WS] open');
                setConnected(true);
                setStatus('Connected');
                if (pingRef.current) {
                    clearInterval(pingRef.current);
                    pingRef.current = null;
                }
                pingRef.current = window.setInterval(() => {
                    send({ ping: 1 });
                }, 30000);
            };
            ws.onmessage = ev => {
                try {
                    const data = JSON.parse(ev.data) as Msg;
                    const tag: string | undefined = data?.echo_req?.passthrough?.tag;

                    console.log('[WS] <- received', { 
                        msg_type: data.msg_type, 
                        tag, 
                        error: data.error,
                        has_copy_start: !!data.copy_start 
                    });

                    if (data.msg_type === 'authorize') {
                        if (data.error) {
                            setAuthorized(false);
                            setStatus(data.error.message || 'Authorization failed');
                            setToast({ type: 'err', text: data.error.message || 'Authorization failed' });
                        } else {
                            const loginId = data.authorize?.loginid;
                            flowRef.current.lastLoginId = loginId;
                            const isDemoAccount = loginId?.startsWith('VRTC') || loginId?.startsWith('VRTG');
                            setAuthorized(true);
                            setStatus(`Authorized (${isDemoAccount ? 'Demo' : 'Real'})`);
                            try {
                                localStorage.setItem('deriv_copier_token', token);
                                localStorage.setItem('deriv_copy_user_token', token);
                                setSavedToken(token);
                            } catch { }
                            setToast({ type: 'ok', text: 'Token saved & authorized' });
                        }
                        setBusy(false);

                        // Handle trader authorization for setup-and-copy flow
                        if (!data.error && tag === 'setup_auth_trader' && flowRef.current.mode === 'setup-and-copy') {
                            const traderLoginId = data.authorize?.loginid as string | undefined;
                            const isDemoTrader = traderLoginId?.startsWith('VRTC') || traderLoginId?.startsWith('VRTG');

                            flowRef.current.traderLoginId = traderLoginId;

                            if (flowRef.current.isDemoToReal && !isDemoTrader) {
                                const errMsg = 'Error: Expected demo trader but got real account';
                                setStatus(errMsg);
                                setToast({ type: 'err', text: errMsg });
                                setBusy(false);
                                flowRef.current = { mode: null, stage: null, copierToken: undefined };
                                return;
                            }

                            setStatus('Checking trader settings...');
                            setBusy(true);
                            getSettingsTagged('setup_get_settings_1');
                        }
                        // Handle copier authorization for setup-and-copy flow
                        if (!data.error && tag === 'setup_auth_copier' && flowRef.current.mode === 'setup-and-copy') {
                            const copierLoginId = data.authorize?.loginid as string | undefined;
                            flowRef.current.copierLoginId = copierLoginId;
                            setStatus('Starting copy...');
                            setBusy(true);

                            const traderToken = flowRef.current.isDemoToReal ? DEMO_TRADER_TOKEN : TRADER_TOKEN;

                            if (!traderToken) {
                                setStatus("Error: Trader token missing");
                                setToast({ type: 'err', text: "Trader token not found" });
                                setBusy(false);
                                flowRef.current = { mode: null, stage: null, copierToken: undefined };
                                return;
                            }

                            const payload: Msg = {
                                copy_start: traderToken
                            };

                            console.log("[COPY] Sending copy_start payload:", JSON.stringify(payload, null, 2));
                            
                            // Send with tag for tracking
                            sendTagged(payload, 'setup_copy_start');
                        }
                    }

                    if (data.msg_type === 'set_settings') {
                        if (data.error) {
                            setToast({ type: 'err', text: data.error.message || 'Failed to update trader settings' });
                            setStatus(data.error.message || 'Failed to update trader settings');
                        } else if (data.set_settings === 1) {
                            setToast({ type: 'ok', text: 'Trader setting updated: allow_copiers=1' });
                            setStatus('Trader now allows copiers');
                        }
                        setBusy(false);

                        if (!data.error && tag === 'setup_set_allow' && flowRef.current.mode === 'setup-and-copy') {
                            setStatus('Verifying trader settings...');
                            setBusy(true);
                            setTimeout(() => getSettingsTagged('setup_get_settings_2'), 500);
                        }
                    }

                    if (data.msg_type === 'get_settings') {
                        const allow = data.get_settings?.allow_copiers;
                        console.log('[SETTINGS] allow_copiers:', allow);
                        setBusy(false);
                        
                        if (tag === 'setup_get_settings_1' && flowRef.current.mode === 'setup-and-copy') {
                            if (allow !== 1) {
                                setStatus('Enabling copy permission on trader...');
                                setBusy(true);
                                const traderLoginId = flowRef.current.traderLoginId;
                                const payload: Msg = { set_settings: 1, allow_copiers: 1 };
                                if (traderLoginId) payload.loginid = traderLoginId;
                                sendTagged(payload, 'setup_set_allow');
                            } else {
                                setStatus('Trader already allows copying. Logging out...');
                                setBusy(true);
                                logoutTagged('setup_logout_trader');
                            }
                        }
                        
                        if (tag === 'setup_get_settings_2' && flowRef.current.mode === 'setup-and-copy') {
                            const allow = data.get_settings?.allow_copiers;
                            if (allow === 1) {
                                setStatus('Trader settings verified. Logging out...');
                                setBusy(true);
                                logoutTagged('setup_logout_trader');
                            } else {
                                setStatus('Error: Failed to enable copy permissions');
                                setToast({ type: 'err', text: 'Failed to enable copy permissions on trader account' });
                                flowRef.current = { mode: null, stage: null, copierToken: undefined };
                            }
                        }
                    }

                    if (data.msg_type === 'logout') {
                        console.log('[LOGOUT] Successfully logged out');
                        setBusy(false);
                        
                        if (tag === 'setup_logout_trader' && flowRef.current.mode === 'setup-and-copy') {
                            const copierToken = flowRef.current.copierToken || '';
                            setStatus('Authorizing copier...');
                            setBusy(true);
                            authorizeWith(copierToken, 'setup_auth_copier');
                        }
                    }

                    if (data.msg_type === 'copy_start') {
                        console.log('[COPY_START] Response:', data);
                        
                        if (data.error) {
                            const errorMsg = data.error.message || 'Copy start error';
                            setStatus(`❌ ${errorMsg}`);
                            setCopying(false);
                            setToast({ type: 'err', text: errorMsg });
                            if (flowRef.current.mode === 'setup-and-copy' && flowRef.current.copierToken) {
                                setPerStatus(ps => ({ ...ps, [flowRef.current.copierToken!]: 'error' }));
                            }
                            
                            flowRef.current = { mode: null, stage: null, copierToken: undefined };
                        } else if (data.copy_start === 1) {
                            setCopying(true);
                            const modeText = flowRef.current.isDemoToReal ? 'Demo to Real' : 'Real to Real';
                            setStatus(`✅ ${modeText} copying started successfully`);
                            setToast({ type: 'ok', text: `${modeText} copying started` });
                            if (flowRef.current.mode === 'setup-and-copy' && flowRef.current.copierToken) {
                                setPerStatus(ps => ({ ...ps, [flowRef.current.copierToken!]: 'copying' }));
                            }
                            
                            flowRef.current = { mode: null, stage: null, copierToken: undefined };
                        }
                        setBusy(false);
                    }

                    if (data.msg_type === 'ping') {
                        console.debug('[WS] pong received');
                    }

                    if (data.msg_type === 'copy_stop') {
                        console.log('[COPY_STOP] Response:', data);
                        
                        if (data.error) {
                            const errorMsg = data.error.message || 'Copy stop error';
                            setStatus(`❌ ${errorMsg}`);
                            setToast({ type: 'err', text: errorMsg });
                        } else if (data.copy_stop === 1) {
                            setCopying(false);
                            setStatus('⛔ Copying stopped');
                            if (flowRef.current.copierToken) {
                                setPerStatus(ps => ({ ...ps, [flowRef.current.copierToken!]: 'idle' }));
                            }
                        }
                        setBusy(false);
                        flowRef.current = { mode: null, stage: null, copierToken: undefined };
                    }
                } catch (err) {
                    console.error('[WS] Message parse error:', err);
                }
            };
            ws.onerror = (ev) => {
                console.error('[WS] error event');
                setStatus('WebSocket error - check console for details');
            };
            ws.onclose = (ev) => {
                console.warn('[WS] close');
                setConnected(false);
                setAuthorized(false);
                setStatus('Disconnected');
                if (pingRef.current) {
                    clearInterval(pingRef.current);
                    pingRef.current = null;
                }
            };
        } catch (err) {
            console.error('[WS] connect error', err);
            setStatus('Connection failed');
        }
    }, []);

    const authorize = useCallback(() => {
        if (!token) {
            setStatus('Enter your API token');
            setToast({ type: 'err', text: 'Please enter your API token' });
            return;
        }
        if (!connected) {
            setStatus('Connecting...');
            connect();
            return;
        }
        setBusy(true);
        const ok = authorizeWith(token);
        if (!ok) {
            setBusy(false);
            console.warn('[AUTH] send failed (socket not open)');
        }
    }, [connected, authorizeWith, token, connect]);

    const startSingleCopy = useCallback((cpToken: string, isDemoToReal: boolean = false) => {
        if (!cpToken) {
            setStatus('Enter your API token');
            setToast({ type: 'err', text: 'Please enter your API token' });
            return;
        }
        if (!connected) {
            setStatus('Connecting...');
            connect();
            return;
        }

        // For Demo to Real - use auto-trading instead
        if (isDemoToReal) {
            startDemoToRealAutoTrading();
            return;
        }

        // For real copy trading
        flowRef.current = {
            mode: 'setup-and-copy',
            stage: 'auth_trader',
            copierToken: cpToken,
            isDemoToReal: isDemoToReal,
            isSimulatedCopy: false
        };

        setBusy(true);
        const modeText = isDemoToReal ? 'demo trader' : 'real trader';
        setStatus(`Authorizing ${modeText}...`);

        const traderToken = isDemoToReal ? DEMO_TRADER_TOKEN : TRADER_TOKEN;
        
        if (!traderToken || traderToken === 'a87TQeZjHnpMPHM') {
            setStatus("Error: Please set valid TRADER_TOKEN and DEMO_TRADER_TOKEN");
            setToast({ type: 'err', text: "Invalid trader token configuration" });
            setBusy(false);
            flowRef.current = { mode: null, stage: null, copierToken: undefined };
            return;
        }

        authorizeWith(traderToken, 'setup_auth_trader');
    }, [connected, authorizeWith, connect, startDemoToRealAutoTrading]);

    const startCopy = useCallback(() => {
        if (!token) {
            setStatus('Enter your API token');
            setToast({ type: 'err', text: 'Please enter your API token' });
            return;
        }
        if (!connected) {
            setStatus('Connecting...');
            connect();
            return;
        }
        startSingleCopy(token, false);
    }, [connected, token, startSingleCopy, connect]);

    const startDemoToRealCopy = useCallback(() => {
        if (!token) {
            setStatus('Enter your API token');
            setToast({ type: 'err', text: 'Please enter your API token' });
            return;
        }
        if (!connected) {
            setStatus('Connecting...');
            connect();
            return;
        }
        startSingleCopy(token, true);
    }, [connected, token, startSingleCopy, connect]);

    const stopSingleCopy = useCallback((cpToken?: string) => {
        // For demo-to-real auto-trading
        if (isAutoTrading) {
            stopDemoToRealAutoTrading();
            return;
        }

        if (!connected) {
            setStatus('Not connected');
            setToast({ type: 'err', text: 'Not connected to WebSocket' });
            return;
        }

        if (!authorized) {
            setStatus('Authorize first');
            setToast({ type: 'err', text: 'Please authorize with your copier token first' });
            return;
        }
        
        setBusy(true);

        const traderToken = flowRef.current.isDemoToReal ? DEMO_TRADER_TOKEN : TRADER_TOKEN;

        if (!traderToken || traderToken === 'a87TQeZjHnpMPHM') {
            setStatus("Error: Trader token not configured");
            setToast({ type: 'err', text: "Trader token configuration error" });
            setBusy(false);
            return;
        }

        const payload: Msg = {
            copy_stop: traderToken
        };

        if (cpToken) flowRef.current.copierToken = cpToken;

        send(payload);
    }, [authorized, send, connected, isAutoTrading, stopDemoToRealAutoTrading]);

    const stopCopy = useCallback(() => {
        stopSingleCopy(token);
    }, [stopSingleCopy, token]);

    const stopDemoToRealCopy = useCallback(() => {
        stopSingleCopy(token);
    }, [stopSingleCopy, token]);

    const addToken = useCallback(() => {
        const t = token.trim();
        if (!t) {
            setToast({ type: 'err', text: 'Token is empty' });
            return;
        }
        
        if (t.length < 10) {
            setToast({ type: 'err', text: 'Token is too short' });
            return;
        }
        
        if (copierTokens.includes(t)) {
            setToast({ type: 'err', text: 'Token already exists' });
            return;
        }
        
        const updatedTokens = [...copierTokens, t];
        setCopierTokens(updatedTokens);
        try {
            localStorage.setItem('copier_tokens_list', JSON.stringify(updatedTokens));
        } catch (e) {
            console.warn('Failed to save tokens to localStorage:', e);
        }
        setToast({ type: 'ok', text: 'Token added successfully' });
        setToken('');
    }, [token, copierTokens]);

    const saveAndAuthorize = useCallback(() => {
        const t = token.trim();
        if (!t) {
            setToast({ type: 'err', text: 'Token is empty' });
            return;
        }
        
        try {
            localStorage.setItem('deriv_copier_token', t);
            setSavedToken(t);
            setToast({ type: 'ok', text: 'Token saved' });
            authorize();
        } catch (error) {
            console.error('Error saving token:', error);
            setToast({ type: 'err', text: 'Failed to save token' });
        }
    }, [token, authorize]);

    // Cleanup effect
    useEffect(() => {
        connect();
        try {
            const t = localStorage.getItem('deriv_copier_token') || localStorage.getItem('deriv_copy_user_token');
            if (t) {
                setSavedToken(t);
            }
            const listRaw = localStorage.getItem('copier_tokens_list');
            if (listRaw) {
                const arr = JSON.parse(listRaw) as string[];
                if (Array.isArray(arr)) setCopierTokens(arr);
            }
        } catch { }
        return () => {
            // Cleanup original WebSocket
            wsRef.current?.close();
            if (pingRef.current) {
                clearInterval(pingRef.current);
                pingRef.current = null;
            }
            
            // Cleanup auto-trading WebSocket
            if (autoWsRef.current) {
                autoWsRef.current.close();
                autoWsRef.current = null;
            }
            if (autoPingInterval.current) {
                clearInterval(autoPingInterval.current);
                autoPingInterval.current = null;
            }
        };
    }, [connect]);

    const canStart = connected && !busy && !copying && !isAutoTrading && !!token;
    const canStopDemoToReal = isAutoTrading || copying;
    const canStop = (connected && !busy && copying) || isAutoTrading;

    return (
        <div style={{ 
            width: '100%',
            minHeight: isMobile ? '75vh' : '100vh',
            height: isMobile ? '75vh' : '100%',
            display: 'flex',
            flexDirection: 'column' as const,
            padding: isMobile ? '10px' : '20px',
            boxSizing: 'border-box' as const,
            overflowX: 'hidden' as const,
            overflowY: 'auto' as const,
            backgroundColor: '#dddbdbff'
        }}>
            {/* Demo to Real Banner */}
            <div style={{
                width: '100%',
                minHeight: isMobile ? '120px' : '150px',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: isMobile ? '15px 12px' : '20px 16px',
                marginTop: isMobile ? '5px' : '10px',
                borderRadius: '12px',
                boxSizing: 'border-box' as const,
                position: 'relative' as const,
                paddingBottom: isMobile ? '40px' : '50px',
                flexDirection: isMobile ? 'column' : 'row' as const,
                gap: isMobile ? '15px' : '0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <button 
                    style={{
                        backgroundColor: isAutoTrading ? '#f44336' : '#4CAF50',
                        color: 'white',
                        padding: isMobile ? '12px 16px' : '14px 24px',
                        borderRadius: '8px',
                        fontWeight: '600' as const,
                        alignSelf: isMobile ? 'stretch' : 'flex-start',
                        border: 'none',
                        cursor: canStart ? 'pointer' : 'not-allowed',
                        opacity: canStart ? 1 : 0.6,
                        fontSize: isMobile ? '15px' : '16px',
                        transition: 'all 0.2s',
                        textAlign: 'center' as const,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onClick={isAutoTrading ? stopDemoToRealCopy : startDemoToRealCopy}
                    disabled={!canStart && !isAutoTrading}
                    onMouseEnter={e => {
                        if (canStart || isAutoTrading) {
                            e.currentTarget.style.backgroundColor = isAutoTrading ? '#d32f2f' : '#43a047';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (canStart || isAutoTrading) {
                            e.currentTarget.style.backgroundColor = isAutoTrading ? '#f44336' : '#4CAF50';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }
                    }}
                >
                    {isAutoTrading ? '🛑 Stop Demo to Real' : '🚀 Start Demo to Real'}
                </button>
                <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '10px',
                    right: '10px',
                    height: isMobile ? '25px' : '30px',
                    backgroundColor: '#0a0796ff',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
            </div>

            {/* Title */}
            <h2 style={{
                fontWeight: '700',
                fontSize: isMobile ? '20px' : '24px',
                margin: isMobile ? '15px 0 10px' : '20px 0 15px',
                color: '#0a1aadff',
                textAlign: isMobile ? 'center' : 'left' as const
            }}>
                Add tokens to replicator
            </h2>

            {/* Token Input Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px',
                marginTop: '5px',
                boxSizing: 'border-box' as const,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '16px' : '20px',
                    width: '100%'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row' as const,
                        alignItems: 'center',
                        gap: isMobile ? '15px' : '12px',
                        width: '100%'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            backgroundColor: '#f5f5f5',
                            padding: isMobile ? '10px 14px' : '12px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid #e0e0e0',
                            alignSelf: isMobile ? 'center' : 'stretch'
                        }}>
                            <FaYoutube style={{ color: '#FF0000', fontSize: isMobile ? '22px' : '24px' }} />
                            <span style={{
                                color: '#333',
                                fontSize: isMobile ? '10px' : '11px',
                                marginTop: '3px',
                                fontWeight: '500'
                            }}>
                                Tutorial
                            </span>
                        </div>
                        <input
                            type="password"
                            placeholder="Enter copier API token"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            style={{
                                flex: 1,
                                padding: isMobile ? '14px 16px' : '12px 16px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '8px',
                                fontSize: isMobile ? '16px' : '14px',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box' as const,
                                backgroundColor: '#fafafa',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                        <div style={{ 
                            display: 'flex', 
                            gap: isMobile ? '10px' : '12px',
                            width: isMobile ? '100%' : 'auto',
                            flexDirection: isMobile ? 'row' : 'row' as const
                        }}>
                            <button 
                                style={{
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    padding: isMobile ? '14px 16px' : '12px 20px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap' as const,
                                    transition: 'all 0.2s',
                                    opacity: !token ? 0.6 : 1,
                                    cursor: !token ? 'not-allowed' : 'pointer',
                                    fontSize: isMobile ? '15px' : '14px',
                                    flex: isMobile ? 1 : 'none',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onClick={addToken}
                                disabled={!token}
                                onMouseEnter={e => {
                                    if (token) {
                                        e.currentTarget.style.backgroundColor = '#43a047';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (token) {
                                        e.currentTarget.style.backgroundColor = '#4CAF50';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                    }
                                }}
                            >
                                <span>Add</span>
                            </button>
                            <button 
                                style={{
                                    backgroundColor: '#0b37b3ff',
                                    color: 'white',
                                    border: 'none',
                                    padding: isMobile ? '14px 16px' : '12px 20px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap' as const,
                                    transition: 'all 0.2s',
                                    opacity: (!connected || busy || !token) ? 0.6 : 1,
                                    cursor: (!connected || busy || !token) ? 'not-allowed' : 'pointer',
                                    fontSize: isMobile ? '15px' : '14px',
                                    flex: isMobile ? 1 : 'none',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onClick={saveAndAuthorize}
                                disabled={!connected || busy || !token}
                                onMouseEnter={e => {
                                    if (connected && !busy && token) {
                                        e.currentTarget.style.backgroundColor = '#0a2d99';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (connected && !busy && token) {
                                        e.currentTarget.style.backgroundColor = '#0b37b3ff';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                    }
                                }}
                            >
                                <span>{busy ? 'Authorizing...' : 'Authorize'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Tokens Container */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px',
                marginTop: isMobile ? '15px' : '20px',
                boxSizing: 'border-box' as const,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flex: '0 0 auto'
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row' as const,
                    gap: isMobile ? '15px' : '0',
                    width: '100%'
                }}>
                    {/* Token Display */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '12px' : '20px',
                        flexDirection: isMobile ? 'column' : 'row' as const,
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <div style={{
                            backgroundColor: '#f0f4ff',
                            padding: isMobile ? '12px 16px' : '10px 16px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: isMobile ? '14px' : '14px',
                            color: '#1a237e',
                            border: '2px solid #d1d9ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap' as const,
                            justifyContent: 'center',
                            width: isMobile ? '100%' : 'auto',
                            boxSizing: 'border-box' as const
                        }}>
                            <span style={{ fontWeight: '600' }}>API Token:</span>
                            <span style={{ fontWeight: '500' }}>{savedToken ? `${savedToken.slice(0, 4)}...${savedToken.slice(-4)}` : 'No token saved'}</span>
                            <span style={{
                                color: authorized ? '#4caf50' : '#f44336',
                                fontSize: isMobile ? '12px' : '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: authorized ? '#4caf50' : '#f44336',
                                    borderRadius: '50%',
                                    display: 'inline-block'
                                }}></span>
                                {authorized ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        
                        {/* Status Display */}
                        <div style={{
                            padding: isMobile ? '10px 14px' : '8px 14px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '8px',
                            fontSize: isMobile ? '14px' : '14px',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: 'center',
                            border: '1px solid #e0e0e0',
                            boxSizing: 'border-box' as const
                        }}>
                            <span style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: isAutoTrading ? '#f39c12' : 
                                            copying ? '#4caf50' : 
                                            connected ? '#4caf50' : '#f44336',
                                borderRadius: '50%',
                                display: 'inline-block'
                            }}></span>
                            <span style={{
                                maxWidth: isMobile ? '180px' : '250px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: '500'
                            }}>
                                {isAutoTrading ? 'Demo to Real Auto-Trading' : status}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        gap: isMobile ? '10px' : '12px',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <button 
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '14px 16px' : '12px 20px',
                                borderRadius: '8px',
                                cursor: canStart ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                fontSize: isMobile ? '15px' : '15px',
                                whiteSpace: 'nowrap' as const,
                                transition: 'all 0.2s',
                                opacity: canStart ? 1 : 0.6,
                                flex: isMobile ? 1 : 'none',
                                textAlign: 'center' as const,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={startCopy}
                            disabled={!canStart}
                            onMouseEnter={e => {
                                if (canStart) {
                                    e.currentTarget.style.backgroundColor = '#43a047';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (canStart) {
                                    e.currentTarget.style.backgroundColor = '#4CAF50';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }}
                        >
                            {isMobile ? 'Start Real' : 'Start Real Copy Trading'}
                        </button>
                        <button 
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '14px 16px' : '12px 20px',
                                borderRadius: '8px',
                                cursor: canStop ? 'pointer' : 'not-allowed',
                                fontWeight: '600',
                                fontSize: isMobile ? '15px' : '15px',
                                whiteSpace: 'nowrap' as const,
                                transition: 'all 0.2s',
                                opacity: canStop ? 1 : 0.6,
                                flex: isMobile ? 1 : 'none',
                                textAlign: 'center' as const,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={stopCopy}
                            disabled={!canStop}
                            onMouseEnter={e => {
                                if (canStop) {
                                    e.currentTarget.style.backgroundColor = '#d32f2f';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (canStop) {
                                    e.currentTarget.style.backgroundColor = '#f44336';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }
                            }}
                        >
                            {isMobile ? 'Stop' : 'Stop Copy Trading'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Copier Tokens List */}
            {copierTokens.length > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: isMobile ? '16px' : '20px',
                    marginTop: isMobile ? '15px' : '20px',
                    boxSizing: 'border-box' as const,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: isMobile ? '20px' : '30px'
                }}>
                    <h3 style={{
                        fontWeight: '700',
                        fontSize: isMobile ? '18px' : '20px',
                        margin: '0 0 15px 0',
                        color: '#0a1aadff',
                        textAlign: isMobile ? 'center' : 'left' as const
                    }}>
                        Copier Tokens ({copierTokens.length})
                    </h3>
                    
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? '12px' : '15px'
                    }}>
                        {copierTokens.map((tkn) => (
                            <div key={tkn} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: isMobile ? '14px 16px' : '16px 20px',
                                backgroundColor: perStatus[tkn] === 'copying' ? '#f0f9f0' : '#f5f5f5',
                                borderRadius: '10px',
                                borderLeft: `5px solid ${
                                    perStatus[tkn] === 'copying' ? '#4CAF50' : 
                                    perStatus[tkn] === 'error' ? '#f44336' : '#9e9e9e'
                                }`,
                                flexDirection: isMobile ? 'column' : 'row' as const,
                                gap: isMobile ? '15px' : '0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: isMobile ? '12px' : '15px',
                                    flexDirection: isMobile ? 'column' : 'row' as const,
                                    width: isMobile ? '100%' : 'auto'
                                }}>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        fontSize: isMobile ? '15px' : '16px',
                                        color: '#333',
                                        textAlign: 'center',
                                        fontWeight: '500'
                                    }}>
                                        {tkn.slice(0, isMobile ? 4 : 6)}...{tkn.slice(-4)}
                                    </span>
                                    <span style={{
                                        fontSize: isMobile ? '12px' : '13px',
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        backgroundColor: perStatus[tkn] === 'copying' ? '#e8f5e8' : 
                                                    perStatus[tkn] === 'error' ? '#ffebee' : '#eeeeee',
                                        color: perStatus[tkn] === 'copying' ? '#2e7d32' : 
                                            perStatus[tkn] === 'error' ? '#c62828' : '#616161',
                                        fontWeight: '600',
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}>
                                        {perStatus[tkn] || 'idle'}
                                    </span>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    gap: isMobile ? '8px' : '10px',
                                    flexWrap: 'wrap' as const,
                                    justifyContent: isMobile ? 'center' : 'flex-end',
                                    width: isMobile ? '100%' : 'auto'
                                }}>
                                    <button
                                        style={{
                                            backgroundColor: '#4CAF50',
                                            color: 'white',
                                            border: 'none',
                                            padding: isMobile ? '10px 16px' : '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: isMobile ? '13px' : '13px',
                                            opacity: (!connected || busy) ? 0.6 : 1,
                                            cursor: (!connected || busy) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            minWidth: isMobile ? '70px' : 'auto',
                                            fontWeight: '600',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}
                                        onClick={() => startSingleCopy(tkn, false)}
                                        disabled={!connected || busy}
                                        onMouseEnter={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#43a047';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#4CAF50';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                            }
                                        }}
                                    >
                                        Start
                                    </button>
                                    <button
                                        style={{
                                            backgroundColor: '#2196F3',
                                            color: 'white',
                                            border: 'none',
                                            padding: isMobile ? '10px 16px' : '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: isMobile ? '13px' : '13px',
                                            opacity: (!connected || busy) ? 0.6 : 1,
                                            cursor: (!connected || busy) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            minWidth: isMobile ? '70px' : 'auto',
                                            fontWeight: '600',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}
                                        onClick={() => startSingleCopy(tkn, true)}
                                        disabled={!connected || busy}
                                        onMouseEnter={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#1976d2';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#2196F3';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                            }
                                        }}
                                    >
                                        {isMobile ? 'Demo→Real' : 'Demo→Real'}
                                    </button>
                                    <button
                                        style={{
                                            backgroundColor: '#f44336',
                                            color: 'white',
                                            border: 'none',
                                            padding: isMobile ? '10px 16px' : '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: isMobile ? '13px' : '13px',
                                            opacity: (!connected || busy) ? 0.6 : 1,
                                            cursor: (!connected || busy) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            minWidth: isMobile ? '70px' : 'auto',
                                            fontWeight: '600',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}
                                        onClick={() => stopSingleCopy(tkn)}
                                        disabled={!connected || busy}
                                        onMouseEnter={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#d32f2f';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (connected && !busy) {
                                                e.currentTarget.style.backgroundColor = '#f44336';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                            }
                                        }}
                                    >
                                        Stop
                                    </button>
                                    <button
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: '#666',
                                            border: '2px solid #ddd',
                                            padding: isMobile ? '10px 16px' : '8px 16px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: isMobile ? '13px' : '13px',
                                            transition: 'all 0.2s',
                                            minWidth: isMobile ? '70px' : 'auto',
                                            fontWeight: '600'
                                        }}
                                        onClick={() => {
                                            const next = copierTokens.filter(x => x !== tkn);
                                            setCopierTokens(next);
                                            try {
                                                localStorage.setItem('copier_tokens_list', JSON.stringify(next));
                                            } catch (e) {
                                                console.warn('Failed to update localStorage:', e);
                                            }
                                            setPerStatus(ps => { const c = { ...ps }; delete c[tkn]; return c; });
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                                            e.currentTarget.style.borderColor = '#999';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.borderColor = '#ddd';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: isMobile ? '10px' : '20px',
                    right: isMobile ? '10px' : '20px',
                    left: isMobile ? '10px' : 'auto',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isMobile ? '14px 18px' : '16px 24px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    backgroundColor: toast.type === 'ok' ? '#4CAF50' : '#f44336',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    animation: 'slideInRight 0.3s ease',
                    maxWidth: isMobile ? 'calc(100% - 20px)' : '400px'
                }}>
                    <div style={{ fontSize: '20px' }}>
                        {toast.type === 'ok' ? '✓' : '⚠'}
                    </div>
                    <span style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: isMobile ? '14px' : '15px'
                    }}>
                        {toast.text}
                    </span>
                </div>
            )}

            <style jsx global>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                /* Mobile optimizations */
                @media (max-width: 768px) {
                    input, textarea, select {
                        font-size: 16px !important; /* Prevent zoom on iOS */
                    }
                    
                    button {
                        touch-action: manipulation; /* Improve touch response */
                    }
                    
                    /* Improve scrolling on mobile */
                    body {
                        -webkit-overflow-scrolling: touch;
                        overflow-x: hidden;
                    }
                }
            `}</style>
        </div>
    );
};

export default CopyTrading;
