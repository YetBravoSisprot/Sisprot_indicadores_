import React, { useState, useContext, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PasswordContext } from '../../PasswordContext/PasswordContext';
import { processQuery } from './AiEngine';
import { exportToExcel } from '../../utils/ExcelExport';
import { exportExecutiveReport } from '../../utils/ExecutiveReport';
import './Chatbot.css';

const CHRONOS_ICON = `${process.env.PUBLIC_URL}/ICON_chatbot.png`;

// Iconos SVG en línea (trazo uniforme, heredan el color del texto)
const ICON_PATHS = {
    money: <><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.7 5.2 1.4 5.2 4 0 1.1-1.1 2-2.7 2-1.2 0-2.2-.5-2.7-1.4M12 6.5V8m0 8v1.5" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.4-3.2 2.8-5 6-5s5.6 1.8 6 5" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.3c2 .5 3.2 2.2 3.5 4.7" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.3 4.5L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    send: <path d="M12 19V5M5 12l7-7 7 7" />,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    speakerOn: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
    speakerOff: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l4 6M21 9l-4 6" /></>,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>
};

const Icon = ({ name, size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        {ICON_PATHS[name]}
    </svg>
);

// Accesos rápidos de la bienvenida: cada uno dispara una consulta real al motor BI
const getWelcomeActions = () => {
    const year = new Date().getFullYear();
    return [
        { id: 'ingresos', icon: 'money', label: 'Consultar ingresos', hint: 'Recaudación total acumulada', query: '¿Cuánto hemos recaudado en total?' },
        { id: 'clientes', icon: 'users', label: 'Contar clientes', hint: 'Activos sobre la cartera', query: '¿Cuántos clientes activos tenemos?' },
        { id: 'reactivaciones', icon: 'refresh', label: 'Ver reactivaciones', hint: `Cancelados recuperados en ${year}`, query: `¿Cuántos clientes se reactivaron en ${year}?` },
        { id: 'ventas', icon: 'chart', label: 'Comparar ventas', hint: `${year - 1} vs ${year}`, query: `Compara las ventas de ${year - 1} con las de ${year}` }
    ];
};

const Chatbot = () => {
    const { data, isAuthenticated, email, role } = useContext(PasswordContext);
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);

    // ── SUGERENCIAS CONTEXTUALES POR PÁGINA (Sisprot BI) ──
    const getContextualSuggestions = () => {
        const path = (location.pathname || '').toLowerCase();
        if (path.includes("admin")) {
            return [
                "📊 Resume los principales KPIs",
                "💰 ¿Cuál es el ARPU actual?",
                "📉 ¿Cuál es la tasa de baja actual?",
                "🏛️ ¿Cuánto hemos recaudado en total?",
                "👥 ¿Cuántos clientes activos tenemos?"
            ];
        }
        if (path.includes("ventasglobales")) {
            return [
                "📈 ¿Cuánto hemos vendido durante 2026?",
                "🔄 Compara ventas de 2025 con 2026",
                "🏆 ¿Cuál fue el mes con mayores ventas?",
                "💵 ¿Cuánto ingresó por ventas en 2026?"
            ];
        }
        if (path.includes("reactivados")) {
            return [
                "🔄 ¿Cuántos clientes se reactivaron este año?",
                "💵 ¿Cuánto ingreso recuperado se registra?",
                "📍 ¿Qué sectores tienen más reactivaciones?",
                "👥 ¿Qué porcentaje son residenciales vs pymes?"
            ];
        }
        if (path.includes("indicadores")) {
            return [
                "🛡️ ¿Cuál es la salud de la cartera?",
                "💸 ¿Cuánto dinero tenemos pendiente de recuperar?",
                "📉 ¿Cuál es la fuga de capital por cancelaciones?",
                "❓ ¿Qué diferencia hay entre suspendidos y cancelados?"
            ];
        }
        if (path.includes("topurbanismo")) {
            return [
                "🏙️ ¿Cuál es el sector con más clientes activos?",
                "📋 ¿Cuántos suspendidos hay actualmente?",
                "💳 ¿Qué plan genera más ingresos?",
                "🏦 Ver balance de cobranza bancaria"
            ];
        }
        return [
            "📊 Resume los principales KPIs",
            "👥 ¿Cuántos clientes activos tenemos?",
            "💸 ¿Cuánto dinero tenemos pendiente de recuperar?",
            "📈 ¿Cuánto hemos vendido durante 2026?"
        ];
    };

    // ── CONFIGURACIÓN DE VOZ (Texto a Voz) ──
    const speakInitial = (text) => {
        if (!isVoiceEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // Detener cualquier lectura previa
        const cleanText = text.replace(/\*\*/g, '').replace(/•/g, ''); // Limpiar markdown para que no lea "asterisco"
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    // ── Nombre para la bienvenida (la bienvenida se renderiza como vista, no como mensaje) ──
    const displayName = (() => {
        if (!email) return '';
        const first = email.split('@')[0].replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
        return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
    })();

    // Estado de conexión real del navegador (se refleja en el encabezado y la burbuja)
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // Textarea que crece con el contenido (máx. 120px)
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [inputValue, isOpen]);

    // Enfocar el campo al abrir (solo en dispositivos con puntero preciso para no abrir el teclado móvil)
    useEffect(() => {
        if (!isOpen) return;
        const canHover = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
        if (!canHover) return;
        const t = setTimeout(() => inputRef.current?.focus(), 350);
        return () => clearTimeout(t);
    }, [isOpen]);

    // Auto-scroll al final cuando hay nuevos mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!isOpen) return;

        // Sin mensajes: se muestra la bienvenida desde el inicio
        if (messages.length === 0) {
            if (messagesContainerRef.current) messagesContainerRef.current.scrollTop = 0;
            return;
        }

        // Con conversación activa, scroll AL FINAL
        scrollToBottom();
    }, [messages, isOpen, isTyping]);


    const handleToggle = () => setIsOpen(!isOpen);

    const handleResetChat = () => {
        setShowResetModal(true);
    };

    const confirmReset = () => {
        // Reinicia el chat: al quedar vacío vuelve a mostrarse la bienvenida con accesos rápidos
        setMessages([]);
        setInputValue('');
        setShowResetModal(false);
    };

    const cancelReset = () => {
        setShowResetModal(false);
    };

    // ── RECONOCIMIENTO DE VOZ (Voz a Texto) ──
    const handleVoiceInput = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
        };

        recognition.start();
    };

    // Auto-leer mensajes del bot si la voz está activa
    useEffect(() => {
        if (isVoiceEnabled && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender === 'bot') {
                speakInitial(lastMsg.text);
            }
        }
    }, [messages, isVoiceEnabled]);

    if (isMinimized) {
        return (
            <button
                type="button"
                className="chatbot-restore-btn animate-pop-in"
                onClick={() => setIsMinimized(false)}
                title="Abrir Asistente Chronos"
                aria-label="Abrir asistente Chronos"
            >
                <img src={CHRONOS_ICON} alt="" className="fab-icon" draggable="false" />
            </button>
        );
    }

    if (!isAuthenticated) return null;

    const handleSendMessage = async (e, directValue = null) => {
        if (e) e.preventDefault();
        // Evita envíos duplicados mientras Chronos consulta los datos
        if (isTyping) return;

        const messageToProcess = directValue !== null ? directValue : inputValue.trim();
        if (!messageToProcess) return;

        const userMsg = messageToProcess;
        const currentMessages = [...messages, { sender: 'user', text: userMsg, isCard: false }];

        setMessages(currentMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            const baseName = email ? email.split('@')[0] : '';
            const cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
            const formattedName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() : '';

            const aiResponse = await processQuery(userMsg, data, currentMessages, formattedName, location.pathname, role || "admin");
            setMessages(prev => [...prev, { sender: 'bot', ...aiResponse }]);

            // ── MANEJO DE DESCARGAS AUTOMÁTICAS (NUEVO) ──
            if (aiResponse.action === 'download_excel_executive' && (aiResponse.cardData?.dataset || aiResponse.cardData?.savedDataset)) {
                setTimeout(() => {
                    exportExecutiveReport(
                        aiResponse.cardData.dataset || aiResponse.cardData.savedDataset,
                        aiResponse.cardData.filtersText,
                        formattedName,
                        aiResponse.cardData.selectedColumns || ["Todas"],
                        data?.results
                    );
                }, 1000);
            } else if ((aiResponse.isDownload || aiResponse.action === 'download_excel') && (aiResponse.cardData?.dataset || aiResponse.cardData?.savedDataset)) {
                const dataset = aiResponse.cardData.dataset || aiResponse.cardData.savedDataset;
                const rType = aiResponse.cardData.reportType || (aiResponse.cardData.parameters?.reportType) || "general";

                setTimeout(() => {
                    // Si el reporte es general o ejecutivo, usamos el nuevo layout
                    if (rType === 'general' || rType === 'accounting' || rType === 'executive') {
                        exportExecutiveReport(
                            dataset,
                            aiResponse.cardData.filtersText,
                            formattedName,
                            aiResponse.cardData.selectedColumns || ["Todas"],
                            data?.results
                        );
                    } else {
                        // Solo usamos el export técnico para operaciones específicas
                        exportToExcel(dataset, aiResponse.cardData.filtersText, aiResponse.cardData.selectedColumns || ["Todas"], rType);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error("Error AI:", error);
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: "No pude completar la consulta en este momento. Puedes reintentarla.",
                isCard: false,
                isError: true,
                retryQuery: userMsg
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Enter envía; Shift+Enter inserta salto de línea (respeta la composición IME)
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSendMessage(null);
        }
    };

    // Helper para renderizar negritas (**), saltos de línea (\n) y TABLAS markdown
    const renderFormattedText = (text) => {
        if (!text) return null;

        // Detectar si hay una tabla en el texto (| col | col |)
        const parts = text.split(/(\|[^\n]+\|\n\|[ \-:|]+\|\n(?:\|[^\n]+\|\n?)+)/);

        return parts.map((part, i) => {
            // Si es una tabla, la procesamos
            if (part.startsWith('|') && part.includes('\n|')) {
                const lines = part.trim().split('\n');
                const header = lines[0].split('|').filter(cell => cell.trim().length > 0);
                const body = lines.slice(2).map(line => line.split('|').filter(cell => cell.trim().length > 0));

                return (
                    <div className="chat-table-container" key={i}>
                        <table>
                            <thead>
                                <tr>
                                    {header.map((h, index) => <th key={index}>{h.trim()}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {body.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex}>
                                                {cell.trim().split(/(\*\*.*?\*\*)/).map((p, k) => {
                                                    if (p.startsWith("**") && p.endsWith("**")) {
                                                        return <strong key={k}>{p.slice(2, -2)}</strong>;
                                                    }
                                                    return p;
                                                })}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            // Si es texto normal, procesamos negritas y saltos de línea
            return part.split("\n").map((line, j) => (
                <React.Fragment key={`${i}-${j}`}>
                    {line.split(/(\*\*.*?\*\*)/).map((segment, k) => {
                        if (segment.startsWith("**") && segment.endsWith("**")) {
                            return <strong key={k}>{segment.slice(2, -2)}</strong>;
                        }
                        return segment;
                    })}
                    {j < part.split("\n").length - 1 && <br />}
                </React.Fragment>
            ));
        });
    };

    return (
        <>
            {/* Modal de Confirmación: Reiniciar Conversación */}
            {showResetModal && (
                <div className="reset-modal-overlay" onClick={cancelReset}>
                    <div className="reset-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="reset-modal-icon">🔄</div>
                        <h3 className="reset-modal-title">¿Reiniciar conversación?</h3>
                        <p className="reset-modal-desc">Se borrará todo el historial del chat actual. Esta acción no se puede deshacer.</p>
                        <div className="reset-modal-actions">
                            <button className="reset-modal-btn cancel" onClick={cancelReset}>Cancelar</button>
                            <button className="reset-modal-btn confirm" onClick={confirmReset}>Sí, reiniciar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Burbuja flotante premium: robot Chronos + halo animado + señal de disponibilidad */}
            <button
                type="button"
                className={`chatbot-toggle-wrapper ${isOpen ? 'open' : ''} ${isOnline ? '' : 'offline'}`}
                onClick={handleToggle}
                aria-label={isOpen ? 'Cerrar asistente Chronos' : 'Abrir asistente Chronos'}
                aria-expanded={isOpen}
                aria-controls="chronos-panel"
                title={isOpen ? 'Cerrar' : 'Chronos · Asistente de inteligencia de negocios'}
            >
                <span className="fab-halo" aria-hidden="true"></span>
                <span className="fab-halo delay" aria-hidden="true"></span>
                <span className="fab-core">
                    {isOpen ? (
                        <span className="close-btn"><Icon name="close" size={24} /></span>
                    ) : (
                        <>
                            <img src={CHRONOS_ICON} alt="" className="fab-icon" draggable="false" />
                            {isOnline && <span className="fab-presence-pulse" aria-hidden="true"></span>}
                        </>
                    )}
                </span>
            </button>

            {/* Ventana de Chat */}
            <div
                id="chronos-panel"
                role="dialog"
                aria-label="Chronos, asistente de inteligencia de negocios"
                aria-hidden={!isOpen}
                className={`chatbot-window glass ${isOpen ? 'active' : ''}`}
                onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
            >
                <header className="chatbot-header">
                    <div className="chronos-avatar-wrap">
                        <img src={CHRONOS_ICON} alt="" className="chronos-avatar" draggable="false" />
                        <span className={`chronos-presence ${isOnline ? 'online' : 'offline'}`} aria-hidden="true"></span>
                    </div>
                    <div className="header-info">
                        <h4>Chronos</h4>
                        <p className="header-subtitle">Tu asistente de inteligencia de negocios</p>
                        <p className={`header-status-text ${isOnline ? '' : 'offline'}`} role="status">
                            <span className="live-pulse"></span> {isOnline ? 'Conectado' : 'Sin conexión'}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="reset-chat-btn"
                        onClick={handleResetChat}
                        disabled={messages.length === 0}
                        title="Reiniciar conversación"
                        aria-label="Reiniciar conversación"
                    >
                        <Icon name="reset" size={18} />
                    </button>
                </header>

                <div className="chatbot-messages" ref={messagesContainerRef} aria-live="polite">
                    {/* Bienvenida breve con accesos rápidos: cada uno lanza una consulta real */}
                    {messages.length === 0 && (
                        <div className="chronos-welcome">
                            <img src={CHRONOS_ICON} alt="" className="welcome-orb" draggable="false" />
                            <h3>Hola{displayName ? <>, <span className="welcome-accent">{displayName}</span></> : ''}</h3>
                            <p>Soy Chronos. Pregúntame por los datos de Sisprot BI o elige una consulta rápida.</p>
                            <div className="welcome-actions">
                                {getWelcomeActions().map(action => (
                                    <button
                                        key={action.id}
                                        type="button"
                                        className="welcome-action"
                                        onClick={() => handleSendMessage(null, action.query)}
                                        disabled={isTyping}
                                        title={action.query}
                                    >
                                        <span className="welcome-action-icon"><Icon name={action.icon} size={20} /></span>
                                        <span className="welcome-action-text">
                                            <strong>{action.label}</strong>
                                            <small>{action.hint}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chat-bubble-wrapper ${msg.sender}`}>
                            {msg.sender === 'bot' && (
                                <img src={CHRONOS_ICON} alt="" className="msg-avatar" draggable="false" />
                            )}
                            <div className="msg-body">
                            {msg.text && (
                                <div className={`chat-bubble ${msg.sender}`}>
                                    {renderFormattedText(msg.text)}
                                </div>
                            )}

                            {/* Reintento ante un error de consulta (solo en el último mensaje) */}
                            {msg.isError && msg.retryQuery && idx === messages.length - 1 && (
                                <button
                                    type="button"
                                    className="retry-btn"
                                    onClick={() => handleSendMessage(null, msg.retryQuery)}
                                    disabled={isTyping}
                                >
                                    <Icon name="refresh" size={14} /> Reintentar
                                </button>
                            )}

                            {/* Renderizado de una Data Card si la respuesta de IA lo incluye */}
                            {msg.isCard && msg.cardData && (
                                <div className={`chat-data-card animate-slide-up ${msg.contextType || ''}`}>
                                    <h5 style={{ color: msg.cardData.color || '#1e90ff' }}>{msg.cardData.title}</h5>

                                    {msg.cardData.value && (
                                        <div className="card-main-value">{msg.cardData.value}</div>
                                    )}

                                    {msg.cardData.subtitle && (
                                        <div className="card-subtitle">{msg.cardData.subtitle}</div>
                                    )}

                                    {msg.cardData.stats && (
                                        <div className="card-stats-grid">
                                            {msg.cardData.stats.map((stat, i) => (
                                                <div key={i} className="stat-item">
                                                    <span>{stat.label}</span>
                                                    <strong style={{ color: stat.color || '#fff' }}>
                                                        {typeof stat.value === 'string' && stat.value.includes('|') ? (
                                                            <div className="stat-value-split">
                                                                <span className="main-val">{stat.value.split('|')[0]}</span>
                                                                <span className="sub-val">{stat.value.split('|')[1]}</span>
                                                            </div>
                                                        ) : stat.value}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botones de descarga si la tarjeta tiene dataset válido */}
                                    {((msg.cardData.dataset && msg.cardData.dataset.length > 0) ||
                                        (msg.cardData.savedDataset && msg.cardData.savedDataset.length > 0)) && (
                                            <div className="card-download-group">
                                                <button
                                                    className="card-download-btn operations"
                                                    onClick={() => {
                                                        const baseName = email ? email.split('@')[0] : '';
                                                        const cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
                                                        const formattedName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase() : '';

                                                        exportExecutiveReport(
                                                            msg.cardData.dataset || msg.cardData.savedDataset,
                                                            msg.cardData.filtersText,
                                                            formattedName,
                                                            msg.cardData.selectedColumns || ["Todas"],
                                                            data?.results
                                                        );
                                                    }}
                                                >
                                                    📥 Descargar Reporte Ejecutivo
                                                </button>
                                            </div>
                                        )}
                                </div>
                            )}

                            {/* Acciones Rápidas (Botones) */}
                            {msg.sender === 'bot' && msg.contextType && (
                                <div className="chat-quick-actions">
                                    {msg.contextType === 'clarify_status' && (
                                        <>
                                            <button className="quick-action-btn status-activo" onClick={() => handleSendMessage(null, "Activos")}>Activos</button>
                                            <button className="quick-action-btn status-suspendido" onClick={() => handleSendMessage(null, "Suspendidos")}>Suspendidos</button>
                                            <button className="quick-action-btn status-pausado" onClick={() => handleSendMessage(null, "Pausados")}>Pausados</button>
                                            <button className="quick-action-btn status-cancelado" onClick={() => handleSendMessage(null, "Cancelados")}>Cancelados</button>
                                        </>
                                    )}
                                    {msg.contextType === 'clarify_cycle' && (
                                        <>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Ciclo 15")}>Ciclo 15</button>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Ciclo 30")}>Ciclo 30</button>
                                        </>
                                    )}
                                    {msg.contextType === 'clarify_data_source' && (
                                        <>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Hoy")}>Hoy</button>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Ayer")}>Ayer</button>
                                        </>
                                    )}
                                    {msg.contextType === 'clarify_revenue_type' && (
                                        <>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Facturación proyectada")}>Proyectado (Planes)</button>
                                            <button className="quick-action-btn" onClick={() => handleSendMessage(null, "Ingresos bancos")}>Recaudación Real (Bancos)</button>
                                        </>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="chat-bubble-wrapper bot" role="status" aria-live="polite">
                            <img src={CHRONOS_ICON} alt="" className="msg-avatar" draggable="false" />
                            <div className="msg-body">
                                <div className="chat-bubble bot typing">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="typing-label">Chronos está consultando los datos…</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chatbot-input-area" onSubmit={handleSendMessage}>
                    {/* Sugerencias contextuales por pantalla (una vez iniciada la conversación; antes las cubre la bienvenida) */}
                    {messages.length > 0 && (
                        <div className="chatbot-suggestions-bar">
                            {getContextualSuggestions().map((sug, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="suggestion-chip"
                                    onClick={() => handleSendMessage(null, sug)}
                                    disabled={isTyping}
                                    title="Enviar esta consulta"
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Indicador visible mientras Chronos consulta los datos */}
                    {isTyping && <div className="composer-progress" aria-hidden="true"></div>}

                    <div className="chatbot-input-container">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            maxLength={500}
                            placeholder={isListening ? "Escuchando..." : "Pregúntale a Chronos sobre tus métricas…"}
                            aria-label="Mensaje para Chronos"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            className={isListening ? 'listening' : ''}
                        />

                        <div className="composer-actions">
                            <button
                                type="button"
                                className={`voice-toggle-btn ${isVoiceEnabled ? 'active' : ''}`}
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                title={isVoiceEnabled ? "Desactivar lectura en voz alta" : "Activar lectura en voz alta (accesibilidad)"}
                                aria-label={isVoiceEnabled ? "Desactivar lectura en voz alta" : "Activar lectura en voz alta"}
                                aria-pressed={isVoiceEnabled}
                            >
                                <Icon name={isVoiceEnabled ? 'speakerOn' : 'speakerOff'} size={18} />
                            </button>

                            <button
                                type="button"
                                className={`mic-btn ${isListening ? 'listening' : ''}`}
                                onClick={handleVoiceInput}
                                title="Dictar mensaje"
                                aria-label="Dictar mensaje por voz"
                            >
                                <Icon name={isListening ? 'stop' : 'mic'} size={18} />
                            </button>

                            <span className="composer-spacer"></span>

                            <button
                                type="submit"
                                className={`send-btn ${isTyping ? 'busy' : ''}`}
                                disabled={isTyping || !inputValue.trim()}
                                title="Enviar (Enter)"
                                aria-label="Enviar mensaje"
                            >
                                {isTyping ? <span className="send-spinner" aria-hidden="true"></span> : <Icon name="send" size={16} />}
                                <span>{isTyping ? 'Consultando' : 'Enviar'}</span>
                            </button>
                        </div>
                    </div>
                    <p className="composer-hint">Enter para enviar · Shift + Enter para nueva línea</p>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
