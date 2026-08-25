(function () {
  const importButtonId = 'planka-presentation-import';
  const messageType = 'planka:presentation-import';
  const presentationFileAccept =
    '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';

  const openFilePicker = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = presentationFileAccept;
    input.addEventListener('change', function () {
      const [file] = input.files || [];
      if (!file) {
        return;
      }

      window.top.postMessage({ type: messageType, file }, '*');
    });
    input.click();
  };

  window.Asc.plugin.init = function () {
    window.Asc.plugin.executeMethod('AddToolbarMenuItem', [
      {
        guid: window.Asc.plugin.guid,
        tabs: [
          {
            id: 'planka',
            text: 'Planka',
            items: [
              {
                id: importButtonId,
                type: 'big-button',
                text: window.Asc.plugin.tr('Import PowerPoint'),
                hint: window.Asc.plugin.tr('Import PowerPoint'),
                lockInViewMode: false,
              },
            ],
          },
        ],
      },
    ]);

    window.Asc.plugin.attachToolbarMenuClickEvent(importButtonId, openFilePicker);
  };
})();
