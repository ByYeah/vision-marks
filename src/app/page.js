"use client";

import { useState, useEffect } from "react";
import "./styles.css";
import CalendarWidget from "./../components/CalendarWidget";
import NotesWidget from "./../components/NotesWidget";
import PhotoGridWidget from "./../components/PhotoGridWidget";
import PomodoroWidget from "./../components/PomodoroWidget";
import Modal from "./../components/Modal";

const getPreview = async (url) => {
  const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  return data;
};

export default function App() {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [folders, setFolders] = useState([]); // Arreglo de carpetas
  const [bookmarks, setBookmarks] = useState([]); // Arreglo de marcadores
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado del modal
  const [modalData, setModalData] = useState(null); // Datos del modal
  const [draggingBookmarkId, setDraggingBookmarkId] = useState(null); // ID del marcador arrastrado
  const [draggingdFolderId, setDraggingFolderId] = useState(null); // ID de la carpeta arrastrada
  const [menuOpenBookmark, setMenuOpenBookmark] = useState(null); // ID del marcador cuyo menú está abierto
  const [activeFolder, setActiveFolder] = useState(null); // ID de la carpeta activa
  const [menuOpenBookmarkInFolder, setMenuOpenBookmarkInFolder] = useState(null); // ID del marcador en el menú de la carpeta
  const [moveToMenuOpen, setMoveToMenuOpen] = useState(false); // ID del marcador en el menú de mover
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Controla si el menú está abierto
  const [activeTab, setActiveTab] = useState("preview"); // Controla la pestaña activa
  const [errorMessage, setErrorMessage] = useState(""); // Estado para el mensaje de error
  const [images, setImages] = useState([]); // Arreglo para almacenar las imágenes cargadas
  const [selectedThumbnail, setSelectedThumbnail] = useState(null); // Índice de la miniatura seleccionada
  const [selectedWidgetArea5, setSelectedWidgetArea5] = useState(null); // Widget seleccionado en el área 5
  const [selectedWidgetArea6, setSelectedWidgetArea6] = useState(null); // Widget seleccionado en el área 6
  const widgets = [
    {
      id: "calendar", name: "Calendario", svg: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0"
          viewBox="0 0 24 24">
          <g>
            <path d="M7.8 2.5a.8.8 0 0 0-1.5 0v1.6c-1.5 0-2.4.4-3.1 1-.7.8-1 1.7-1.1 3.2h19.8c0-1.5-.4-2.4-1-3.1-.8-.7-1.7-1-3.1-1.1V2.5a.8.8 0 0 0-1.6 0V4H7.8V2.5Z" />
            <path fillRule="evenodd" d="M2 12V9.7h20V14c0 3.8 0 5.7-1.2 6.8-1.1 1.2-3 1.2-6.8 1.2h-4c-3.8 0-5.7 0-6.8-1.2C2 19.7 2 17.8 2 14v-2Zm15 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-4-5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-6-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </g>
        </svg>)
    },
    {
      id: "notes", name: "Bloc de Notas", svg: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24">
          <g>
            <path d="M16.52 16.5c.17-.14.33-.3.65-.61l3.96-3.96c.1-.1.05-.26-.08-.3a4.33 4.33 0 0 1-2.68-2.68c-.04-.13-.2-.17-.3-.08l-3.96 3.96c-.32.32-.47.48-.61.65-.16.2-.3.43-.41.67-.1.2-.17.41-.31.84l-.18.55-.3.87-.27.82a.58.58 0 0 0 .74.74l.82-.27.87-.3.55-.18c.43-.14.64-.21.84-.3.24-.12.46-.26.67-.42ZM22.37 10.7a2.16 2.16 0 1 0-3.06-3.07l-.13.13a.52.52 0 0 0-.15.47l.12.45a3.5 3.5 0 0 0 2.62 2.29c.18.03.35-.03.47-.15l.13-.13Z" />
            <path fillRule="evenodd" d="M4.17 3.17C3 4.34 3 6.23 3 10v4c0 3.77 0 5.66 1.17 6.83S7.23 22 11 22h2c3.77 0 5.66 0 6.83-1.17 1.15-1.15 1.17-3 1.17-6.65L18.18 17a5.1 5.1 0 0 1-2.63 1.62l-2.3.77a2.08 2.08 0 0 1-2.64-2.63l.27-.82.48-1.43.02-.06a5.1 5.1 0 0 1 .94-1.89c.2-.25.41-.47.68-.74l4-4 1.12-1.12.13-.13a3.65 3.65 0 0 1 2.59-1.07 3.88 3.88 0 0 0-1.01-2.33C18.66 2 16.77 2 13 2h-2C7.23 2 5.34 2 4.17 3.17ZM7.25 9c0-.41.34-.75.75-.75h6.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 9Zm0 4c0-.41.34-.75.75-.75h2.5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Zm0 4c0-.41.34-.75.75-.75h1.5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </g>
        </svg>
      )
    },
    {
      id: "photoGrid", name: "Mosaico de Fotos", svg: (<svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24">
        <g>
          <path d="M18.51 10.08c0 .74-.62 1.33-1.4 1.33-.76 0-1.39-.6-1.39-1.33 0-.74.63-1.34 1.4-1.34.77 0 1.4.6 1.4 1.34Z" />
          <path fillRule="evenodd" d="M18.04 5.53a35.44 35.44 0 0 0-4.13-.13H10.1c-1.71 0-3.07 0-4.13.13-1.09.14-1.97.44-2.67 1.1-.7.67-1 1.52-1.15 2.57C2 10.2 2 11.5 2 13.15v.1c0 1.64 0 2.93.14 3.95.15 1.05.46 1.9 1.15 2.56.7.67 1.58.96 2.67 1.1 1.06.14 2.42.14 4.13.14h3.82c1.71 0 3.07 0 4.13-.14a4.48 4.48 0 0 0 2.67-1.1c.7-.67 1-1.51 1.15-2.56.14-1.02.14-2.31.14-3.95v-.1c0-1.64 0-2.94-.14-3.95a4.12 4.12 0 0 0-1.15-2.56 4.48 4.48 0 0 0-2.67-1.1ZM6.15 6.86c-.94.12-1.48.34-1.87.72-.4.38-.63.9-.75 1.8-.1.71-.13 1.61-.13 2.79l.47-.4a2.93 2.93 0 0 1 3.87.13l4 3.82c.4.39 1.02.44 1.48.13l.28-.2a3.6 3.6 0 0 1 4.34.26l2.4 2.08c.1-.27.18-.58.23-.97.13-.91.13-2.12.13-3.82 0-1.7 0-2.91-.13-3.83-.12-.9-.36-1.41-.75-1.79-.4-.38-.93-.6-1.87-.72-.96-.13-2.22-.13-3.99-.13h-3.72c-1.77 0-3.03 0-3.99.13Z" clipRule="evenodd" />
          <path d="M17.09 2.61c-.86-.11-1.96-.11-3.32-.11h-3.1c-1.36 0-2.45 0-3.31.11-.9.11-1.63.36-2.22.92-.34.33-.57.7-.73 1.12.5-.23 1.08-.37 1.72-.45 1.08-.14 2.47-.14 4.22-.14h3.91c1.75 0 3.14 0 4.22.14a6.3 6.3 0 0 1 1.52.37 2.88 2.88 0 0 0-.7-1.04 3.74 3.74 0 0 0-2.21-.92Z" />
        </g>
      </svg>)
    },
    {
      id: "pomodoro", name: "Pomodoro", svg: (<svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24">
        <g fillRule="evenodd" clipRule="evenodd">
          <path d="M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-12.75c.41 0 .75.34.75.75v2.25H15a.75.75 0 0 1 0 1.5h-2.25V16a.75.75 0 0 1-1.5 0v-2.25H9a.75.75 0 0 1 0-1.5h2.25V10c0-.41.34-.75.75-.75ZM8.14 1.6c.22.35.1.82-.24 1.04l-4 2.5a.75.75 0 0 1-.8-1.28l4-2.5a.75.75 0 0 1 1.04.24Zm7.72 0a.75.75 0 0 1 1.04-.24l4 2.5a.75.75 0 1 1-.8 1.28l-4-2.5a.75.75 0 0 1-.24-1.04Z" />
        </g>
      </svg>)
    },
  ];

  //* Hooks de carga y guardado local *//

  // Función auxiliar para cargar datos desde localStorage
  const loadDataFromLocalStorage = (key, defaultValue = []) => {
    const savedData = JSON.parse(localStorage.getItem(key));
    return Array.isArray(savedData) ? savedData : defaultValue;
  };

  // Función auxiliar para verificar la integridad de las imágenes
  const validateImages = (images) => {
    return Array.isArray(images) && images.every((img) => img.url);
  };

  // useEffect principal para cargar datos iniciales
  useEffect(() => {
    // Cargar carpetas, marcadores e imágenes
    const savedFolders = loadDataFromLocalStorage("folders");
    const savedBookmarks = loadDataFromLocalStorage("bookmarks");
    const savedImages = loadDataFromLocalStorage("savedImages");

    if (validateImages(savedImages)) {
      setImages(savedImages);
    } else {
      console.error("Datos corruptos en localStorage para imágenes");
      localStorage.removeItem("savedImages"); // Limpiar datos corruptos
    }

    setFolders(savedFolders);
    setBookmarks(savedBookmarks);
  }, []);

  // useEffect para guardar datos en localStorage
  useEffect(() => {
    localStorage.setItem("folders", JSON.stringify(folders));
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    localStorage.setItem("savedImages", JSON.stringify(images));
  }, [folders, bookmarks, images]);

  //* Hook API para enlances y sus favicons *//

  // Obtener datos del sitio web
  const fetchSiteData = async (url) => {
    try {

      // Llamar a la API de LinkPreview
      const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        console.error("Error en la respuesta de LinkPreview API:", response.status, response.statusText);
        throw new Error("Error fetching site data from LinkPreview API");
      }

      const data = await response.json();

      let title = data.title || url;
      let favicon = "/default-icon.png"; // Ícono predeterminado local

      // Intentar obtener el favicon desde el HTML del sitio
      try {
        const htmlResponse = await fetch(url);
        if (!htmlResponse.ok) throw new Error("Error fetching HTML");

        const htmlText = await htmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const faviconLink =
          doc.querySelector('link[rel="icon"]')?.href ||
          doc.querySelector('link[rel="shortcut icon"]')?.href;

        if (faviconLink) {
          favicon = new URL(faviconLink, url).href; // Construir la URL absoluta
        } else {
          favicon = `https://api.allorigins.win/raw?url=https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
        }

      } catch (faviconError) {
        console.warn("No se pudo obtener el favicon del HTML:", faviconError);
        favicon = `https://api.allorigins.win/raw?url=https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
      }

      // Verificar si el favicon es accesible
      try {
        const faviconResponse = await fetch(favicon, { method: "HEAD" });
        if (!faviconResponse.ok) {
          console.warn("Favicon no accesible, usando ícono predeterminado.");
          favicon = "/default-icon.png";
        }
      } catch (faviconError) {
        console.warn("Error al verificar el favicon, usando ícono predeterminado:", faviconError);
        favicon = "/default-icon.png";
      }

      return { title, favicon };
    } catch (error) {
      console.error("Error fetching site data:", error);
      return { title: url, favicon: "/default-icon.png" }; // Ícono predeterminado local
    }
  };

  // Normalizar la URL
  const normalizeUrl = (url) => {
    if (!url) return "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = url.startsWith("www.") ? `https://${url}` : `https://www.${url}`;
    }
    return url;
  };

  // Función para capitalizar texto
  const capitalize = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  //* Funciones para el componente "Marcador" *//

  // Agregar un marcador
  const addBookmark = () => {
    openModal({
      type: "add-bookmark",
      title: "Nuevo Marcador",
      fields: [
        {
          name: "url",
          type: "url",
          placeholder: "https://youtube.com",
          required: true
        },
        {
          name: "title",
          type: "text",
          placeholder: "Youtube"
        }
      ],
      initialValues: { url: '', title: '' }, // Valores iniciales explícitos
      onSubmit: async (formData) => {
        try {
          const normalizedUrl = normalizeUrl(formData.url);
          const { title: apiTitle, favicon } = await fetchSiteData(normalizedUrl);
          const finalTitle = formData.title || capitalize(apiTitle);

          setBookmarks(prev => [
            ...prev,
            {
              id: Date.now(),
              url: normalizedUrl,
              title: finalTitle,
              favicon,
              folderId: null,
              isFavorite: false,
            },
          ]);
        } catch (error) {
          console.error("Error adding bookmark:", error);
          alert("Hubo un error al añadir el marcador.");
        }
      }
    });
  };

  // Editar un marcador
  const editBookmark = (id) => {
    const bookmark = bookmarks.find(b => b.id === id);
    openModal({
      type: "edit-bookmark",
      title: "Editar Marcador",
      initialValues: {
        url: bookmark.url || '', // Aseguramos que no sea undefined
        title: bookmark.title || '' // Aseguramos que no sea undefined
      },
      fields: [
        {
          name: "url",
          label: "URL",
          type: "url",
          required: true
        },
        {
          name: "title",
          label: "Nombre",
          type: "text"
        }
      ],
      onSubmit: (formData) => {
        setBookmarks(prev =>
          prev.map(b =>
            b.id === id ? { ...b, url: formData.url, title: formData.title } : b
          )
        );
      }
    });
  };

  // Eliminar un marcador
  const deleteBookmark = (id) => {
    const bookmark = bookmarks.find(b => b.id === id);
    openModal({
      type: "delete-bookmark",
      title: "Eliminar Marcador",
      content: `¿Estás seguro de eliminar el marcador "${bookmark.title}"?`,
      onSubmit: () => {
        setBookmarks(prev => prev.filter(b => b.id !== id));
      }
    });
  };

  // Alternar el estado de favorito de un marcador
  const toggleFavoriteBookmark = (id) => {
    setBookmarks((prevBookmarks) =>
      prevBookmarks.map((bookmark) =>
        bookmark.id === id
          ? { ...bookmark, isFavorite: !bookmark.isFavorite }
          : bookmark
      )
    );
  };

  // Alternar el menú de un marcador
  const toggleMenu = (bookmarkId) => {
    console.log("Antes:", menuOpenBookmark, "Después:", bookmarkId); // Depuración
    setMenuOpenBookmark((prev) => (prev === bookmarkId ? null : bookmarkId));
  };

  // Soltar un marcador en una nueva posición
  const handleDropBookmark = (e, targetIndex) => {
    e.preventDefault();
    const draggedBookmarkId = Number(e.dataTransfer.getData("text/plain"));
    if (!draggedBookmarkId) return;

    setBookmarks((prevBookmarks) => {
      const draggedBookmarkIndex = prevBookmarks.findIndex(
        (bookmark) => bookmark.id === draggedBookmarkId
      );
      const updatedBookmarks = [...prevBookmarks];
      const [movedBookmark] = updatedBookmarks.splice(draggedBookmarkIndex, 1);
      updatedBookmarks.splice(targetIndex, 0, movedBookmark);
      return updatedBookmarks;
    });
    setDraggingBookmarkId(null);
  };

  // Ordenar los marcadores con los favoritos primero
  const sortedBookmarks = (bookmarks) => {
    const favorites = bookmarks.filter((b) => b.isFavorite);
    const nonFavorites = bookmarks.filter((b) => !b.isFavorite);
    return [...favorites, ...nonFavorites];
  };

  //* Funciones para el componente "Carpetas" *//

  // Agregar una carpeta
  const addFolder = () => {
    openModal({
      type: "add-folder",
      title: "Nueva Carpeta",
      fields: [
        {
          name: "name",
          label: "Nombre de la carpeta",
          type: "text",
          placeholder: "Nombre de la carpeta",
          required: true
        }
      ],
      onSubmit: (formData) => {
        setFolders((prev) => [
          ...prev,
          { id: Date.now(), name: formData.name, isFavorite: false },
        ]);
      },
    });
  };

  // Editar carpeta
  const editFolder = (id) => {
    const folder = folders.find((f) => f.id === id);
    openModal({
      type: "edit-folder",
      title: "Editar Carpeta",
      fields: [
        {
          name: "name",
          label: "Nombre de la carpeta",
          type: "text",
          required: true
        }
      ],
      initialValues: {
        name: folder.name || '',
      },
      onSubmit: (formData) => {
        setFolders((prev) =>
          prev.map((f) => (f.id === id ? { ...f, name: formData.name } : f))
        );
      },
    });
  };

  // Eliminar una carpeta
  const deleteFolder = (id) => {
    const folder = folders.find((f) => f.id === id);
    const folderBookmarks = bookmarks.filter((b) => b.folderId === id);
    const isFavorite = folder?.isFavorite;

    openModal({
      type: "delete-folder",
      title: `Eliminar "${folder?.name}"`,
      content: (
        <div className="folder-delete-content">
          <p>¿Estás seguro de eliminar esta carpeta?</p>

          {folderBookmarks.length > 0 && (
            <div className="bookmarks-warning">
              <p>Contiene {folderBookmarks.length} marcador{folderBookmarks.length !== 1 ? 'es' : ''} que se moverán a la raíz.</p>
            </div>
          )}

          {isFavorite && (
            <div className="favorite-warning">
              ⭐ Esta carpeta está marcada como favorita
            </div>
          )}
        </div>
      ),
      onSubmit: () => {
        // 1. Eliminar la carpeta
        setFolders((prev) => prev.filter((f) => f.id !== id));

        // 2. Mover marcadores a la raíz
        setBookmarks((prev) =>
          prev.map((b) => (b.folderId === id ? { ...b, folderId: null } : b))
        );

        // 3. Cerrar la vista de la carpeta solo después de confirmar
        setActiveFolder(null);
      },
      // No hacemos nada especial al cancelar
      onCancel: () => console.log("Eliminación cancelada")
    });
  };

  // Mover un marcador a una carpeta
  const moveBookmarkToFolder = (bookmarkId, targetFolderId) => {
    setBookmarks((prevBookmarks) =>
      prevBookmarks.map((bookmark) =>
        bookmark.id === bookmarkId
          ? { ...bookmark, folderId: targetFolderId } // Actualiza el folderId del marcador
          : bookmark
      )
    );
    setMenuOpenBookmarkInFolder(null); // Cierra el menú después de mover
  };

  // Alternar el menú de un marcador en una carpeta
  const toggleMenuFolder = (bookmarkId) => {
    setMenuOpenBookmarkInFolder(menuOpenBookmarkInFolder === bookmarkId ? null : bookmarkId);
  };

  // Alternar el estado de favorito de una carpeta
  const toggleFavoriteFolder = (id) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder) =>
        folder.id === id
          ? { ...folder, isFavorite: !folder.isFavorite }
          : folder
      )
    );
  };

  // Agregar un marcador a una carpeta específica
  const addBookmarkFolder = async (folderId = null) => {
    openModal({
      type: "add-bookmark",
      title: folderId ? `Añadir marcador a carpeta` : "Añadir nuevo marcador",
      fields: [
        {
          name: "url",
          type: "url",
          placeholder: "https://youtube.com",
          required: true
        },
        {
          name: "title",
          type: "text",
          placeholder: "Youtube"
        }
      ],
      onSubmit: async (formData) => {
        let url = formData.url;
        // Asegurar que la URL tenga protocolo
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }

        try {
          const { title: fetchedTitle, favicon } = await fetchSiteData(url);
          const finalTitle = formData.title || fetchedTitle;

          setBookmarks((prev) => [
            ...prev,
            {
              id: Date.now(),
              url,
              title: finalTitle,
              favicon,
              folderId, // Aquí usamos el folderId proporcionado
              isFavorite: false,
            },
          ]);
        } catch (error) {
          console.error("Error adding bookmark:", error);
          alert("Hubo un error al añadir el marcador.");
        }
      }
    });
  };

  // Alternar el estado de favorito de un marcador en una carpeta
  const toggleFavoriteBookmarkFolder = (id) => {
    setBookmarks((prevBookmarks) =>
      prevBookmarks.map((bookmark) =>
        bookmark.id === id
          ? { ...bookmark, isFavorite: !bookmark.isFavorite }
          : bookmark
      )
    );
  };

  // Manejadores de eventos de arrastrar y soltar para carpetas
  const handleDragStartFolder = (e, folderId) => {
    setDraggingFolderId(folderId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", folderId.toString());
  };

  // Soltar una carpeta en una nueva posición
  const handleDropFolder = (e, targetIndex) => {
    e.preventDefault();
    const draggedFolderId = Number(e.dataTransfer.getData("text/plain"));
    if (!draggedFolderId) return;

    setFolders((prevFolders) => {
      const draggedFolderIndex = prevFolders.findIndex((f) => f.id === draggedFolderId);
      const updatedFolders = [...prevFolders];
      const [movedFolder] = updatedFolders.splice(draggedFolderIndex, 1);
      updatedFolders.splice(targetIndex, 0, movedFolder);
      return updatedFolders;
    });
    setDraggingFolderId(null);
  };

  // Ordenar las carpetas con los favoritos primero
  const sortedFolders = (folders) => {
    const favorites = folders.filter((f) => f.isFavorite);
    const nonFavorites = folders.filter((f) => !f.isFavorite);
    return [...favorites, ...nonFavorites];
  };

  //* Componentes de arrastrar y soltar *//

  // Manejadores de eventos de arrastrar y soltar
  const handleDragStartBookmark = (e, bookmarkId) => {
    setDraggingBookmarkId(bookmarkId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", bookmarkId.toString());
  };

  // Evitar que el navegador abra la URL al soltar
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Manejar la subida por arrastre
  const handleDragOverDesign = (e) => {
    e.preventDefault();
  };

  //* Funcion del componente "Cambiar Diseño" *//

  // Función para alternar el estado del menú
  const toggleDesignMenu = () => {
    if (isMenuOpen) {
      setSelectedThumbnail(null); // Deseleccionar miniaturas al cerrar el menú
    }
    setIsMenuOpen(!isMenuOpen); // Alternar el estado del menú
    console.log("Menú activado/desactivado");
  };

  // Función para cambiar la pestaña activa dentro del menú
  const selectTab = (tabName) => {
    console.log("Pestaña seleccionada:", tabName);
    setActiveTab(tabName); // Cambia a la pestaña seleccionada ("preview" o "upload")
  };

  // Función para manejar clics fuera del menú
  const handleOutsideClick = (e) => {
    if (isMenuOpen && !e.target.closest(".design-menu") && !e.target.closest(".change-design-button")) {
      toggleDesignMenu(); // Cerrar el menú y deseleccionar miniaturas
    }
  };

  // Manejador para cargar imágenes
  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;

    if (files.length > 0) {
      const newImages = Array.from(files).filter((file) => file.name.toLowerCase().endsWith(".png"));

      if (newImages.length > 0) {
        // Verificar si se ha alcanzado el límite de 8 archivos
        if (images.length + newImages.length > 8) {
          setErrorMessage("No tienes más espacio. Elimina algún archivo y repite.");
          return;
        }

        Promise.all(
          newImages.map((file) =>
            new Promise((resolve, reject) => {
              // Verificar si el archivo ya ha sido subido
              if (isFileAlreadyUploaded(file.name)) {
                setErrorMessage(`El archivo "${file.name}" ya ha sido subido.`);
                reject(new Error(`Archivo duplicado: ${file.name}`));
              } else {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: file.name, url: reader.result });
                reader.onerror = reject;
                reader.readAsDataURL(file);
              }
            })
          )
        )
          .then((newImageUrls) => {
            const updatedImages = [...images, ...newImageUrls].slice(0, 8); // Limitamos a 8 imágenes
            setImages(updatedImages);
            localStorage.setItem("savedImages", JSON.stringify(updatedImages)); // Guardamos en localStorage
            setErrorMessage(""); // Limpiamos cualquier mensaje de error
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        setErrorMessage("Solo se permiten archivos PNG.");
      }
    }
  };

  // Función para eliminar una imagen
  const deleteImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    localStorage.setItem("savedImages", JSON.stringify(updatedImages)); // Actualizamos localStorage
  };

  // Función para verificar si un archivo ya ha sido subido
  const isFileAlreadyUploaded = (fileName) => {
    return images.some((image) => image.name === fileName);
  };

  // Función para manejar la selección/deselección de una miniatura
  const handleThumbnailClick = (index) => {
    if (selectedThumbnail === index) {
      setSelectedThumbnail(null); // Deseleccionar si ya estaba seleccionada
    } else {
      setSelectedThumbnail(index); // Seleccionar la nueva miniatura
    }
  };

  // Función para aplicar el diseño seleccionado a la carpeta activa
  const applyDesignToFolder = () => {
    if (selectedThumbnail !== null && activeFolder !== null) {
      const selectedDesign = images[selectedThumbnail]?.url;

      if (selectedDesign) {
        // Actualizar el ícono de la carpeta activa con el diseño seleccionado
        const updatedFolders = folders.map((folder) =>
          folder.id === activeFolder ? { ...folder, icon: selectedDesign } : folder
        );

        setFolders(updatedFolders); // Actualizar el estado de las carpetas

        // Guardar en localStorage
        localStorage.setItem("folders", JSON.stringify(updatedFolders));

        setIsMenuOpen(false); // Cerrar el menú
        setSelectedThumbnail(null); // Deseleccionar la miniatura
      }
    }
  };

  //*Funciones para los widgets*//

  // Función para manejar la selección de un widget
  const handleWidgetSelect = (area, widgetId) => {
    if (area === 5 && widgetId !== selectedWidgetArea6) {
      setSelectedWidgetArea5(widgetId);
    } else if (area === 6 && widgetId !== selectedWidgetArea5) {
      setSelectedWidgetArea6(widgetId);
    }
  };

  // Función para cerrar un widget desplegado
  const handleCloseWidget = (area) => {
    if (area === 5) {
      setSelectedWidgetArea5(null);
    } else if (area === 6) {
      setSelectedWidgetArea6(null);
    }
  };

  //* Modal *//

  // Función para abrir el modal
  const openModal = (config) => {
    console.log("Abriendo modal");
    // Para modales de eliminación, no incluimos fields ni initialValues
    const modalConfig = config.type === "delete-bookmark"
      ? {
        type: config.type,
        title: config.title,
        content: config.content,
        onSubmit: config.onSubmit
      }
      : config;

    setModalData(modalConfig);
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    console.log("Cerrando modal");
    setModalData(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalData?.title}
        type={modalData?.type}
        fields={modalData?.fields}
        initialValues={modalData?.initialValues}
        content={modalData?.content}
        onConfirm={(data) => modalData?.onSubmit(data)}
        onCancel={closeModal}
      >
        {modalData?.type === "add-bookmark" && (
          <>
            <input type="url" placeholder="https://ejemplo.com" />
            <input type="text" placeholder="Título del marcador" />
          </>
        )}

        {modalData?.type === "edit-bookmark" && (
          <>
            <label>URL:</label>
            <input
              type="url"
              defaultValue={modalData.initialValues.url} // Mostrar la URL actual
            />
            <label>Nombre:</label>
            <input
              type="text"
              defaultValue={modalData.initialValues.title} // Mostrar el título actual
            />
          </>
        )}

        {modalData?.type === "delete-bookmark" && (
          <p>¿Estás seguro de eliminar este marcador?</p>
        )}

        {modalData?.type === "add-folder" && (
          <>
            <label>Nombre de la carpeta:</label>
            <input type="text" placeholder="Nombre de la carpeta" />
          </>
        )}

        {modalData?.type === "edit-folder" && (
          <>
            <label>Nombre de la carpeta:</label>
            <input type="text" defaultValue={modalData.initialValues.name} />
          </>
        )}

        {modalData?.type === "delete-folder" && modalData.content}
      </Modal>

      <div className="container" onClick={handleOutsideClick}>
        {/* Header */}
        <header className="item header">
          <div className="title">Mis Marcadores</div>
          <div className="search-bar">
            <input type="text" className="search-input" placeholder="Buscar..." />
            <button
              className="icon-button"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              aria-label="Configuración">
              <svg
              className="settings-icon" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              stroke="#000" 
              viewBox="0 0 24 24" 
              width="24" 
              height="24">
                <path fillRule="evenodd" d="M14.2788 2.15224C13.9085 2 13.439 2 12.5 2s-1.4085 0-1.7788.15224c-.4938.20299-.88611.59234-1.09064 1.08239-.09337.22371-.12991.48387-.14421.86336-.02101.55769-.30919 1.0739-.79618 1.35294-.48699.27903-1.08153.26861-1.57868.00783-.33831-.17746-.5836-.27614-.8255-.30774-.5299-.06924-1.06581.07327-1.48983.39618-.31802.24218-.55277.6457-1.02226 1.45273-.46949.80704-.70423 1.21055-.75655 1.60498-.06977.52589.07383 1.05775.3992 1.47859.14851.1921.35722.3535.68115.5555.47621.297.78262.8029.78259 1.361-.00003.5581-.30643 1.0639-.78259 1.3608-.32398.2021-.53273.3636-.68125.5557-.32537.4208-.46896.9526-.3992 1.4785.05232.3944.28707.798.75655 1.605.46949.807.70424 1.2106 1.02226 1.4527.42402.3229.95993.4654 1.48983.3962.24189-.0316.48716-.1303.82544-.3077.49719-.2608 1.09177-.2712 1.57879.0078.48702.2791.77521.7953.79623 1.3531.0143.3794.05084.6396.14421.8633.20453.49.59684.8794 1.09064 1.0824C11.0915 22 11.561 22 12.5 22s1.4085 0 1.7788-.1522c.4938-.203.8861-.5924 1.0906-1.0824.0934-.2237.13-.4839.1443-.8634.021-.5577.3091-1.0739.7961-1.353.487-.2791 1.0816-.2686 1.5788-.0078.3383.1774.5835.276.8254.3076.5299.0693 1.0658-.0732 1.4898-.3961.3181-.2422.5528-.6457 1.0223-1.4528.4695-.807.7042-1.2105.7566-1.6049.0697-.5259-.0739-1.0578-.3992-1.4786-.1486-.1921-.3573-.3536-.6813-.5556-.4761-.2969-.7825-.8028-.7825-1.3609s.3064-1.0638.7825-1.3607c.3241-.2021.5328-.3635.6814-.5557.3253-.42077.4689-.95263.3992-1.47853-.0524-.39442-.2871-.79794-.7566-1.60497-.4695-.80703-.7042-1.21055-1.0223-1.45273-.424-.32291-.9599-.46542-1.4898-.39618-.2419.0316-.4872.13027-.8254.30771-.4972.26079-1.0918.27122-1.5788-.00784-.487-.27905-.7752-.7953-.7963-1.35302-.0143-.37946-.0508-.63961-.1442-.86331-.2045-.49005-.5968-.8794-1.0906-1.08239ZM12.5 15c1.6695 0 3.0228-1.3431 3.0228-3S14.1695 9 12.5 9c-1.6695 0-3.02284 1.3431-3.02284 3S10.8305 15 12.5 15Z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              className="icon-button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              aria-label="Mi cuenta">
              <svg
              className="account-icon" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              stroke="#000" 
              viewBox="0 0 24 24" 
              width="24" 
              height="24">
                <path fillRule="evenodd" d="M11.7501 6.40636c-1.4803 0-1.6279.15614-2.394.15614C8.71769 6.5625 6.80245 5 5.84485 5c-.95761 0-2.07481.5625-2.07481 2.1875v1.875c.00193.49219.18077 2.0009.88071 1.5977-.82752.978-.91112 2.1184-.89975 3.2224-.22288.0644-.45028.137-.67097.2124-.68389.2339-1.40918.5321-1.73683.7437-.347959.2247-.447861.689-.22314 1.0369.22472.348.68897.4479 1.03692.2232.15622-.1009.72125-.3495 1.40834-.5844.07592-.026.15199-.0513.22766-.0758.04627.4338.1611.8298.3318 1.1906l-.02358.0124c-.40972.2165-.7899.4651-1.03231.6236-.04195.0274-.07977.0521-.1129.0735-.34796.2247-.44786.689-.22314 1.0369.22472.348.68897.4479 1.03693.2232.04112-.0266.08494-.0552.13119-.0854.24533-.1601.55902-.3649.90102-.5456.08019-.0424.15736-.0808.23118-.1154C6.76347 19.4748 9.86991 20 11.7501 20c1.8801 0 4.9866-.5252 6.7169-2.1476.0738.0346.1509.073.2311.1154.342.1807.6557.3855.901.5456.0463.0302.0901.0588.1312.0854.348.2247.8122.1248 1.037-.2232.2247-.3479.1248-.8122-.2232-1.0369-.0331-.0214-.0709-.0461-.1129-.0735-.2424-.1585-.6226-.4071-1.0323-.6236l-.0235-.0124c.1707-.3609.2855-.7568.3318-1.1907.0758.0245.152.0498.228.0759.6871.2349 1.2522.4835 1.4084.5844.3479.2247.8122.1248 1.0369-.2232.2247-.3479.1248-.8122-.2231-1.0369-.3277-.2116-1.053-.5098-1.7369-.7437-.2208-.0755-.4483-.148-.6713-.2125.0113-1.104-.0723-2.2443-.8998-3.2223.7.4032.8788-1.10551.8808-1.5977V7.18761c0-1.625-1.1173-2.1875-2.0749-2.1875S14.7825 6.5625 14.1441 6.5625c-.7661 0-.9136-.15614-2.394-.15614Zm-.6756 9.19404c.2026-.069.4417-.1004.6756-.1004s.473.0314.6756.1004c.0994.0338.221.0872.328.1734.1075.0865.2464.2468.2464.4762 0 .2294-.1389.3897-.2464.4762-.107.0862-.2286.1396-.328.1734-.2026.069-.4417.1004-.6756.1004s-.473-.0314-.6756-.1004c-.0994-.0338-.221-.0872-.3281-.1734-.1075-.0865-.2463-.2468-.2463-.4762 0-.2294.1388-.3897.2463-.4762.1071-.0862.2287-.1396.3281-.1734Zm2.8456-3.0999c.1365-.2284.4059-.5005.81-.5005.4041 0 .6735.2721.8099.5005.1423.2382.2101.5269.2101.812s-.0678.5738-.2101.812c-.1364.2284-.4058.5005-.8099.5005-.4041 0-.6735-.2721-.81-.5005-.1423-.2382-.21-.5269-.21-.812s.0677-.5738.21-.812Zm-5.95994 0c.13642-.2284.40583-.5005.80994-.5005.40411 0 .67352.2721.80994.5005.1423.2382.21007.5269.21007.812s-.06777.5738-.21007.812c-.13642.2284-.40583.5005-.80994.5005-.40411 0-.67352-.2721-.80994-.5005-.1423-.2382-.21007-.5269-.21007-.812s.06777-.5738.21007-.812Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Menú de Configuración */}
          {showSettingsMenu && (
            <div className="modal-menu settings-menu">
              <ul>
                <li>Opción 1</li>
                <li>Opción 2</li>
                <li>Opción 3</li>
              </ul>
            </div>
          )}

          {/* Menú de Cuenta */}
          {showAccountMenu && (
            <div className="modal-menu account-menu">
              <ul>
                <li>Perfil</li>
                <li>Ajustes</li>
                <li>Cerrar sesión</li>
              </ul>
            </div>
          )}
        </header>

        {/* Sidebar */}
        <div className="item sidebar">
          <h3>📌 Accesos Rapidos</h3>
          <button className="add-bookmark-button" onClick={addBookmark}>
            <svg
              className="bookmark-icon"
              width="18px"
              height="18px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="#000000"
              strokeWidth="0.72">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path fillRule="evenodd" clipRule="evenodd" d="M21 11.0975V16.0909C21 19.1875 21 20.7358 20.2659 21.4123C19.9158 21.735 19.4739 21.9377 19.0031 21.9915C18.016 22.1045 16.8633 21.0849 14.5578 19.0458C13.5388 18.1445 13.0292 17.6938 12.4397 17.5751C12.1494 17.5166 11.8506 17.5166 11.5603 17.5751C10.9708 17.6938 10.4612 18.1445 9.44216 19.0458C7.13673 21.0849 5.98402 22.1045 4.99692 21.9915C4.52615 21.9377 4.08421 21.735 3.73411 21.4123C3 20.7358 3 19.1875 3 16.0909V11.0975C3 6.80891 3 4.6646 4.31802 3.3323C5.63604 2 7.75736 2 12 2C16.2426 2 18.364 2 19.682 3.3323C21 4.6646 21 6.80891 21 11.0975ZM8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H9C8.58579 6.75 8.25 6.41421 8.25 6Z"></path>
              </g>
            </svg> &nbsp; | &nbsp;  Añadir Marcador
          </button>
          <ul>
            {sortedBookmarks(bookmarks)
              .filter((b) => b.folderId === null) // Filtrar marcadores sin carpeta
              .map((bookmark, index) => (
                <li
                  key={bookmark.id}
                  draggable
                  onDragStart={(e) => handleDragStartBookmark(e, bookmark.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropBookmark(e, index)}
                  className="bookmark-item"
                  onMouseLeave={() => setMenuOpenBookmark(null)} // Cierra el menú al salir del marcador
                >
                  {/* Ícono del marcador */}
                  <img
                    src={bookmark.favicon || "/default-icon.png"}
                    alt="favicon"
                    className="favicon"
                  />

                  {/* Título del marcador */}
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                    {bookmark.title}
                  </a>

                  {/* Botón de favorito */}
                  <button
                    className="favorite-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que el clic afecte al marcador
                      toggleFavoriteBookmark(bookmark.id);
                    }}
                  >
                    <img
                      src={bookmark.isFavorite ? "/star-filled.png" : "/star-outline.png"}
                      alt="favorite"
                      className="favorite-icon"
                    />
                  </button>

                  {/* Botón de menú */}
                  <button
                    className="menu-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que el clic afecte al marcador
                      toggleMenu(bookmark.id); // Alterna el menú
                    }}
                  >
                    ⋮
                  </button>

                  {/* Menú desplegable flotante */}
                  {menuOpenBookmark === bookmark.id && (
                    <div
                      className={`menu ${menuOpenBookmark === bookmark.id ? "active" : ""}`}
                      onMouseLeave={() => setMenuOpenBookmark(null)} // Cierra el menú al salir
                    >
                      <button onClick={() => editBookmark(bookmark.id)}>
                        <svg
                          className="pencil-icon"
                          width="18px"
                          height="18px"
                          viewBox="0 0 24.00 24.00"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          stroke="#000000"
                          strokeWidth="1.5">
                          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                          <g id="SVGRepo_iconCarrier">
                            <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z"></path>
                            <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z"></path>
                          </g>
                        </svg> | Editar</button>
                      <button onClick={() => deleteBookmark(bookmark.id)}>
                        <svg
                          className="eraser-icon"
                          width="18px"
                          height="18px"
                          viewBox="0 0 24.00 24.00"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          stroke="#000000" strokeWidth="1.4">
                          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                          <g id="SVGRepo_iconCarrier">
                            <path d="M11.4096 5.50506C13.0796 3.83502 13.9146 3 14.9522 3C15.9899 3 16.8249 3.83502 18.4949 5.50506C20.165 7.1751 21 8.01013 21 9.04776C21 10.0854 20.165 10.9204 18.4949 12.5904L14.3017 16.7837L7.21634 9.69828L11.4096 5.50506Z"></path>
                            <path d="M6.1557 10.759L13.2411 17.8443L12.5904 18.4949C12.2127 18.8727 11.8777 19.2077 11.5734 19.5H21C21.4142 19.5 21.75 19.8358 21.75 20.25C21.75 20.6642 21.4142 21 21 21H9C7.98423 20.9747 7.1494 20.1393 5.50506 18.4949C3.83502 16.8249 3 15.9899 3 14.9522C3 13.9146 3.83502 13.0796 5.50506 11.4096L6.1557 10.759Z"></path>
                          </g>
                        </svg> | Eliminar</button>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>

        {/* Carpetas */}
        <div className="item folders">
          <div className="folder-row">
            {/* Carpetas */}
            {sortedFolders(folders).map((folder, index) => (
              <div
                key={folder.id}
                draggable
                onDragStart={(e) => handleDragStartFolder(e, folder.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropFolder(e, index)}
                className="folder-item"
                onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
              >
                {/* Ícono de carpeta personalizado */}
                <div className="folder-icon-container">
                  <img
                    src={folder.icon || "/assets/folder-icon.png"} // Usa el ícono personalizado si existe, o uno predeterminado
                    alt="Carpeta"
                    className="folder-icon"
                  />
                </div>
                <div className="folder-name">{folder.name}</div>
              </div>
            ))}

            {/* Botón de añadir carpeta */}
            <button className="add-folder-button" onClick={addFolder}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                stroke="#000000"
              >
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <g id="style=doutone">
                    <g id="add-circle">
                      <path
                        id="vector (Stroke)"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75ZM1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12Z"
                        fill="#000000"
                      ></path>
                      <path
                        id="vector (Stroke)_2"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 7.00744C12.4142 7.00744 12.75 7.34323 12.75 7.75744L12.75 16.2427C12.75 16.6569 12.4142 16.9927 12 16.9927C11.5857 16.9927 11.25 16.6569 11.25 16.2427L11.25 7.75743C11.25 7.34322 11.5858 7.00744 12 7.00744Z"
                        fill="#000000"
                      ></path>
                      <path
                        id="vector (Stroke)_3"
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M17 12C17 12.4142 16.6642 12.75 16.25 12.75L7.76476 12.75C7.35055 12.75 7.01476 12.4142 7.01476 12C7.01477 11.5857 7.35055 11.25 7.76477 11.25L16.25 11.25C16.6642 11.25 17 11.5858 17 12Z"
                        fill="#000000"
                      ></path>
                    </g>
                  </g>
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido de Carpeta */}
        <div className="folder-content">
          {activeFolder && (
            <>
              {/* Barra superior con el nombre de la carpeta y botones de acción */}
              <div className="folder-header">
                <div className="folder-info">
                  <h3>{folders.find((f) => f.id === activeFolder)?.name}</h3>
                </div>
                <div className="folder-actions">
                  {/* Botón de editar carpeta (E) */}
                  <button
                    className="edit-folder-button"
                    onClick={() => editFolder(activeFolder)}
                    title="Editar carpeta"
                  >
                    {/* SVG del ícono de edición */}
                    <svg
                      className="edit-icon"
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="#000000"
                      strokeWidth="1.008">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.048"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path fillRule="evenodd" clipRule="evenodd" d="M3.25 22C3.25 21.5858 3.58579 21.25 4 21.25H20C20.4142 21.25 20.75 21.5858 20.75 22C20.75 22.4142 20.4142 22.75 20 22.75H4C3.58579 22.75 3.25 22.4142 3.25 22Z"></path>
                        <path d="M11.5201 14.929L11.5201 14.9289L17.4368 9.01225C16.6315 8.6771 15.6777 8.12656 14.7757 7.22455C13.8736 6.32238 13.323 5.36846 12.9879 4.56312L7.07106 10.4799L7.07101 10.48C6.60932 10.9417 6.37846 11.1725 6.17992 11.4271C5.94571 11.7273 5.74491 12.0522 5.58107 12.396C5.44219 12.6874 5.33894 12.9972 5.13245 13.6167L4.04356 16.8833C3.94194 17.1882 4.02128 17.5243 4.2485 17.7515C4.47573 17.9787 4.81182 18.0581 5.11667 17.9564L8.38334 16.8676C9.00281 16.6611 9.31256 16.5578 9.60398 16.4189C9.94775 16.2551 10.2727 16.0543 10.5729 15.8201C10.8275 15.6215 11.0584 15.3907 11.5201 14.929Z" ></path>
                        <path d="M19.0786 7.37044C20.3071 6.14188 20.3071 4.14999 19.0786 2.92142C17.85 1.69286 15.8581 1.69286 14.6296 2.92142L13.9199 3.63105C13.9296 3.6604 13.9397 3.69015 13.9502 3.72028C14.2103 4.47 14.701 5.45281 15.6243 6.37602C16.5475 7.29923 17.5303 7.78999 18.28 8.05009C18.31 8.0605 18.3396 8.07054 18.3688 8.08021L19.0786 7.37044Z"></path>
                      </g>
                    </svg>
                  </button>

                  {/* Botón de favoritos */}
                  <button
                    className="favorite-folder-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que el clic afecte a otros elementos
                      toggleFavoriteFolder(activeFolder);
                    }}
                    title={folders.find((f) => f.id === activeFolder)?.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"}
                  >
                    {/* SVG del ícono de favoritos */}
                    <svg
                      className={`favorite-icon ${folders.find((f) => f.id === activeFolder)?.isFavorite ? "favorited" : ""
                        }`}
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="#000000">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M15.2516 10.689C14.265 9.50847 13.7716 8.91821 13.2045 9.00913C12.6375 9.10004 12.3722 9.81193 11.8416 11.2357L11.7043 11.604C11.5535 12.0086 11.4781 12.2109 11.3314 12.3599C11.1848 12.509 10.9834 12.5878 10.5806 12.7456L10.214 12.8892C8.79667 13.4443 8.08803 13.7218 8.00721 14.2891C7.92639 14.8564 8.52692 15.3378 9.72797 16.3004L10.0387 16.5495C10.38 16.8231 10.5507 16.9599 10.6494 17.1471C10.7482 17.3343 10.7639 17.5508 10.7954 17.9837L10.824 18.3779C10.9347 19.9015 10.9901 20.6633 11.5072 20.923C12.0244 21.1827 12.6608 20.7683 13.9337 19.9395L14.263 19.7251C14.6247 19.4896 14.8056 19.3718 15.0133 19.3385C15.2211 19.3052 15.4322 19.3601 15.8543 19.47L16.2387 19.57C17.7244 19.9565 18.4673 20.1498 18.8677 19.743C19.2681 19.3362 19.061 18.5987 18.6466 17.1238L18.5394 16.7422C18.4216 16.3231 18.3628 16.1135 18.3924 15.9057C18.422 15.6979 18.5367 15.5154 18.7662 15.1503L18.9751 14.818C19.7826 13.5332 20.1864 12.8909 19.9167 12.3798C19.647 11.8687 18.8826 11.8273 17.3536 11.7446L16.958 11.7231C16.5235 11.6996 16.3063 11.6879 16.1168 11.5927C15.9274 11.4976 15.7872 11.3299 15.5068 10.9944L15.2516 10.689Z"></path>
                        <path d="M14.8779 5.16723L15.0609 5.68905C15.262 6.26221 15.3625 6.5488 15.5581 6.75991C15.7537 6.97102 16.0222 7.08275 16.5591 7.30621L17.048 7.50967C18.9378 8.29605 19.8826 8.68925 19.9904 9.49292C20.0352 9.82745 19.9227 10.1409 19.6605 10.4912C19.5719 10.4672 19.4866 10.4477 19.4064 10.4313C18.8802 10.3244 18.211 10.2883 17.5289 10.2516L17.0392 10.2251C16.945 10.22 16.8718 10.216 16.8091 10.2119C16.7675 10.1633 16.7196 10.106 16.6579 10.0322L16.3423 9.65455C15.9019 9.12739 15.4711 8.6116 15.0704 8.25353C14.6431 7.87167 13.9288 7.37362 12.9672 7.52777C11.9955 7.68356 11.4771 8.39062 11.1975 8.89529C10.9384 9.36286 10.7054 9.98863 10.4694 10.6222L10.2989 11.08C10.27 11.1573 10.2469 11.2193 10.2266 11.2725C10.1732 11.2939 10.1112 11.3183 10.0337 11.3486L9.57825 11.527C8.94737 11.7739 8.32492 12.0175 7.86145 12.2842C7.36271 12.5711 6.66139 13.1012 6.52233 14.0773C6.38458 15.0441 6.89951 15.7499 7.28929 16.1685C7.57979 16.4805 7.9701 16.8095 8.38684 17.1468C6.81827 17.5723 5.98392 17.7311 5.50972 17.2192C4.97582 16.6429 5.25206 15.5982 5.80455 13.5087L5.94749 12.9682C6.10449 12.3744 6.18299 12.0775 6.14352 11.7831C6.10404 11.4887 5.95106 11.2301 5.6451 10.713L5.36655 10.2421C4.28985 8.4221 3.75151 7.51211 4.11106 6.78804C4.4706 6.06397 5.48992 6.00535 7.52857 5.88812L8.05599 5.85779C8.63531 5.82448 8.92497 5.80782 9.17756 5.67305C9.43014 5.53828 9.61705 5.30066 9.99088 4.82542L10.3312 4.39274C11.6467 2.72034 12.3045 1.88413 13.0606 2.01293C13.8167 2.14173 14.1705 3.15023 14.8779 5.16723Z"></path>
                      </g>
                    </svg>
                  </button>

                  {/* Botón de cambiar diseño de carpeta (C) */}
                  <button
                    className="change-design-button"
                    onClick={toggleDesignMenu}
                    title="Cambiar diseño"
                  >
                    {/* SVG del ícono de diseño */}
                    <svg
                      className="change-design-icon"
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="#000000">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path fillRule="evenodd" clipRule="evenodd" d="M10.8468 21.9342C5.86713 21.3624 2 17.1328 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.1565 18.7173 16.7325 15.9135 16.3703C14.2964 16.1614 12.8386 15.9731 12.2619 16.888C11.8674 17.5136 12.2938 18.2938 12.8168 18.8168C13.4703 19.4703 13.4703 20.5297 12.8168 21.1832C12.2938 21.7062 11.5816 22.0186 10.8468 21.9342ZM11.085 6.99976C11.085 7.82818 10.4134 8.49976 9.585 8.49976C8.75658 8.49976 8.085 7.82818 8.085 6.99976C8.085 6.17133 8.75658 5.49976 9.585 5.49976C10.4134 5.49976 11.085 6.17133 11.085 6.99976ZM6.5 13C7.32843 13 8 12.3284 8 11.5C8 10.6716 7.32843 9.99998 6.5 9.99998C5.67157 9.99998 5 10.6716 5 11.5C5 12.3284 5.67157 13 6.5 13ZM17.5 13C18.3284 13 19 12.3284 19 11.5C19 10.6716 18.3284 9.99998 17.5 9.99998C16.6716 9.99998 16 10.6716 16 11.5C16 12.3284 16.6716 13 17.5 13ZM14.5 8.49998C15.3284 8.49998 16 7.82841 16 6.99998C16 6.17156 15.3284 5.49998 14.5 5.49998C13.6716 5.49998 13 6.17156 13 6.99998C13 7.82841 13.6716 8.49998 14.5 8.49998Z"></path>
                      </g>
                    </svg>
                  </button>

                  {/*Menú desplegable para cambiar diseño de carpeta */}
                  {isMenuOpen && (
                    <div className="design-menu">
                      {/* Pestañas*/}
                      <div className="tabs">
                        <button
                          className={`tab ${activeTab === "preview" ? "active" : ""}`}
                          onClick={() => selectTab("preview")} // Cambia a la pestaña "Vista Previa"
                        >
                          Vista Previa
                        </button>
                        <button
                          className={`tab ${activeTab === "upload" ? "active" : ""}`}
                          onClick={() => selectTab("upload")} // Cambia a la pestaña "Subir Archivo"
                        >
                          Subir Archivo
                        </button>
                      </div>

                      {/* Contenido de las pestañas */}
                      <div className="tab-content">
                        {activeTab === "preview" && (
                          <div className="preview-tab">
                            <p>Selecciona un diseño para aplicarlo:</p>
                            <div className="design-preview-grid">
                              {Array(8)
                                .fill(null)
                                .map((_, index) => (
                                  <div
                                    key={index}
                                    className={`design-thumbnail ${selectedThumbnail === index ? "selected" : ""}`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evita que el clic se propague al contenedor padre
                                      handleThumbnailClick(index);
                                    }}
                                  >
                                    {images[index] ? (
                                      <>
                                        <img src={images[index].url} alt={`Diseño ${index + 1}`} className="image-thumbnail" />
                                        <button
                                          className="delete-button"
                                          onClick={() => deleteImage(index)}
                                          title="Eliminar archivo"
                                        >
                                          <svg
                                            className="delete-icon"
                                            width="20px"
                                            height="20px"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            stroke="#000000">
                                            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                                            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                                            <g id="SVGRepo_iconCarrier">
                                              <path fillRule="evenodd" clipRule="evenodd" d="M10.1111 2C9.37473 2 8.77778 2.59695 8.77778 3.33333C8.77778 3.70152 8.4793 4 8.11111 4L8 4L5 4C4.44772 4 4 4.44772 4 5C4 5.55228 4.44772 6 5 6L8 6H8.11111L15.8873 6C15.8878 6 15.8884 6 15.8889 6H16L19 6C19.5523 6 20 5.55228 20 5C20 4.44772 19.5523 4 19 4H15.8881C15.5203 3.99956 15.2222 3.70126 15.2222 3.33333C15.2222 2.59695 14.6253 2 13.8889 2H10.1111Z"></path>
                                              <path fillRule="evenodd" clipRule="evenodd" d="M6 8C5.72035 8 5.45348 8.1171 5.26412 8.32289C5.07477 8.52868 4.98023 8.80436 5.00346 9.08305L5.77422 18.3322C5.94698 20.4054 7.68005 22 9.7604 22H14.2396C16.32 22 18.053 20.4054 18.2258 18.3322L18.9965 9.08305C19.0198 8.80436 18.9252 8.52868 18.7359 8.32289C18.5465 8.1171 18.2797 8 18 8H6Z"></path>
                                            </g>
                                          </svg>
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                ))}
                            </div>

                            {/* Botón de selección */}
                            <button className="select-button" onClick={applyDesignToFolder}>
                              Seleccionar
                            </button>
                          </div>
                        )}

                        {activeTab === "upload" && (
                          <div className="upload-tab">
                            {/* Zona de subida*/}
                            <div
                              className="drop-zone"
                              onDragOver={handleDragOverDesign} // Previene el comportamiento predeterminado al arrastrar
                              onDrop={handleDrop} // Maneja el archivo arrastrado
                            >
                              <p>Arrasta tu archivo aquí o has click para seleccionarlo.</p>
                              <input
                                type="file"
                                accept="image/png"
                                multiple
                                onChange={(e) => {
                                  const files = e.target.files;
                                  if (files.length > 0) {
                                    const newImages = Array.from(files).filter((file) =>
                                      file.name.toLowerCase().endsWith(".png")
                                    );
                                    if (newImages.length > 0) {
                                      // Verificar si se ha alcanzado el límite de 8 archivos
                                      if (images.length + newImages.length > 8) {
                                        setErrorMessage("No tienes más espacio. Elimina algún archivo y repite.");
                                        return;
                                      }

                                      Promise.all(
                                        newImages.map((file) =>
                                          new Promise((resolve, reject) => {
                                            // Verificar si el archivo ya ha sido subido
                                            if (isFileAlreadyUploaded(file.name)) {
                                              setErrorMessage(`El archivo "${file.name}" ya ha sido subido.`);
                                              reject(new Error(`Archivo duplicado: ${file.name}`));
                                            } else {
                                              const reader = new FileReader();
                                              reader.onload = () => resolve({ name: file.name, url: reader.result });
                                              reader.onerror = reject;
                                              reader.readAsDataURL(file);
                                            }
                                          })
                                        )
                                      )
                                        .then((newImageUrls) => {
                                          const updatedImages = [...images, ...newImageUrls].slice(0, 8); // Limitamos a 8 imágenes
                                          setImages(updatedImages);
                                          localStorage.setItem("savedImages", JSON.stringify(updatedImages)); // Guardamos en localStorage
                                          setErrorMessage(""); // Limpiamos cualquier mensaje de error
                                        })
                                        .catch((error) => {
                                          console.error(error);
                                        });
                                    } else {
                                      setErrorMessage("Solo se permiten archivos PNG.");
                                    }
                                  }
                                }}
                                style={{ display: "none" }}
                                id="file-input"
                              />
                              <label htmlFor="file-input" className="upload-button">
                                Seleccionar Archivo
                              </label>
                            </div>

                            {/* Mostrar el mensaje de error */}
                            {errorMessage && <div className="error-message">{errorMessage}</div>}

                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Botón de eliminar carpeta (X) */}
                  <button
                    className="delete-folder-button"
                    onClick={() => activeFolder && deleteFolder(activeFolder)}
                    title="Eliminar esta carpeta"
                    disabled={!activeFolder}
                  >
                    {/* SVG del ícono de eliminación */}
                    <svg
                      className="delete-folder-icon"
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="#000000">
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                      <g id="SVGRepo_iconCarrier">
                        <path d="M3 6.38597C3 5.90152 3.34538 5.50879 3.77143 5.50879L6.43567 5.50832C6.96502 5.49306 7.43202 5.11033 7.61214 4.54412C7.61688 4.52923 7.62232 4.51087 7.64185 4.44424L7.75665 4.05256C7.8269 3.81241 7.8881 3.60318 7.97375 3.41617C8.31209 2.67736 8.93808 2.16432 9.66147 2.03297C9.84457 1.99972 10.0385 1.99986 10.2611 2.00002H13.7391C13.9617 1.99986 14.1556 1.99972 14.3387 2.03297C15.0621 2.16432 15.6881 2.67736 16.0264 3.41617C16.1121 3.60318 16.1733 3.81241 16.2435 4.05256L16.3583 4.44424C16.3778 4.51087 16.3833 4.52923 16.388 4.54412C16.5682 5.11033 17.1278 5.49353 17.6571 5.50879H20.2286C20.6546 5.50879 21 5.90152 21 6.38597C21 6.87043 20.6546 7.26316 20.2286 7.26316H3.77143C3.34538 7.26316 3 6.87043 3 6.38597Z"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.5956 22.0001H12.4044C15.1871 22.0001 16.5785 22.0001 17.4831 21.1142C18.3878 20.2283 18.4803 18.7751 18.6654 15.8686L18.9321 11.6807C19.0326 10.1037 19.0828 9.31524 18.6289 8.81558C18.1751 8.31592 17.4087 8.31592 15.876 8.31592H8.12404C6.59127 8.31592 5.82488 8.31592 5.37105 8.81558C4.91722 9.31524 4.96744 10.1037 5.06788 11.6807L5.33459 15.8686C5.5197 18.7751 5.61225 20.2283 6.51689 21.1142C7.42153 22.0001 8.81289 22.0001 11.5956 22.0001ZM10.2463 12.1886C10.2051 11.7548 9.83753 11.4382 9.42537 11.4816C9.01321 11.525 8.71251 11.9119 8.75372 12.3457L9.25372 17.6089C9.29494 18.0427 9.66247 18.3593 10.0746 18.3159C10.4868 18.2725 10.7875 17.8856 10.7463 17.4518L10.2463 12.1886ZM14.5746 11.4816C14.9868 11.525 15.2875 11.9119 15.2463 12.3457L14.7463 17.6089C14.7051 18.0427 14.3375 18.3593 13.9254 18.3159C13.5132 18.2725 13.2125 17.8856 13.2537 17.4518L13.7537 12.1886C13.7949 11.7548 14.1625 11.4382 14.5746 11.4816Z"></path>
                      </g>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Linea divisoria */}
              <div className="divider"></div>

              {/* Botón de añadir marcador */}
              <button
                className="add-bookmarkFolder-button"
                onClick={() => addBookmarkFolder(activeFolder)}
              >
                <svg
                  className="folder-bookmark-icon"
                  width="18px"
                  height="18px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#000000"
                  strokeWidth="0.72">
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                  <g id="SVGRepo_iconCarrier">
                    <path fillRule="evenodd" clipRule="evenodd" d="M21 11.0975V16.0909C21 19.1875 21 20.7358 20.2659 21.4123C19.9158 21.735 19.4739 21.9377 19.0031 21.9915C18.016 22.1045 16.8633 21.0849 14.5578 19.0458C13.5388 18.1445 13.0292 17.6938 12.4397 17.5751C12.1494 17.5166 11.8506 17.5166 11.5603 17.5751C10.9708 17.6938 10.4612 18.1445 9.44216 19.0458C7.13673 21.0849 5.98402 22.1045 4.99692 21.9915C4.52615 21.9377 4.08421 21.735 3.73411 21.4123C3 20.7358 3 19.1875 3 16.0909V11.0975C3 6.80891 3 4.6646 4.31802 3.3323C5.63604 2 7.75736 2 12 2C16.2426 2 18.364 2 19.682 3.3323C21 4.6646 21 6.80891 21 11.0975ZM8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H15C15.4142 5.25 15.75 5.58579 15.75 6C15.75 6.41421 15.4142 6.75 15 6.75H9C8.58579 6.75 8.25 6.41421 8.25 6Z"></path>
                  </g>
                </svg>  &nbsp; |&nbsp;  Añadir Marcador
              </button>

              {/* Lista de marcadores dentro de la carpeta */}
              {sortedBookmarks(bookmarks)
                .filter((b) => b.folderId === activeFolder)
                .map((bookmark, index) => (
                  <div
                    key={bookmark.id}
                    draggable
                    onDragStart={(e) => handleDragStartBookmark(e, bookmark.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropBookmark(e, index)}
                    className="bookmarkFolder-item"
                  >
                    {/* Ícono del marcador */}
                    <img
                      src={bookmark.favicon}
                      alt="Favicon"
                      className="favicon"
                    />
                    {/* Título del marcador */}
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                      {bookmark.title}
                    </a>

                    {/* Botón de favorito */}
                    <button
                      className="favoriteFolder-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita que el clic afecte al marcador
                        toggleFavoriteBookmarkFolder(bookmark.id);
                      }}
                    >
                      <img
                        src={bookmark.isFavorite ? "/star-filled.png" : "/star-outline.png"}
                        alt="favorite"
                        className="favorite-icon"
                      />
                    </button>

                    {/* Botón de menú */}
                    <button
                      className="menuFolder-button"
                      onClick={(e) => {
                        e.stopPropagation(); // Evita que el clic afecte al marcador
                        toggleMenuFolder(bookmark.id); // Alterna el menú
                      }}
                    >
                      ⋮
                    </button>

                    {/* Menú desplegable */}
                    {menuOpenBookmarkInFolder === bookmark.id && (
                      <div
                        className={`menu ${menuOpenBookmarkInFolder === bookmark.id ? "active" : ""}`}
                        onMouseLeave={() => setMenuOpenBookmarkInFolder(null)} // Cierra el menú al salir
                      >
                        {/* Opción "Mover a" */}
                        <div
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setMoveToMenuOpen(true); // Abre el submenú
                          }}
                          onMouseLeave={() => setMoveToMenuOpen(false)} // Cierra el submenú al salir
                        >
                          <div style={{ position: "relative" }}>
                            📂 | Mover a
                            {/* Submenú de carpetas */}
                            {moveToMenuOpen && (
                              <div
                                className="submenu"
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: "100%", // Posiciona el submenú al lado del botón
                                  minWidth: "150px",
                                  backgroundColor: "white",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                  zIndex: 10,
                                }}
                              >
                                {/* Filtrar las carpetas para excluir la carpeta inicial */}
                                {folders.filter((folder) => folder.id !== bookmark.folderId).map((folder) => (
                                  <button
                                    key={folder.id}
                                    onClick={() => moveBookmarkToFolder(bookmark.id, folder.id)}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      padding: "8px",
                                      textAlign: "left",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                    }}
                                  >
                                    📁 {folder.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Divisor */}
                        <div style={{ borderTop: "1px solid #ccc", margin: "8px 0" }}></div>

                        {/* Otras opciones */}
                        <button onClick={() => editBookmark(bookmark.id)}><svg
                          className="pencil-icon"
                          width="18px"
                          height="18px"
                          viewBox="0 0 24.00 24.00"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          stroke="#000000"
                          strokeWidth="1.5">
                          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                          <g id="SVGRepo_iconCarrier">
                            <path d="M11.4001 18.1612L11.4001 18.1612L18.796 10.7653C17.7894 10.3464 16.5972 9.6582 15.4697 8.53068C14.342 7.40298 13.6537 6.21058 13.2348 5.2039L5.83882 12.5999L5.83879 12.5999C5.26166 13.1771 4.97307 13.4657 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L7.47918 20.5844C8.25351 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5343 19.0269 10.823 18.7383 11.4001 18.1612Z"></path>
                            <path d="M20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178L14.3999 4.03882C14.4121 4.0755 14.4246 4.11268 14.4377 4.15035C14.7628 5.0875 15.3763 6.31601 16.5303 7.47002C17.6843 8.62403 18.9128 9.23749 19.85 9.56262C19.8875 9.57563 19.9245 9.58817 19.961 9.60026L20.8482 8.71306Z"></path>
                          </g>
                        </svg> | Editar Nombre</button>
                        <button onClick={() => deleteBookmark(bookmark.id)}><svg
                          className="eraser-icon"
                          width="18px"
                          height="18px"
                          viewBox="0 0 24.00 24.00"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          stroke="#000000" strokeWidth="1.4">
                          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                          <g id="SVGRepo_iconCarrier">
                            <path d="M11.4096 5.50506C13.0796 3.83502 13.9146 3 14.9522 3C15.9899 3 16.8249 3.83502 18.4949 5.50506C20.165 7.1751 21 8.01013 21 9.04776C21 10.0854 20.165 10.9204 18.4949 12.5904L14.3017 16.7837L7.21634 9.69828L11.4096 5.50506Z"></path>
                            <path d="M6.1557 10.759L13.2411 17.8443L12.5904 18.4949C12.2127 18.8727 11.8777 19.2077 11.5734 19.5H21C21.4142 19.5 21.75 19.8358 21.75 20.25C21.75 20.6642 21.4142 21 21 21H9C7.98423 20.9747 7.1494 20.1393 5.50506 18.4949C3.83502 16.8249 3 15.9899 3 14.9522C3 13.9146 3.83502 13.0796 5.50506 11.4096L6.1557 10.759Z"></path>
                          </g>
                        </svg> | Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Contenedores Widgets */}
        <div className="item area-5">
          {/* SVG de cierre */}
          <div className="close-button" onClick={() => handleCloseWidget(5)}>
            <svg
              width="18px"
              height="18px"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <path fill="#000000" fillRule="evenodd" d="M10.03 6.47c.3.3.3.77 0 1.06l-3.72 3.72h8.19c.95 0 2.37.28 3.56 1.14A5.38 5.38 0 0 1 20.25 17a.75.75 0 0 1-1.5 0c0-1.76-.71-2.78-1.56-3.4a4.84 4.84 0 0 0-2.69-.85H6.31l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5c.3-.3.77-.3 1.06 0Z" clipRule="evenodd" />
            </svg>
          </div>
          {selectedWidgetArea5 ? (
            <div className="widget-container">
              {/* Contenido del widget */}
              <div className="widget-display">
                {selectedWidgetArea5 === "calendar" && <CalendarWidget />}
                {selectedWidgetArea5 === "notes" && <NotesWidget />}
                {selectedWidgetArea5 === "photoGrid" && <PhotoGridWidget />}
                {selectedWidgetArea5 === "pomodoro" && <PomodoroWidget />}
              </div>
            </div>
          ) : (
            <div className="widget-grid">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  title={widget.name}
                  className={`widget-option ${selectedWidgetArea6 === widget.id ? "disabled" : ""
                    }`}
                  onClick={() =>
                    selectedWidgetArea6 !== widget.id &&
                    handleWidgetSelect(5, widget.id)
                  }
                >
                  {widget.svg}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="item area-6">
          {/* SVG de cierre */}
          <div className="close-button" onClick={() => handleCloseWidget(6)}>
            <svg
              width="18px"
              height="18px"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <path fill="#000000" fillRule="evenodd" d="M10.03 6.47c.3.3.3.77 0 1.06l-3.72 3.72h8.19c.95 0 2.37.28 3.56 1.14A5.38 5.38 0 0 1 20.25 17a.75.75 0 0 1-1.5 0c0-1.76-.71-2.78-1.56-3.4a4.84 4.84 0 0 0-2.69-.85H6.31l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5c.3-.3.77-.3 1.06 0Z" clipRule="evenodd" />
            </svg>
          </div>
          {selectedWidgetArea6 ? (
            <div className="widget-container">

              {/* Contenido del widget */}
              <div className="widget-display">
                {selectedWidgetArea6 === "calendar" && <CalendarWidget />}
                {selectedWidgetArea6 === "notes" && <NotesWidget />}
                {selectedWidgetArea6 === "photoGrid" && <PhotoGridWidget />}
                {selectedWidgetArea6 === "pomodoro" && <PomodoroWidget />}
              </div>
            </div>
          ) : (
            <div className="widget-grid">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  title={widget.name}
                  className={`widget-option ${selectedWidgetArea5 === widget.id ? "disabled" : ""
                    }`}
                  onClick={() =>
                    selectedWidgetArea5 !== widget.id &&
                    handleWidgetSelect(6, widget.id)
                  }
                >
                  {widget.svg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Áreas Adicionales */}
        <div className="item area-7">
        </div>
      </div>
    </>
  );
}