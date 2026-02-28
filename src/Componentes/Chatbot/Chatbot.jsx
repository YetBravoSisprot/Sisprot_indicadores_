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

    // Configurar saludo inicial dinámico
    useEffect(() => {
        if (isAuthenticated) {
            let greetingText = 'Hola, un gusto saludarte, ¿en qué te puedo ayudar?';

            if (email) {
                // Obtener el nombre antes del @
                const baseName = email.split('@')[0];
                // Quitar posibles puntos, números o "_" si se desea un nombre más limpio (opcional)
                const cleanName = baseName.replace(/[\._0-9]/g, ' ').trim().split(' ')[0];

                if (cleanName) {
                    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
                    greetingText = `Hola **${formattedName}**, un gusto saludarte, ¿en qué te puedo ayudar?`;
                }
            }

            setMessages(prev => prev.length === 0 ? [{ sender: 'bot', text: greetingText, isCard: false }] : prev);
        }
    }, [isAuthenticated, email]);

    // Auto-scroll al final cuando hay nuevos mensajes
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Si el usuario no ha iniciado sesión, no renderizamos el chatbot
    if (!isAuthenticated) return null;

    const handleToggle = () => setIsOpen(!isOpen);

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
                    <h4>Sisprot-AI</h4>
                    <p>Inteligencia Artificial</p>
                </div>

                <div className="chatbot-messages">
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
