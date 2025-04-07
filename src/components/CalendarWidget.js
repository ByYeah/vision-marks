import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css"; // Importa los estilos predeterminados

const CalendarWidget = () => {
  const [date, setDate] = useState(new Date()); // Estado para almacenar la fecha seleccionada

  return (
    <div className="calendar-widget">
      <Calendar
        onChange={setDate} // Actualiza la fecha seleccionada
        value={date} // Fecha actual mostrada
        className="custom-calendar" // Clase personalizada para estilizar
      />
    </div>
  );
};

export default CalendarWidget;
