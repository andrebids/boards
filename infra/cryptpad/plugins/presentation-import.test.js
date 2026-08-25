const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const pluginRoot = path.join(__dirname, 'presentation-import');
const onlyOfficePluginRegistryPath = path.join(__dirname, '..', 'plugins.json');
const presentationImportGuid = 'asc.{6B4D3E90-6A1B-4E92-BD0E-1DA8E51F1F40}';

test('registers the import plugin in CryptPad before ONLYOFFICE opens a document', () => {
  const registry = JSON.parse(fs.readFileSync(onlyOfficePluginRegistryPath, 'utf8'));

  assert.deepEqual(registry.pluginsData, [
    '/customize/planka-plugins/presentation-import/config.json',
  ]);
  assert.deepEqual(registry.autostart, [presentationImportGuid]);
});

test('adds the import action to the Insert tab for presentations, including view-only members', () => {
  const config = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'config.json'), 'utf8'));
  const plugin = fs.readFileSync(path.join(pluginRoot, 'presentation-import.js'), 'utf8');

  assert.equal(config.variations[0].isDisplayedInViewer, true);
  assert.equal(config.variations[0].isViewer, true);
  assert.deepEqual(config.variations[0].EditorsSupport, ['slide']);
  assert.equal(config.variations[0].type, 'background');
  assert.match(plugin, /id: 'ins'/);
  assert.doesNotMatch(plugin, /text: 'Planka'/);
  assert.match(plugin, /lockInViewMode: false/);
});

test('forwards the selected PPTX only to the parent integration', () => {
  const plugin = fs.readFileSync(path.join(pluginRoot, 'presentation-import.js'), 'utf8');

  assert.match(plugin, /input\.accept = presentationFileAccept/);
  assert.match(plugin, /window\.top\.postMessage\(\{ type: messageType, file \}, '\*'\)/);
});

test('uses ONLYOFFICE translations for the toolbar action', () => {
  const plugin = fs.readFileSync(path.join(pluginRoot, 'presentation-import.js'), 'utf8');
  const portugueseTranslation = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, 'translations', 'pt-PT.json'), 'utf8'),
  );

  assert.match(plugin, /window\.Asc\.plugin\.tr\('Import PowerPoint'\)/);
  assert.equal(portugueseTranslation['Import PowerPoint'], 'Importar PowerPoint');
});
