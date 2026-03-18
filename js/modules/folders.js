const FoldersManager = (() => {
    function createFolder(data) {
        if (!data.name?.trim()) {
            return false;
        }
        StateManager.addFolder(data);
        RenderManager.renderAll();
        return true;
    }

    function updateFolder(id, data) {
        if (!data.name?.trim()) {
            return false;
        }
        StateManager.updateFolder(id, data);
        RenderManager.renderAll();
        return true;
    }

    function openFolderModal(folderId = null) {
        const folder = folderId ? StateManager.getFolderById(folderId) : null;
        const modal = ModalManager.createFolderModal(folder);
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
        createFolder,
        updateFolder,
        openFolderModal,
        deleteFolder,
        openFolder,
        backToFolders
    };
})();
window.FoldersManager = FoldersManager;