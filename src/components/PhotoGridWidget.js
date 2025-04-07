import React, { useState, useEffect } from "react";

const PhotoGridWidget = () => {
  const [images, setImages] = useState(Array(9).fill(null)); // Estado para almacenar las imágenes
  const [db, setDb] = useState(null); // Estado para almacenar la conexión a IndexedDB

  // Inicializar IndexedDB
  useEffect(() => {
    const request = indexedDB.open("PhotoGridDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      setDb(db);
      loadImagesFromDB(db); // Cargar imágenes desde IndexedDB
    };

    request.onerror = (event) => {
      console.error("Error al abrir IndexedDB:", event.target.error);
    };
  }, []);

  // Cargar imágenes desde IndexedDB
  const loadImagesFromDB = (db) => {
    const transaction = db.transaction("images", "readonly");
    const store = transaction.objectStore("images");
    const request = store.getAll();

    request.onsuccess = () => {
      const savedImages = Array(9).fill(null);
      request.result.forEach((item) => {
        savedImages[item.id] = item.url;
      });
      setImages(savedImages);
    };

    request.onerror = () => {
      console.error("Error al cargar imágenes desde IndexedDB");
    };
  };

  // Guardar una imagen en IndexedDB
  const saveImageToDB = (id, url) => {
    if (!db) return;

    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");
    const request = store.put({ id, url });

    request.onsuccess = () => {
      console.log("Imagen guardada en IndexedDB");
    };

    request.onerror = () => {
      console.error("Error al guardar la imagen en IndexedDB");
    };
  };

  // Manejar la carga de una imagen en un cuadro específico
  const handleImageUpload = (index, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const updatedImages = [...images];
      updatedImages[index] = reader.result; // Guardar la URL de la imagen cargada
      setImages(updatedImages);
      saveImageToDB(index, reader.result); // Guardar la imagen en IndexedDB
    };
    reader.onerror = () => alert("Error al cargar la imagen.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="photo-grid">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="photo-box"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = e.target.files[0];
              if (file) handleImageUpload(index, file);
            };
            input.click();
          }}
        >
          {images[index] ? (
            <img src={images[index]} alt={`Foto ${index + 1}`} />
          ) : (
            <span>📷</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhotoGridWidget;