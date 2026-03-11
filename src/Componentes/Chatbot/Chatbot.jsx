import React, { useState, useContext, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PasswordContext } from '../../PasswordContext/PasswordContext';
import { processQuery } from './AiEngine';
import { exportToExcel } from '../../utils/ExcelExport';
import './Chatbot.css';

const Chatbot = () => {
    const { data, isAuthenticated, email } = useContext(PasswordContext);
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    // Configurar saludo inicial dinámico
    useEffect(() => {
        if (!isAuthenticated) return;

        const getGreeting = (name) => {
            const intro = name
                ? `Hola **${name}**, un gusto saludarte. Soy tu asistente analítico, puedo ayudarte con:`
                : `Hola, un gusto saludarte. Soy tu asistente analítico, puedo ayudarte con:`;

            return `${intro}
                    
• **Consultar Ingresos**: Ingresos proyectados por sector o agencia.
• **Contar Clientes**: Totales, activos, pymes o suspendidos.
• **Búsqueda Detallada**: Buscar clientes por nombre o contrato.
• **Reportes Personalizados**: Generar archivos Excel a tu medida.
• **Datos Técnicos**: Consultar IP, MAC o filtrar por ciclos (15/30).

¿En qué te puedo ayudar hoy?`;
        };

        let cleanName = null;
        if (email) {
            const baseName = email.split('@')[0];
            cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];
            if (cleanName) {
                cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
            }
        }

        const newGreeting = getGreeting(cleanName);

        setMessages(prev => {
            // Si no hay mensajes, ponemos el saludo
            if (prev.length === 0) {
                return [{ sender: 'bot', text: newGreeting, isCard: false }];
            }
            // Si el primer mensaje es el saludo genérico (sin nombre) y ahora tenemos nombre, lo actualizamos
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

    // Si el usuario no ha iniciado sesión, no renderizamos el chatbot
    if (!isAuthenticated) return null;

    const handleToggle = () => setIsOpen(!isOpen);

    const handleResetChat = () => {
        if (window.confirm("¿Estás seguro de que quieres reiniciar la conversación? Se borrará todo el historial actual.")) {
            setMessages([]);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = inputValue.trim();
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

            // Si la respuesta indica una descarga, la ejecutamos
            if (aiResponse.isDownload && aiResponse.cardData?.dataset) {
                setTimeout(() => {
                    exportToExcel(aiResponse.cardData.dataset, aiResponse.cardData.filtersText, aiResponse.cardData.selectedColumns || ["Todas"]);
                }, 1000); // Pequeño delay para que el mensaje se lea
            }
        } catch (error) {
            console.error("Error AI:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: "Ocurrió un error de conexión con el motor IA. Intenta de nuevo.", isCard: false }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Helper para renderizar negritas (**) y saltos de línea (\n)
    const renderFormattedText = (text) => {
        if (!text) return null;
        return text.split("\n").map((line, i) => (
            <React.Fragment key={i}>
                {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
                {i < text.split("\n").length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <>
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
                                <div className="chat-data-card animate-slide-up">
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
                                                    <strong style={{ color: stat.color || '#fff' }}>{stat.value}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botón de descarga si la tarjeta tiene dataset */}
                                    {msg.cardData.dataset && (
                                        <button
                                            className="card-download-btn"
                                            onClick={() => exportToExcel(msg.cardData.dataset, msg.cardData.filtersText, msg.cardData.selectedColumns || ["Todas"])}
                                        >
                                            📥 Descargar Excel
                                        </button>
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
                        <input
                            type="text"
                            placeholder="Mensaje a Sisprot-AI..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button type="submit">Enviar</button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
