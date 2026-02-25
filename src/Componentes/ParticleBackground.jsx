import React, { useRef, useEffect } from 'react';

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Variables de control de partículas
        let particlesArray = [];
        let animationFrameId;

        // Objeto mouse para la iteracción
        const mouse = {
            x: null,
            y: null,
            radius: 120 // Rango de alcance de interacción
        };

        // Ajustar el canvas al tamaño completo de la ventana
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Escucha el movimiento del ratón
        const handleMouseMove = (event) => {
            mouse.x = event.x;
            mouse.y = event.y;
        };

        // Limpia las líneas del ratón al salir
        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        // Reajuste de pantalla al redimensionar la ventana
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };
        window.addEventListener('resize', handleResize);

        // Clase constructora para cada partícula
        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
            }

            // Dibujar la partícula (puntos)
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();

                // Brillo opcional para sensación de "astros"
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
            }

            // Actualizar la posición de la partícula y reaccionar al ratón
            update() {
                // Validación de rebote en los bordes de la pantalla
                if (this.x > canvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                }

                // Colisión/Atracción con el ratón
                // (Efecto de redensificación cuando el ratón está cerca)
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius + this.size) {
                    if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
                        this.x += 1;
                    }
                    if (mouse.x > this.x && this.x > this.size * 10) {
                        this.x -= 1;
                    }
                    if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
                        this.y += 1;
                    }
                    if (mouse.y > this.y && this.y > this.size * 10) {
                        this.y -= 1;
                    }
                }

                // Mover la partícula iterativamente
                this.x += this.directionX;
                this.y += this.directionY;

                this.draw();
            }
        }

        // Inicialización: Generar una lista aleatoria de partículas
        const init = () => {
            particlesArray = [];
            // Cantidad de partículas depende del tamaño (para que no se caiga de RAM)
            let numberOfParticles = (canvas.height * canvas.width) / 9000;

            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 2) + 1; // Puntos pequeños
                let x = (Math.random() * ((window.innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((window.innerHeight - size * 2) - (size * 2)) + size * 2);

                // Direcciones suaves (velocidad de los nodos)
                let directionX = (Math.random() * 1) - 0.5;
                let directionY = (Math.random() * 1) - 0.5;
                let color = '#4dabf7'; // Un azul neón claro que resulte atractivo

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        };

        // Dibujar las líneas interconectoras
        const connect = () => {
            let maxDistance = 110;

            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance =
                        ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                        ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));

                    // Si las 2 particulas entran en el rango de conexión
                    if (distance < (maxDistance * maxDistance)) {
                        // Un porcentaje de fuerza/opacidad para la línea (Línea tenue según qué tan lejos estén)
                        let opacityValue = 1 - (distance / (maxDistance * maxDistance));
                        ctx.strokeStyle = `rgba(77, 171, 247, ${opacityValue})`;
                        ctx.lineWidth = 1;

                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        // El Loop Infinito de Renderizado
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); // Limpiar frame anterior

            // Mover astros
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }

            // Dibujar la telaraña (Aura espacial)
            connect();
        };

        // Run de todo
        init();
        animate();

        // Cleanup: Destruir el listener y el request Frame al desmontarse
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };

    }, []);

    return (
        <canvas
            ref={canvasRef}
            id="canvas-constellation"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0, // Está en el fondo profundo
                background: '#09152b', // Un negro/azul profundísimo que destaca la Constelación
                overflow: 'hidden',
                display: 'block'
            }}
        />
    );
};

export default ParticleBackground;
