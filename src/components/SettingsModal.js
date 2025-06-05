'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal'; // Usamos tu Modal existente

export default function SettingsModal({ isOpen, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState('layout');
    const [activeLayout, setActiveLayout] = useState('null');

    const handleConfirm = () => {
        if (activeLayout) {
            // Solo guardamos si hay una card seleccionada
            localStorage.setItem('selectedLayout', activeLayout);
        }

        onSave?.({
            tab: activeTab,
            layout: activeLayout
        });
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            setActiveLayout(null); // Resetea la selección al cerrar
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configuración"
            type="settings"
            onConfirm={handleConfirm}
            modalClassName="settings-modal">
            <div className="settings-modal-content">
                <div className="settings-sidebar">
                    <ul>
                        <li
                            className={activeTab === 'layout' ? 'active' : ''}
                            onClick={() => setActiveTab('layout')}
                        >
                            Layout
                        </li>
                        <li
                            className={activeTab === 'design' ? 'active' : ''}
                            onClick={() => setActiveTab('design')}
                        >
                            Diseño e imágenes
                        </li>
                        <li
                            className={activeTab === 'report' ? 'active' : ''}
                            onClick={() => setActiveTab('report')}
                        >
                            Reportar
                        </li>
                    </ul>
                </div>
                <div className="settings-tab-content">
                    {activeTab === 'layout' && <div className="layout-cards-container">
                        <div
                            className={`layout-card ${activeLayout === 'default' ? 'active' : ''}`}
                            onClick={() => setActiveLayout('default')}>
                            <div className="layout-card-left">
                                <img src="/public/images/LayoutExtendida.png" alt="Layout Default" width="35" height="35" />
                            </div>
                            <div className="layout-card-right">
                                <p>Layout Predeterminado</p>
                            </div>
                        </div>

                        <div
                            className={`layout-card ${activeLayout === 'double' ? 'active' : ''}`}
                            onClick={() => setActiveLayout('double')}>
                            <div className="layout-card-left">
                                <img src="/public/images/LayoutDoble.png" alt="Layout Doble" width="35" height="35" />
                            </div>
                            <div className="layout-card-right">
                                <p>Layout Doble</p>
                            </div>
                        </div>

                        <div
                            className={`layout-card ${activeLayout === 'widget' ? 'active' : ''}`}
                            onClick={() => setActiveLayout('widget')}>
                            <div className="layout-card-left">
                                <img src="/public/images/LayoutWidget.png" alt="Layout con Widgets" width="35" height="35" />
                            </div>
                            <div className="layout-card-right">
                                <p>Layout con Widgets</p>
                            </div>
                        </div>
                    </div>}
                    {activeTab === 'design' && <div>Contenido de Diseño Imágenes</div>}
                    {activeTab === 'report' && <div>Contenido de Reportar</div>}
                </div>
            </div>
        </Modal>
    );
}