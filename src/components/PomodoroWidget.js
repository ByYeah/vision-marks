import React, { useState, useEffect, useRef } from "react";

const PomodoroWidget = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Tiempo inicial en segundos (25 minutos)
  const [isActive, setIsActive] = useState(false); // Estado para controlar si el temporizador está activo
  const [mode, setMode] = useState("pomodoro"); // Modo actual: 'pomodoro', 'short-break', 'long-break'
  const [cyclesCompleted, setCyclesCompleted] = useState(0); // Contador de ciclos Pomodoro completados
  const [tasksBeforeLongBreak, setTasksBeforeLongBreak] = useState(4); // Número de tareas antes del descanso largo
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Controla si el menú de configuración está abierto
  const [isTonotaStyle, setIsTonotaStyle] = useState(false); // Controla si el estilo "Tonota Style" está activado

  // Referencias para los archivos de audio (ahora en formato .m4a)
  const pomodoroSound = useRef(new Audio("/sounds/pomodoro-end.m4a")); // Sonido para el final del Pomodoro
  const shortBreakSound = useRef(new Audio("/sounds/short-break-end.m4a")); // Sonido para el final del Descanso Corto
  const longBreakSound = useRef(new Audio("/sounds/long-break-end.m4a")); // Sonido para el final del Descanso Largo
  const defaultSound = useRef(new Audio("/sounds/default-end.m4a")); // Sonido por defecto

  // Función para formatear el tiempo en minutos y segundos
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Efecto para manejar el temporizador
  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      setIsActive(false);

      // Reproducir el sonido correspondiente dos veces
      const playSoundTwice = (audio) => {
        let playCount = 0; // Contador para controlar cuántas veces se reproduce el sonido
        audio.current.play();

        // Evento que se activa cuando termina de reproducirse el sonido
        audio.current.onended = () => {
          playCount++;
          if (playCount < 2) {
            audio.current.play(); // Reproduce el sonido nuevamente
          } else {
            audio.current.onended = null; // Limpiar el evento después de reproducir dos veces
          }
        };
      };

      // Determinar qué sonido reproducir
      if (isTonotaStyle) {
        if (mode === "pomodoro") {
          playSoundTwice(pomodoroSound);
        } else if (mode === "short-break") {
          playSoundTwice(shortBreakSound);
        } else if (mode === "long-break") {
          playSoundTwice(longBreakSound);
        }
      } else {
        playSoundTwice(defaultSound);
      }

      // Cambiar al siguiente modo automáticamente
      if (mode === "pomodoro") {
        setCyclesCompleted((prevCycles) => prevCycles + 1);
        if ((cyclesCompleted + 1) % tasksBeforeLongBreak === 0) {
          setMode("long-break");
          setTimeLeft(15 * 60); // 15 minutos de descanso largo
        } else {
          setMode("short-break");
          setTimeLeft(5 * 60); // 5 minutos de descanso corto
        }
      } else {
        setMode("pomodoro");
        setTimeLeft(25 * 60); // Volver al modo Pomodoro
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, cyclesCompleted, tasksBeforeLongBreak, isTonotaStyle]);

  // Función para iniciar o pausar el temporizador
  const toggleTimer = () => {
    setIsActive((prevIsActive) => !prevIsActive);
  };

  // Función para reiniciar el temporizador
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60); // Reiniciar a 25 minutos
    setMode("pomodoro");
    setCyclesCompleted(0);
  };

  // Función para abrir/cerrar el menú de configuración
  const toggleSettings = () => {
    setIsSettingsOpen((prevIsOpen) => !prevIsOpen);
  };

  // Función para cambiar el número de tareas antes del descanso largo
  const handleTasksChange = (numTasks) => {
    setTasksBeforeLongBreak(numTasks);
    setIsSettingsOpen(false); // Cerrar el menú después de seleccionar
  };

  // Determinar la imagen según el modo actual
  const getImageSrc = () => {
    if (mode === "pomodoro") {
      return "/assets/pomodoro.webp"; // Imagen para el modo Pomodoro
    } else if (mode === "short-break") {
      return "/assets/short-break.webp"; // Imagen para el modo Descanso Corto
    } else if (mode === "long-break") {
      return "/assets/long-break.webp"; // Imagen para el modo Descanso Largo
    }
    return null;
  };

  return (
    <div className={`pomodoro-widget ${isTonotaStyle ? "tonota-style" : ""}`}>
      {/* Botón de configuración */}
      <button className="settings-button" onClick={toggleSettings}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          width="20px"
          height="20px"
          viewBox="0 0 24 24">
          <path fill="#000000" fillRule="evenodd" d="M14.28 2.15C13.9 2 13.44 2 12.5 2c-.94 0-1.4 0-1.78.15a2 2 0 0 0-1.09 1.08c-.1.23-.13.49-.14.87a1.6 1.6 0 0 1-.8 1.35c-.49.28-1.08.27-1.58 0a2.5 2.5 0 0 0-.82-.3 2.03 2.03 0 0 0-1.5.4c-.31.24-.55.64-1.02 1.45-.47.8-.7 1.21-.75 1.6a1.97 1.97 0 0 0 1.08 2.04c.47.3.78.8.78 1.36s-.3 1.06-.78 1.36a1.99 1.99 0 0 0-1.08 2.03c.05.4.28.8.75 1.61.47.8.7 1.21 1.03 1.45.42.33.96.47 1.49.4.24-.03.48-.13.82-.3.5-.27 1.1-.28 1.58 0 .49.28.78.8.8 1.35.01.38.05.64.14.87a2 2 0 0 0 1.1 1.08c.36.15.83.15 1.77.15.94 0 1.4 0 1.78-.15a2 2 0 0 0 1.09-1.08c.1-.23.13-.49.14-.87a1.6 1.6 0 0 1 .8-1.35 1.64 1.64 0 0 1 1.58 0c.34.17.58.27.82.3.53.07 1.07-.07 1.5-.4.31-.24.55-.64 1.02-1.45.47-.8.7-1.21.75-1.6a1.99 1.99 0 0 0-.4-1.48c-.15-.2-.35-.36-.68-.56-.47-.3-.78-.8-.78-1.36s.3-1.06.78-1.36a1.99 1.99 0 0 0 1.08-2.03c-.05-.4-.28-.8-.75-1.61-.47-.8-.7-1.21-1.03-1.45a2.03 2.03 0 0 0-1.49-.4 2.5 2.5 0 0 0-.82.3c-.5.27-1.1.28-1.58 0-.49-.28-.78-.8-.8-1.35a2.45 2.45 0 0 0-.14-.87 2 2 0 0 0-1.1-1.08ZM12.5 15a3.01 3.01 0 0 0 3.02-3 3 3 0 0 0-3.02-3 3.01 3.01 0 0 0-3.02 3 3 3 0 0 0 3.02 3Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Menú de configuración */}
      {isSettingsOpen && (<div className="settings-menu">
        <label htmlFor="tasks">Tareas antes del descanso largo:</label>
        <select
          id="tasks"
          value={tasksBeforeLongBreak}
          onChange={(e) => handleTasksChange(Number(e.target.value))}
        >
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
        <div className="switch-container">
          <span className="switch-label">Tonota Style</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isTonotaStyle}
              onChange={() => setIsTonotaStyle((prev) => !prev)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
      )}

      {/* Contenido principal */}
      <h2 className="widget-title">
        {isTonotaStyle ? "Tonota Pomodoro" : mode === "pomodoro" ? "Pomodoro" : mode === "short-break" ? "Descanso Corto" : "Descanso Largo"}
      </h2>
      <div className="timer-and-image">
        <div className="timer">{formatTime(timeLeft)}</div>
        {/* Mostrar la imagen solo si el modo Tonota Style está activado */}
        {isTonotaStyle && (
          <img
            src={getImageSrc()}
            alt={mode}
            className={`timer-image ${isActive ? "animate" : ""}`}
          />
        )}
      </div>
      <div className="controls">
        <button onClick={toggleTimer}>{isActive ? "Pausar" : "Iniciar"}</button>
        <button onClick={resetTimer}>Reiniciar</button>
      </div>
    </div>
  );
};

export default PomodoroWidget;