import React, { useState, useEffect } from "react";

const NotesWidget = () => {
  const [notes, setNotes] = useState([]); // Todas las notas guardadas
  const [currentNote, setCurrentNote] = useState(null); // Nota actual en edición
  const [newNoteContent, setNewNoteContent] = useState(""); // Contenido de la nueva nota
  const [selectedNotes, setSelectedNotes] = useState([]); // Notas seleccionadas para eliminar
  const [fontStyle, setFontStyle] = useState("Arial"); // Fuente de la nota
  const [fontSize, setFontSize] = useState("16px"); // Tamaño de la fuente
  const [fontColor, setFontColor] = useState("#000000"); // Color del texto

  // Cargar notas desde localStorage al iniciar
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem("notes")) || [];
    setNotes(savedNotes);
  }, []);

  // Guardar notas en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  // Abrir el editor para una nueva nota
  const openNewNote = () => {
    setCurrentNote({ id: null, title: "", content: "" }); // Abrir editor para nueva nota
    setNewNoteContent(""); // Limpiar el contenido
    setFontStyle("Arial");
    setFontSize("16px");
    setFontColor("#000000");
  };

  // Extraer la primera línea o palabra como título
  const extractTitle = (content) => {
    const firstLine = content.split("\n")[0]; // Primera línea
    const firstWord = firstLine.split(" ")[0]; // Primera palabra
    return firstWord || "Sin título"; // Si no hay contenido, usar "Sin título"
  };

  // Guardar una nota
  const saveNote = () => {
    if (!newNoteContent.trim()) return;

    const newNote = {
      id: currentNote?.id || Date.now(),
      title: extractTitle(newNoteContent), // Extraer el título
      content: newNoteContent, // Guardar el contenido completo
      fontStyle: fontStyle,
      fontSize: fontSize,
      fontColor: fontColor,
    };

    if (currentNote?.id) {
      // Si estamos editando una nota existente
      const updatedNotes = notes.map((note) =>
        note.id === currentNote.id ? { ...note, ...newNote } : note
      );
      setNotes(updatedNotes);
    } else {
      // Si estamos creando una nueva nota
      setNotes((prevNotes) => [...prevNotes, newNote]);
    }

    setCurrentNote(null); // Volver al menú principal
    setNewNoteContent(""); // Limpiar el contenido
  };

  // Eliminar notas seleccionadas
  const deleteSelectedNotes = () => {
    if (!window.confirm("¿Eliminar las notas seleccionadas?")) return;

    const updatedNotes = notes.filter((note) => !selectedNotes.includes(note.id));
    setNotes(updatedNotes);
    setSelectedNotes([]); // Limpiar selección
  };

  // Editar una nota
  const editNote = (note) => {
    setCurrentNote(note);
    setNewNoteContent(note.content); // Mostrar el contenido completo
    setFontStyle(note.fontStyle || "Arial");
    setFontSize(note.fontSize || "16px");
    setFontColor(note.fontColor || "#000000");
  };

  // Manejar cambios en el contenido de la nota
  const handleContentChange = (e) => {
    setNewNoteContent(e.target.value);
  };

  // Renderizar el menú principal
  const renderMainMenu = () => (
    <div className="notes-menu">
      {/* Encabezado con título y botones */}
      <div className="menu-header">
        <h3>Tus Notas</h3>
        <div className="menu-buttons">
          <button onClick={openNewNote} title="Nueva Nota">
            📝
          </button>
          <button
            onClick={deleteSelectedNotes}
            disabled={selectedNotes.length === 0}
            title="Eliminar Notas"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Lista de notas guardadas */}
      <ul className="notes-list">
        {notes.map((note) => (
          <li key={note.id} className="note-item">
            <input
              type="checkbox"
              checked={selectedNotes.includes(note.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedNotes([...selectedNotes, note.id]);
                } else {
                  setSelectedNotes(selectedNotes.filter((id) => id !== note.id));
                }
              }}
            />
            <span>{note.title}</span> {/* Mostrar el título */}
            <button onClick={() => editNote(note)} title="Editar Nota">
              ✏️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // Renderizar el editor de notas
  const renderNoteEditor = () => (
    <div className="note-editor">
      <header>
        <button onClick={saveNote} title="Guardar Nota">
          💾
        </button>
        <button onClick={() => setCurrentNote(null)} title="Regresar al Menú">
          ↩️
        </button>
        <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)}>
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier New</option>
          <option value="Times New Roman">Times New Roman</option>
        </select>
        <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
          <option value="12px">Pequeño</option>
          <option value="16px">Mediano</option>
          <option value="20px">Grande</option>
        </select>
        <input
          type="color"
          value={fontColor}
          onChange={(e) => setFontColor(e.target.value)}
        />
      </header>
      <textarea
        value={newNoteContent}
        onChange={handleContentChange}
        style={{
          fontFamily: fontStyle,
          fontSize: fontSize,
          color: fontColor,
        }}
        placeholder="Escribe tu nota aquí..."
      />
    </div>
  );

  return (
    <div className="notes-widget">
      {currentNote === null ? renderMainMenu() : renderNoteEditor()}
    </div>
  );
};

export default NotesWidget;