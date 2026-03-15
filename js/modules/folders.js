const FoldersManager = (() => {
    function openFolderModal(folderId = null) {
        const folder = folderId ? StateManager.getFolderById(folderId) : null;
        const modal = ModalManager.createFolderModal(folder);
        
        // Handle form submission
        setTimeout(() => {
            const form = modal.querySelector('#folderForm');
            const saveBtn = modal.querySelector('[data-action="save"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const formData = new FormData(form);
                const name = formData.get('name');
                const icon = formData.get('icon') || '📁';

                if (!name) {
                    alert('El nombre es requerido');
                    return;
                }

                if (folderId) {
                    // Editar
                    StateManager.updateFolder(folderId, { name, icon });
                } else {
                    // Crear
                    StateManager.addFolder({ name, icon });
                }

                ModalManager.closeModal(modal);
                RenderManager.renderAll();
            });

            cancelBtn.addEventListener('click', () => {
                ModalManager.closeModal(modal);
            });
        }, 100);

        ModalManager.openModal(modal);
    }

    function deleteFolder(folderId) {
        const modal = ModalManager.createConfirmModal(
            'Eliminar Carpeta',
            '¿Estás seguro de que deseas eliminar esta carpeta? Todos los marcadores dentro también se eliminarán.',
            () => {
                StateManager.deleteFolder(folderId);
                ModalManager.closeModal(modal);
                RenderManager.renderAll();
            }
        );
        ModalManager.openModal(modal);
    }

    function openFolder(folderId) {
        StateManager.setCurrentFolder(folderId);
        RenderManager.renderInFolder();
        RenderManager.updateFolderNavigation();
    }

    function backToFolders() {
        StateManager.setCurrentFolder(null);
        RenderManager.renderInFolder();
        RenderManager.updateFolderNavigation();
    }

    return {
        openFolderModal,
        deleteFolder,
        openFolder,
        backToFolders
    };
})();
window.FoldersManager = FoldersManager;
