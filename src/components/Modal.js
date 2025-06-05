import React, { useState, useEffect, useCallback, Children } from "react";

const Modal = ({
    isOpen,
    onClose,
    title,
    onConfirm,
    type = "",
    fields = [],
    initialValues = {},
    content,
    children,
    modalClassName }) => {
    const [formData, setFormData] = useState(() => {
        const initialData = {};
        fields.forEach(field => {
            initialData[field.name] = '';
        });
        return initialData;
    });

    const [isClosing, setIsClosing] = useState(false);

    // Inicialización optimizada que evita bucles
    useEffect(() => {
        if (isOpen) {
            const newData = {};
            fields.forEach(field => {
                newData[field.name] = initialValues[field.name] || '';
            });

            // Solo actualiza si hay cambios reales
            if (JSON.stringify(newData) !== JSON.stringify(formData)) {
                setFormData(newData);
            }
        }
    }, [isOpen]); // Eliminamos initialValues de las dependencias

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    }, [formData]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, handleKeyDown]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (type.includes("delete")) {
            onConfirm();
        } else {
            if (fields.some(field => field.required && !formData[field.name])) {
                alert("Por favor, completa todos los campos requeridos.");
                return;
            }
            onConfirm(formData);
        }
        onClose();
    };

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 250); // Debe coincidir con la duración de la animación
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
            <div className={`modal-content ${modalClassName || ''}`} onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                <div className="modal-body">
                    {type?.includes("delete") ? (
                        <div>{content || children}</div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                            {fields.length > 0 ? (
                                fields.map((field) => (
                                    <div key={field.name} className="modal-field">
                                        <label htmlFor={field.name}>{field.label}</label>
                                        <input
                                            id={field.name}
                                            type={field.type}
                                            name={field.name}
                                            value={formData[field.name] || ''}
                                            onChange={handleChange}
                                            placeholder={field.placeholder}
                                            autoComplete="off"
                                            required={field.required}
                                        />
                                    </div>
                                ))
                            ) : (
                                <>{children}</> // Aquí va tu contenido personalizado
                            )}
                            <button type="submit" style={{ display: 'none' }}>Submit</button>
                        </form>
                    )}
                </div>
                <div className="modal-actions">
                    <button type="button" className="cancel-button" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="confirm-button"
                        onClick={handleSubmit}
                    >
                        {type?.includes("delete") ? "Eliminar" : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;