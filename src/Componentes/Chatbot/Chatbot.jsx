import React, { useState, useContext, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PasswordContext } from '../../PasswordContext/PasswordContext';
import { processQuery } from './AiEngine';
import { exportToExcel } from '../../utils/ExcelExport';
import { exportExecutiveReport } from '../../utils/ExecutiveReport';
import './Chatbot.css';

const Chatbot = () => {
    const { data, isAuthenticated, email } = useContext(PasswordContext);
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

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

    // ── Función de saludo reutilizable (useEffect + confirmReset) ──
    const buildGreetingMessage = () => {
        let cleanName = null;
        if (email) {
            const baseName = email.split('@')[0];
            cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
            if (cleanName) {
                cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
            }
        }
        const intro = cleanName
            ? `Hola **${cleanName}**, un gusto saludarte. Soy tu asistente analítico, puedo ayudarte con:`
            : `Hola, un gusto saludarte. Soy tu asistente analítico, puedo ayudarte con:`;

        return `${intro}

• **Consultar Ingresos**: Ingresos proyectados por sector o agencia.
• **Contar Clientes**: Totales, activos, pymes o suspendidos.
• **Búsqueda Detallada**: Buscar clientes por nombre o contrato.
• **Reportes Personalizados**: Generar archivos Excel a tu medida.
• **Datos Técnicos**: Consultar IP, MAC o filtrar por ciclos (15/30).

¿En qué te puedo ayudar hoy?`;
    };

    // Configurar saludo inicial dinámico
    useEffect(() => {
        if (!isAuthenticated) return;
        const newGreeting = buildGreetingMessage();
        setMessages(prev => {
            if (prev.length === 0) {
                return [{ sender: 'bot', text: newGreeting, isCard: false }];
            }
            if (prev.length === 1 && prev[0].sender === 'bot' && !prev[0].text.includes('**')) {
                return [{ sender: 'bot', text: newGreeting, isCard: false }];
            }
            return prev;
        });
    }, [isAuthenticated, email]);

    // Auto-scroll al final cuando hay nuevos mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!isOpen) return;

        // Si solo está el saludo inicial, forzamos el scroll AL INICIO
        if (messages.length <= 1) {
            if (messagesContainerRef.current) {
                setTimeout(() => {
                    if (messagesContainerRef.current) {
                        messagesContainerRef.current.scrollTop = 0;
                    }
                }, 100);
            }
            return;
        }

        // Si hay más mensajes (interacción), scroll AL FINAL
        scrollToBottom();
    }, [messages, isOpen]);


    const handleToggle = () => setIsOpen(!isOpen);

    const handleResetChat = () => {
        setShowResetModal(true);
    };

    const confirmReset = () => {
        // Reinicia el chat pero restaura el mensaje de bienvenida inicial
        const welcomeBack = buildGreetingMessage();
        setMessages([{ sender: 'bot', text: welcomeBack, isCard: false }]);
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

    if (!isAuthenticated) return null;

    const handleSendMessage = async (e, directValue = null) => {
        if (e) e.preventDefault();
        
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

            const aiResponse = await processQuery(userMsg, data, currentMessages, formattedName, location.pathname);
            setMessages(prev => [...prev, { sender: 'bot', ...aiResponse }]);

            // ── MANEJO DE DESCARGAS AUTOMÁTICAS (NUEVO) ──
            if (aiResponse.action === 'download_excel_executive' && (aiResponse.cardData?.dataset || aiResponse.cardData?.savedDataset)) {
                setTimeout(() => {
                    exportExecutiveReport(
                        aiResponse.cardData.dataset || aiResponse.cardData.savedDataset, 
                        aiResponse.cardData.filtersText, 
                        formattedName,
                        aiResponse.cardData.selectedColumns || ["Todas"]
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
                            aiResponse.cardData.selectedColumns || ["Todas"]
                        );
                    } else {
                        // Solo usamos el export técnico para operaciones específicas
                        exportToExcel(dataset, aiResponse.cardData.filtersText, aiResponse.cardData.selectedColumns || ["Todas"], rType);
                    }
                }, 1000); 
            }
        } catch (error) {
            console.error("Error AI:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Ocurrió un error de conexión con el motor IA. Intenta de nuevo.", isCard: false }]);
        } finally {
            setIsTyping(false);
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
            {/* Avatar Flotante del Robot */}
            <div className={`chatbot-toggle-wrapper ${isOpen ? 'open' : ''}`} onClick={handleToggle}>
                {!isOpen ? (
                    <div className="robot-avatar">
                        <div className="robot-antenna"></div>
                        <div className="robot-head">
                            <div className="robot-eyes">
                                <div className="eye"></div>
                                <div className="eye"></div>
                            </div>
                            <div className="robot-mouth"></div>
                        </div>
                    </div>
                ) : (
                    <div className="close-btn">✕</div>
                )}
            </div>

            {/* Ventana de Chat */}
            <div className={`chatbot-window glass ${isOpen ? 'active' : ''}`}>
                <div className="chatbot-header">
                    <div className="header-info">
                        <h4>Sisprot-AI</h4>
                        <p>Inteligencia Artificial</p>
                    </div>
                    <button 
                        className="reset-chat-btn" 
                        onClick={handleResetChat}
                        title="Reiniciar conversación"
                    >
                        🔄
                    </button>
                </div>

                <div className="chatbot-messages" ref={messagesContainerRef}>
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chat-bubble-wrapper ${msg.sender}`}>
                            {msg.text && (
                                <div className={`chat-bubble ${msg.sender}`}>
                                    {renderFormattedText(msg.text)}
                                </div>
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

                                    {/* Botones de descarga si la tarjeta tiene dataset */}
                                    {(msg.cardData.dataset || msg.cardData.savedDataset) && (
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
                                                        msg.cardData.selectedColumns || ["Todas"]
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
                    ))}

                    {isTyping && (
                        <div className="chat-bubble-wrapper bot">
                            <div className="chat-bubble bot typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chatbot-input-area" onSubmit={handleSendMessage}>
                    <div className="chatbot-input-container">
                        <button 
                            type="button" 
                            className={`voice-toggle-btn ${isVoiceEnabled ? 'active' : ''}`}
                            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                            title={isVoiceEnabled ? "Desactivar voz" : "Activar lectura de voz (Accesibilidad)"}
                        >
                            {isVoiceEnabled ? '🔊' : '🔈'}
                        </button>
                        
                        <input
                            type="text"
                            placeholder={isListening ? "Escuchando..." : "Mensaje a Sisprot-AI..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className={isListening ? 'listening' : ''}
                        />

                        <button 
                            type="button" 
                            className={`mic-btn ${isListening ? 'listening' : ''}`}
                            onClick={handleVoiceInput}
                            title="Hablar (Dictar mensaje)"
                        >
                            {isListening ? '🛑' : '🎤'}
                        </button>

                        <button type="submit" className="send-btn" title="Enviar">➤</button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
