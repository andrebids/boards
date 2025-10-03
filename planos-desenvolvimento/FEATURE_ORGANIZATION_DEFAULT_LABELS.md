# 🏷️ Organization Default Labels - Plano Completo de Implementação

## 📋 Informações do Plano
**Data:** 02/10/2025  
**Versão:** 2.1 (Com Pausas e Logs de Debug)  
**Tempo Estimado:** 5-7 horas  
**Complexidade:** 🟡 Média  
**Status:** ✅ Pronto para Implementação

## 🔍 Sistema de Validação e Feedback

**Este plano inclui:**
- ⏸️ **3 Pausas Estratégicas** para testes incrementais:
  - **PAUSA 1:** Validar Migration + Model + Query Methods
  - **PAUSA 2:** Validar Backend Completo (Controllers + Helpers + Hook)
  - **PAUSA 3:** Validar Frontend Completo (Redux + UI)
- 🔍 **Logs de Debug** em todos os pontos críticos:
  - Backend: `console.log` + `sails.log` com prefixos `[MIGRATION]`, `[QM]`, `[CONTROLLER]`, `[HELPER]`, `[HOOK]`
  - Frontend: `console.log` com prefixos `[SAGA]`, `[ACTION]`, `[REDUCER]`
- ✅ **Checkpoints de Validação** com comandos curl e verificações visuais
- 📊 **Logs Esperados** documentados para cada teste
- 💬 **Pontos de Feedback** antes de avançar para próxima fase

**⚠️ IMPORTANTE:** NÃO remover os logs de console até aprovação final [[memory:9198107]]

**🎯 Fluxo de Implementação:**
```
1. Backend: Migration → Model → Query Methods  [PAUSA 1] 
2. Backend: Controllers → Helpers → Hook       [PAUSA 2]
3. Frontend: Redux → UI → Testes               [PAUSA 3]
4. Aprovação Final → Remover Logs
```

---

## 🎯 Visão Geral

**Objetivo:** Sistema de etiquetas padrão a nível de organização que são automaticamente aplicadas a todos os novos boards criados, com possibilidade de aplicação bulk a boards existentes.

**Problema Atual:**
- Equipas repetem as mesmas etiquetas em cada projeto
- Trabalho manual e repetitivo
- Inconsistência entre projetos

**Solução:**
- Etiquetas padrão geridas por admins/project owners
- Aplicação automática em novos boards
- Bulk apply opcional para boards existentes

---

## ✅ Decisões Arquiteturais (Definidas)

| Decisão | Escolha | Justificação |
|---------|---------|-------------|
| **Permissões** | ADMIN + PROJECT_OWNER | Ambos podem gerir defaults organizacionais |
| **UI** | Tab no AdministrationModal | Reusa estrutura existente, ~70% menos código |
| **Bulk Apply** | Por Project | Mais intuitivo, aplica a todos os boards internamente |
| **Aplicação Automática** | Modificar helper `boards/create-one.js` | Ponto natural, ~80% menos código que hook separado |
| **Cores** | Lista pré-definida (`Label.COLORS`) | Planka usa 70+ cores nomeadas, não HEX livre |

---

## 🗂️ Estrutura de Ficheiros

### **Ficheiros a Criar:**

**Backend (8 ficheiros):**
```
server/
├── db/migrations/
│   └── 20251002000000_add_organization_default_labels.js
├── api/models/
│   └── OrganizationDefaultLabel.js
├── api/hooks/query-methods/models/
│   └── OrganizationDefaultLabel.js
├── api/controllers/organization-default-labels/
│   ├── index.js
│   ├── list.js
│   ├── create.js
│   ├── update.js
│   ├── delete.js
│   ├── reorder.js
│   └── bulk-apply.js
└── api/helpers/organization-default-labels/
    └── apply-to-boards.js
```

**Frontend (6 ficheiros):**
```
client/src/
├── actions/organization-default-labels.js
├── api/organization-default-labels.js
├── models/OrganizationDefaultLabel.js
├── sagas/organization-default-labels.js
└── components/common/AdministrationModal/
    └── DefaultLabelsPane/
        ├── index.js
        ├── DefaultLabelsPane.jsx
        ├── DefaultLabelsPane.module.scss
        ├── AddModal.jsx
        ├── EditModal.jsx
        └── BulkApplyModal.jsx
```

### **Ficheiros a Modificar:**

**Backend (2 ficheiros):**
- `server/api/helpers/boards/create-one.js` - Aplicação automática
- `server/config/routes.js` - Adicionar rotas

**Frontend (4 ficheiros):**
- `client/src/orm.js` - Registar modelo
- `client/src/constants/ActionTypes.js` - Action types
- `client/src/components/common/AdministrationModal/AdministrationModal.jsx` - Adicionar tab
- `client/src/locales/pt-PT/core.js` (+ en-US) - Traduções

---

## 📐 Fase 1: Backend - Base de Dados e Modelo

### 1.1 Migração de Base de Dados

**Ficheiro:** `server/db/migrations/20251002000000_add_organization_default_labels.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

exports.up = async (knex) => {
  console.log('🔵 [MIGRATION] Iniciando criação da tabela organization_default_label...');
  
  // Criar tabela organization_default_label
  await knex.schema.createTable('organization_default_label', (table) => {
    /* Columns */
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('name').notNullable();
    table.text('color').notNullable();
    table.text('description').nullable();
    table.integer('position').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    /* Indexes */
    table.unique(knex.raw('lower(name)'), { indexName: 'uq_org_default_label_name' });
    table.index(['position'], 'idx_org_default_label_position');
  });

  // Seed inicial com etiquetas comuns (português)
  const defaultLabels = [
    { name: 'Aprovado', color: 'sunny-grass', description: 'Item aprovado', position: 1 },
    { name: 'Rejeitado', color: 'rosso-corsa', description: 'Item rejeitado', position: 2 },
    { name: 'Em Revisão', color: 'summer-sky', description: 'Item em processo de revisão', position: 3 },
    { name: 'Precisa Trabalho', color: 'bright-yellow', description: 'Item precisa de mais trabalho', position: 4 },
  ];

  console.log('🔵 [MIGRATION] Inserindo 4 labels padrão (seed)...');
  await knex('organization_default_label').insert(defaultLabels);
  console.log('✅ [MIGRATION] Migration completa! Tabela + índices + seeds criados.');
};

exports.down = async (knex) => {
  console.log('🔴 [MIGRATION] Revertendo: removendo tabela organization_default_label...');
  await knex.schema.dropTableIfExists('organization_default_label');
  console.log('✅ [MIGRATION] Rollback completo.');
};
```

**⚠️ Nota Importante:** 
- Cores usam nomes do Planka (`Label.COLORS`), não HEX
- Nomes das cores: 'berry-red', 'sunny-grass', 'summer-sky', etc.

---

## ⏸️ PAUSA 1: Validar Migration + Model

**📊 O que foi feito até aqui:**
- ✅ Criada migração `20251002000000_add_organization_default_labels.js`
- ✅ Tabela `organization_default_label` com 4 seeds

**🔍 Como validar:**
```bash
# 1. Correr migration
cd planka-personalizado/server
npm run db:migrate

# 2. Verificar logs esperados
# Deves ver:
# 🔵 [MIGRATION] Iniciando criação da tabela organization_default_label...
# 🔵 [MIGRATION] Inserindo 4 labels padrão (seed)...
# ✅ [MIGRATION] Migration completa! Tabela + índices + seeds criados.

# 3. Verificar na BD (via psql ou docker exec)
docker exec -it planka-db psql -U planka -d planka -c "SELECT * FROM organization_default_label;"

# 4. Verificar seed data
# Deves ver: 4 rows com "Aprovado", "Rejeitado", "Em Revisão", "Precisa Trabalho"
```

**✅ Checklist de Validação:**
- [ ] Migration executou sem erros
- [ ] Logs aparecem no console
- [ ] Tabela existe na BD
- [ ] 4 labels padrão inseridos
- [ ] Cores são nomes (não HEX)

**💬 Feedback:** 
Valida a migration e depois avança para criar o Model.

---

### 1.2 Modelo Sails.js

**Ficheiro:** `server/api/models/OrganizationDefaultLabel.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  tableName: 'organization_default_label',
  
  attributes: {
    id: {
      type: 'number',
      columnName: 'id',
      autoIncrement: false, // Usa next_id() do PostgreSQL
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 60,
      columnName: 'name',
    },
    color: {
      type: 'string',
      required: true,
      isIn: require('./Label').COLORS, // ⚠️ Importante: usa cores do Planka
      columnName: 'color',
    },
    description: {
      type: 'string',
      allowNull: true,
      maxLength: 280,
      columnName: 'description',
    },
    position: {
      type: 'number',
      required: true,
      defaultsTo: 0,
      columnName: 'position',
    },
    createdAt: {
      type: 'ref',
      columnType: 'timestamptz',
      autoCreatedAt: true,
      columnName: 'created_at',
    },
    updatedAt: {
      type: 'ref',
      columnType: 'timestamptz',
      autoUpdatedAt: true,
      columnName: 'updated_at',
    },
  },
};
```

### 1.3 Query Methods

**Ficheiro:** `server/api/hooks/query-methods/models/OrganizationDefaultLabel.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  getAll: async () => {
    console.log('🔵 [QM] OrganizationDefaultLabel.getAll()');
    const records = await sails.models.organizationdefaultlabel
      .find()
      .sort('position ASC');
    console.log(`✅ [QM] Encontrados ${records.length} labels padrão`);
    return records;
  },

  getOneById: async (id) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.getOneById(${id})`);
    const record = await sails.models.organizationdefaultlabel.findOne({ id });
    console.log(`✅ [QM] Label ${record ? 'encontrado' : 'não encontrado'}`);
    return record || null;
  },

  getOneByName: async (name) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.getOneByName("${name}")`);
    const records = await sails.models.organizationdefaultlabel.find();
    const record = records.find(r => r.name.toLowerCase() === name.toLowerCase());
    console.log(`✅ [QM] Label "${name}" ${record ? 'existe' : 'não existe'}`);
    return record || null;
  },

  createOne: async (values) => {
    console.log('🔵 [QM] OrganizationDefaultLabel.createOne()', values);
    // Validar unicidade (case-insensitive)
    const existing = await module.exports.getOneByName(values.name);
    if (existing) {
      throw new Error(`Default label with name "${values.name}" already exists`);
    }

    const record = await sails.models.organizationdefaultlabel.create(values).fetch();
    console.log(`✅ [QM] Label criado: "${record.name}" (${record.color})`);
    sails.log.info(`[ORG_DEFAULT_LABELS] Created: ${record.name} (${record.color})`);
    return record;
  },

  updateOne: async (id, values) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.updateOne(${id})`, values);
    // Se mudar nome, validar unicidade
    if (values.name) {
      const existing = await module.exports.getOneByName(values.name);
      if (existing && existing.id !== id) {
        throw new Error(`Default label with name "${values.name}" already exists`);
      }
    }

    const record = await sails.models.organizationdefaultlabel
      .updateOne({ id })
      .set({ ...values, updatedAt: new Date() });
    
    if (record) {
      console.log(`✅ [QM] Label atualizado: "${record.name}"`);
      sails.log.info(`[ORG_DEFAULT_LABELS] Updated: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  deleteOne: async (id) => {
    console.log(`🔵 [QM] OrganizationDefaultLabel.deleteOne(${id})`);
    const record = await sails.models.organizationdefaultlabel.destroyOne({ id });
    
    if (record) {
      console.log(`✅ [QM] Label eliminado: "${record.name}"`);
      sails.log.info(`[ORG_DEFAULT_LABELS] Deleted: ${record.name} (ID: ${id})`);
    }
    
    return record || null;
  },

  reorder: async (orderArray) => {
    console.log('🔵 [QM] OrganizationDefaultLabel.reorder()', `${orderArray.length} items`);
    // orderArray: [{ id, position }, ...]
    await sails.getDatastore().transaction(async (db) => {
      for (const item of orderArray) {
        await sails.models.organizationdefaultlabel
          .update({ id: item.id })
          .set({ position: item.position })
          .usingConnection(db);
      }
    });

    console.log(`✅ [QM] ${orderArray.length} labels reordenados`);
    sails.log.info(`[ORG_DEFAULT_LABELS] Reordered ${orderArray.length} labels`);
  },
};
```

---

## 🔧 Fase 2: Backend - Controllers

### 2.1 Controller Index

**Ficheiro:** `server/api/controllers/organization-default-labels/index.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  list: require('./list'),
  create: require('./create'),
  update: require('./update'),
  delete: require('./delete'),
  reorder: require('./reorder'),
  bulkApply: require('./bulk-apply'),
};
```

### 2.2 Controller: List

**Ficheiro:** `server/api/controllers/organization-default-labels/list.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  inputs: {},

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn() {
    console.log('🔵 [CONTROLLER] GET /api/organization-default-labels/list');
    const { currentUser } = this.req;

    console.log(`🔵 [CONTROLLER] User: ${currentUser.name} (${currentUser.email})`);
    // ✅ Corrigido: Usar helper de permissões
    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado: utilizador não é Admin/ProjectOwner');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const labels = await sails.models.organizationdefaultlabel.qm.getAll();

    console.log(`✅ [CONTROLLER] A retornar ${labels.length} labels`);
    return {
      items: labels,
    };
  },
};
```

### 2.3 Controller: Create

**Ficheiro:** `server/api/controllers/organization-default-labels/create.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LABEL_ALREADY_EXISTS: {
    labelAlreadyExists: 'Label already exists',
  },
};

module.exports = {
  inputs: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 60,
    },
    color: {
      type: 'string',
      required: true,
      isIn: require('../../models/Label').COLORS, // ✅ Validação com cores do Planka
    },
    description: {
      type: 'string',
      allowNull: true,
      maxLength: 280,
    },
    position: {
      type: 'number',
      defaultsTo: 0,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelAlreadyExists: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    console.log('🔵 [CONTROLLER] POST /api/organization-default-labels/create', inputs);
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    try {
      const label = await sails.models.organizationdefaultlabel.qm.createOne({
        name: inputs.name.trim(),
        color: inputs.color,
        description: inputs.description?.trim() || null,
        position: inputs.position,
      });

      console.log(`✅ [CONTROLLER] Label criado: "${label.name}" (ID: ${label.id})`);

      // ✅ Broadcast para admins
      const admins = await User.find({
        or: [
          { role: User.Roles.ADMIN },
          { role: User.Roles.PROJECT_OWNER },
        ],
      });

      console.log(`🔵 [CONTROLLER] A fazer broadcast para ${admins.length} admins/owners`);
      admins.forEach((admin) => {
        sails.sockets.broadcast(
          `user:${admin.id}`,
          'organizationDefaultLabelCreate',
          { item: label }
        );
      });

      return { item: label };
    } catch (error) {
      console.log('🔴 [CONTROLLER] Erro ao criar label:', error.message);
      if (error.message.includes('already exists')) {
        throw Errors.LABEL_ALREADY_EXISTS;
      }
      throw error;
    }
  },
};
```

### 2.4 Controller: Update

**Ficheiro:** `server/api/controllers/organization-default-labels/update.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LABEL_NOT_FOUND: {
    labelNotFound: 'Label not found',
  },
  LABEL_ALREADY_EXISTS: {
    labelAlreadyExists: 'Label already exists',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'number',
      required: true,
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 60,
    },
    color: {
      type: 'string',
      isIn: require('../../models/Label').COLORS,
    },
    description: {
      type: 'string',
      allowNull: true,
      maxLength: 280,
    },
    position: {
      type: 'number',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelNotFound: {
      responseType: 'notFound',
    },
    labelAlreadyExists: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    console.log('🔵 [CONTROLLER] PATCH /api/organization-default-labels/update', inputs);
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    try {
      const values = {};
      if (inputs.name !== undefined) values.name = inputs.name.trim();
      if (inputs.color !== undefined) values.color = inputs.color;
      if (inputs.description !== undefined) values.description = inputs.description?.trim() || null;
      if (inputs.position !== undefined) values.position = inputs.position;

      const label = await sails.models.organizationdefaultlabel.qm.updateOne(inputs.id, values);

      if (!label) {
        console.log(`🔴 [CONTROLLER] Label ${inputs.id} não encontrado`);
        throw Errors.LABEL_NOT_FOUND;
      }

      console.log(`✅ [CONTROLLER] Label ${inputs.id} atualizado`);


      // Broadcast para admins
      const admins = await User.find({
        or: [
          { role: User.Roles.ADMIN },
          { role: User.Roles.PROJECT_OWNER },
        ],
      });

      admins.forEach((admin) => {
        sails.sockets.broadcast(
          `user:${admin.id}`,
          'organizationDefaultLabelUpdate',
          { item: label }
        );
      });

      return { item: label };
    } catch (error) {
      if (error.message?.includes('already exists')) {
        throw Errors.LABEL_ALREADY_EXISTS;
      }
      if (error === Errors.LABEL_NOT_FOUND) {
        throw error;
      }
      throw error;
    }
  },
};
```

### 2.5 Controller: Delete

**Ficheiro:** `server/api/controllers/organization-default-labels/delete.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LABEL_NOT_FOUND: {
    labelNotFound: 'Label not found',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'number',
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    labelNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const label = await sails.models.organizationdefaultlabel.qm.deleteOne(inputs.id);

    if (!label) {
      throw Errors.LABEL_NOT_FOUND;
    }

    // Broadcast para admins
    const admins = await User.find({
      or: [
        { role: User.Roles.ADMIN },
        { role: User.Roles.PROJECT_OWNER },
      ],
    });

    admins.forEach((admin) => {
      sails.sockets.broadcast(
        `user:${admin.id}`,
        'organizationDefaultLabelDelete',
        { item: label }
      );
    });

    return { item: label };
  },
};
```

### 2.6 Controller: Reorder

**Ficheiro:** `server/api/controllers/organization-default-labels/reorder.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  inputs: {
    order: {
      type: 'json',
      required: true,
      custom: (value) => {
        if (!Array.isArray(value)) return false;
        return value.every(item => 
          typeof item.id === 'number' && 
          typeof item.position === 'number'
        );
      },
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    await sails.models.organizationdefaultlabel.qm.reorder(inputs.order);

    const labels = await sails.models.organizationdefaultlabel.qm.getAll();

    // Broadcast para admins
    const admins = await User.find({
      or: [
        { role: User.Roles.ADMIN },
        { role: User.Roles.PROJECT_OWNER },
      ],
    });

    admins.forEach((admin) => {
      sails.sockets.broadcast(
        `user:${admin.id}`,
        'organizationDefaultLabelsReorder',
        { items: labels }
      );
    });

    return { items: labels };
  },
};
```

### 2.7 Controller: Bulk Apply

**Ficheiro:** `server/api/controllers/organization-default-labels/bulk-apply.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  inputs: {
    projectIds: {
      type: 'json',
      required: true,
      custom: (value) => Array.isArray(value) && value.every(id => typeof id === 'number'),
    },
    overwriteMode: {
      type: 'string',
      isIn: ['skip', 'merge-by-name', 'rename-on-conflict'],
      defaultsTo: 'skip',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    console.log('🔵 [CONTROLLER] POST /api/organization-default-labels/bulk-apply');
    console.log(`🔵 [CONTROLLER] Projects: ${inputs.projectIds.length}, Mode: ${inputs.overwriteMode}`);
    const { currentUser } = this.req;

    if (!sails.helpers.users.isAdminOrProjectOwner(currentUser)) {
      console.log('🔴 [CONTROLLER] Acesso negado');
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const defaultLabels = await sails.models.organizationdefaultlabel.qm.getAll();
    console.log(`🔵 [CONTROLLER] A aplicar ${defaultLabels.length} labels padrão`);
    const results = [];

    // Processar cada projeto
    for (const projectId of inputs.projectIds) {
      console.log(`🔵 [CONTROLLER] Processando project ${projectId}...`);
      try {
        const result = await sails.helpers.organizationDefaultLabels.applyToBoards.with({
          projectId,
          defaultLabels,
          overwriteMode: inputs.overwriteMode,
        });
        
        console.log(`✅ [CONTROLLER] Project ${projectId}: ${result.boardsProcessed} boards, ${result.labelsCreated} labels criados`);
        results.push({
          projectId,
          success: true,
          ...result,
        });
      } catch (error) {
        console.log(`🔴 [CONTROLLER] Erro no project ${projectId}:`, error.message);
        sails.log.error(`[ORG_DEFAULT_LABELS] Error applying to project ${projectId}:`, error);
        results.push({
          projectId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(`✅ [CONTROLLER] Bulk apply concluído: ${results.filter(r => r.success).length}/${results.length} projetos`);
    sails.log.info(`[ORG_DEFAULT_LABELS] Bulk apply completed. Processed ${results.length} projects`);

    return {
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };
  },
};
```

### 2.8 Helper: Apply to Boards

**Ficheiro:** `server/api/helpers/organization-default-labels/apply-to-boards.js`

```javascript
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    projectId: {
      type: 'number',
      required: true,
    },
    defaultLabels: {
      type: 'json',
      required: true,
    },
    overwriteMode: {
      type: 'string',
      defaultsTo: 'skip',
    },
  },

  exits: {
    success: {
      outputDescription: 'Default labels applied to boards',
    },
  },

  async fn(inputs) {
    const { projectId, defaultLabels, overwriteMode } = inputs;
    console.log(`🔵 [HELPER] applyToBoards: project ${projectId}, mode: ${overwriteMode}`);

    // ✅ Buscar BOARDS do projeto (labels pertencem a boards, não projects)
    const boards = await sails.models.board.find({ projectId });
    console.log(`🔵 [HELPER] Encontrados ${boards.length} boards no project ${projectId}`);
    
    if (boards.length === 0) {
      console.log(`⚠️ [HELPER] Project ${projectId} não tem boards, a saltar`);
      return {
        boardsProcessed: 0,
        labelsCreated: 0,
        labelsSkipped: 0,
        labelsRenamed: 0,
      };
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalRenamed = 0;

    // Aplicar a cada board do projeto
    for (const board of boards) {
      console.log(`🔵 [HELPER] A processar board ${board.id} ("${board.name}")...`);
      const result = await applyLabelsToBoard(board.id, defaultLabels, overwriteMode);
      console.log(`✅ [HELPER] Board ${board.id}: ${result.created} criados, ${result.skipped} saltados, ${result.renamed} renomeados`);
      totalCreated += result.created;
      totalSkipped += result.skipped;
      totalRenamed += result.renamed;
    }

    console.log(`✅ [HELPER] Project ${projectId} completo: ${totalCreated} criados, ${totalSkipped} saltados, ${totalRenamed} renomeados`);
    sails.log.info(
      `[ORG_DEFAULT_LABELS] Applied to project ${projectId}: ` +
      `${totalCreated} created, ${totalSkipped} skipped, ${totalRenamed} renamed`
    );

    return {
      boardsProcessed: boards.length,
      labelsCreated: totalCreated,
      labelsSkipped: totalSkipped,
      labelsRenamed: totalRenamed,
    };
  },
};

// Função auxiliar
async function applyLabelsToBoard(boardId, defaultLabels, overwriteMode) {
  let created = 0;
  let skipped = 0;
  let renamed = 0;

  // Buscar labels existentes no board
  const existingLabels = await sails.models.label.find({ boardId });
  const existingNames = existingLabels.map(l => l.name.toLowerCase());

  for (const defaultLabel of defaultLabels) {
    const nameExists = existingNames.includes(defaultLabel.name.toLowerCase());

    if (nameExists) {
      if (overwriteMode === 'skip') {
        skipped++;
        continue;
      } else if (overwriteMode === 'merge-by-name') {
        // Atualizar label existente
        const existing = existingLabels.find(
          l => l.name.toLowerCase() === defaultLabel.name.toLowerCase()
        );
        await sails.models.label.updateOne({ id: existing.id }).set({
          color: defaultLabel.color,
          position: defaultLabel.position,
        });
        skipped++;
        continue;
      } else if (overwriteMode === 'rename-on-conflict') {
        // Criar com nome modificado
        let newName = `${defaultLabel.name} (Default)`;
        let counter = 2;
        while (existingNames.includes(newName.toLowerCase())) {
          newName = `${defaultLabel.name} (Default ${counter})`;
          counter++;
        }
        await sails.models.label.create({
          boardId,
          name: newName,
          color: defaultLabel.color,
          position: defaultLabel.position,
        });
        renamed++;
        continue;
      }
    }

    // Criar nova label
    await sails.models.label.create({
      boardId,
      name: defaultLabel.name,
      color: defaultLabel.color,
      position: defaultLabel.position,
    });
    created++;
  }

  return { created, skipped, renamed };
}
```

### 2.9 Modificar Helper de Criação de Boards

**Ficheiro:** `server/api/helpers/boards/create-one.js`

**⚠️ MODIFICAÇÃO NECESSÁRIA:** Adicionar aplicação automática de default labels

```javascript
// Localizar esta linha no ficheiro existente:
const { board, boardMembership, lists } = await Board.qm.createOne(...);

// 🆕 ADICIONAR LOGO APÓS:
// ========================================
// APLICAR DEFAULT LABELS (Feature Flag)
// ========================================
if (process.env.PLANKA_FEATURE_ORG_DEFAULT_LABELS === 'true') {
  try {
    console.log(`🔵 [HOOK] Novo board criado (${board.id}), a verificar default labels...`);
    const defaultLabels = await sails.models.organizationdefaultlabel.qm.getAll();
    
    if (defaultLabels.length > 0) {
      console.log(`🔵 [HOOK] A aplicar ${defaultLabels.length} default labels ao board ${board.id}`);
      // Criar labels no novo board
      for (const defaultLabel of defaultLabels) {
        await sails.models.label.create({
          boardId: board.id,
          name: defaultLabel.name,
          color: defaultLabel.color,
          position: defaultLabel.position,
        });
      }
      
      console.log(`✅ [HOOK] ${defaultLabels.length} default labels aplicados ao board ${board.id}`);
      sails.log.info(
        `[ORG_DEFAULT_LABELS] Applied ${defaultLabels.length} default labels to board ${board.id}`
      );
    } else {
      console.log(`⚠️ [HOOK] Nenhum default label configurado`);
    }
  } catch (error) {
    console.log(`🔴 [HOOK] Erro ao aplicar default labels:`, error.message);
    sails.log.error('[ORG_DEFAULT_LABELS] Error applying default labels:', error);
    // Não falhar a criação do board por causa disto
  }
} else {
  console.log(`⚠️ [HOOK] Feature PLANKA_FEATURE_ORG_DEFAULT_LABELS desativada`);
}
// ========================================

// O resto do código continua inalterado...
if (inputs.import && inputs.import.type === Board.ImportTypes.TRELLO) {
  // ...
}
```

### 2.10 Adicionar Rotas

**Ficheiro:** `server/config/routes.js`

**⚠️ MODIFICAÇÃO:** Adicionar ao final do ficheiro:

```javascript
// Organization Default Labels (Admin/ProjectOwner only)
'GET /api/organization-default-labels': 'organization-default-labels/list',
'POST /api/organization-default-labels': 'organization-default-labels/create',
'PATCH /api/organization-default-labels/:id': 'organization-default-labels/update',
'DELETE /api/organization-default-labels/:id': 'organization-default-labels/delete',
'POST /api/organization-default-labels/reorder': 'organization-default-labels/reorder',
'POST /api/organization-default-labels/bulk-apply': 'organization-default-labels/bulk-apply',
```

---

## ⏸️ PAUSA 2: Validar Backend Completo

**📊 O que foi feito até aqui:**
- ✅ Migration + Model + Query Methods (PAUSA 1)
- ✅ Controllers (list, create, update, delete, reorder, bulk-apply)
- ✅ Helper `applyToBoards` + Hook em `boards/create-one.js`
- ✅ Rotas configuradas

**🔍 Testes de Validação:**

### Teste 1: Listar Labels Padrão (Seeds)
```bash
curl http://localhost:1337/api/organization-default-labels \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
**Logs esperados:**
```
🔵 [CONTROLLER] GET /api/organization-default-labels/list
🔵 [QM] OrganizationDefaultLabel.getAll()
✅ [QM] Encontrados 4 labels padrão
✅ [CONTROLLER] A retornar 4 labels
```

### Teste 2: Criar Label Novo
```bash
curl -X POST http://localhost:1337/api/organization-default-labels \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Urgente", "color": "berry-red", "description": "Item urgente", "position": 5}'
```
**Logs esperados:**
```
🔵 [CONTROLLER] POST /api/organization-default-labels/create
🔵 [QM] OrganizationDefaultLabel.createOne()
✅ [QM] Label criado: "Urgente" (berry-red)
✅ [CONTROLLER] Label criado: "Urgente" (ID: 5)
```

### Teste 3: Criar Board Novo (Aplicação Automática) - **TESTE CRÍTICO**
```bash
# Via UI: Projects → Board → "Create Board"
```
**Logs esperados:**
```
🔵 [HOOK] Novo board criado (ID), a verificar default labels...
🔵 [QM] OrganizationDefaultLabel.getAll()
🔵 [HOOK] A aplicar 5 default labels ao board ID
✅ [HOOK] 5 default labels aplicados ao board ID
```

### Teste 4: Bulk Apply (Opcional)
```bash
curl -X POST http://localhost:1337/api/organization-default-labels/bulk-apply \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"projectIds": [1], "overwriteMode": "skip"}'
```
**Logs esperados:**
```
🔵 [CONTROLLER] POST /api/organization-default-labels/bulk-apply
🔵 [HELPER] applyToBoards: project 1, mode: skip
✅ [CONTROLLER] Bulk apply concluído: 1/1 projetos
```

**✅ Checklist de Validação:**
- [ ] Endpoint `list` funciona e mostra logs
- [ ] Endpoint `create` cria labels com logs corretos
- [ ] **Criar board novo aplica labels automaticamente** (CRÍTICO!)
- [ ] Logs aparecem em todos os pontos (QM, CONTROLLER, HELPER, HOOK)
- [ ] Feature flag `PLANKA_FEATURE_ORG_DEFAULT_LABELS=false` desativa feature

**💬 Feedback:**  
Confirma que **todos os logs aparecem** e que o **Teste 3 (aplicação automática) funciona**. Depois avança para Frontend.
- [ ] API retorna 403 para utilizadores normais
- [ ] Novo board criado recebe as 4 labels automaticamente

---

## 🎨 Fase 3: Frontend - Redux e Estado

### 3.1 Action Types

**Ficheiro:** `client/src/constants/ActionTypes.js`

**⚠️ MODIFICAÇÃO:** Adicionar ao final do objecto:

```javascript
// Organization Default Labels
ORGANIZATION_DEFAULT_LABELS_FETCH: 'ORGANIZATION_DEFAULT_LABELS_FETCH',
ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS: 'ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS',
ORGANIZATION_DEFAULT_LABELS_FETCH__FAILURE: 'ORGANIZATION_DEFAULT_LABELS_FETCH__FAILURE',

ORGANIZATION_DEFAULT_LABEL_CREATE: 'ORGANIZATION_DEFAULT_LABEL_CREATE',
ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS: 'ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS',
ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE: 'ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE',

ORGANIZATION_DEFAULT_LABEL_UPDATE: 'ORGANIZATION_DEFAULT_LABEL_UPDATE',
ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS: 'ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS',
ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE: 'ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE',

ORGANIZATION_DEFAULT_LABEL_DELETE: 'ORGANIZATION_DEFAULT_LABEL_DELETE',
ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS: 'ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS',
ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE: 'ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE',

ORGANIZATION_DEFAULT_LABELS_REORDER: 'ORGANIZATION_DEFAULT_LABELS_REORDER',
ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS: 'ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS',

ORGANIZATION_DEFAULT_LABELS_BULK_APPLY: 'ORGANIZATION_DEFAULT_LABELS_BULK_APPLY',
ORGANIZATION_DEFAULT_LABELS_BULK_APPLY__SUCCESS: 'ORGANIZATION_DEFAULT_LABELS_BULK_APPLY__SUCCESS',
```

### 3.2 Actions

**Ficheiro:** `client/src/actions/organization-default-labels.js`

```javascript
import ActionTypes from '../constants/ActionTypes';

export const fetchOrganizationDefaultLabels = () => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH,
  payload: {},
});

fetchOrganizationDefaultLabels.success = (items) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS,
  payload: { items },
});

fetchOrganizationDefaultLabels.failure = (error) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__FAILURE,
  payload: { error },
});

export const createOrganizationDefaultLabel = (data) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE,
  payload: { data },
});

createOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS,
  payload: { item },
});

export const updateOrganizationDefaultLabel = (id, data) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE,
  payload: { id, data },
});

updateOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS,
  payload: { item },
});

export const deleteOrganizationDefaultLabel = (id) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE,
  payload: { id },
});

deleteOrganizationDefaultLabel.success = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS,
  payload: { item },
});

export const reorderOrganizationDefaultLabels = (order) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER,
  payload: { order },
});

reorderOrganizationDefaultLabels.success = (items) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS,
  payload: { items },
});

export const bulkApplyOrganizationDefaultLabels = (projectIds, overwriteMode) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY,
  payload: { projectIds, overwriteMode },
});

bulkApplyOrganizationDefaultLabels.success = (results, summary) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY__SUCCESS,
  payload: { results, summary },
});

// WebSocket handlers
export const handleOrganizationDefaultLabelCreate = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE,
  payload: { item },
});

export const handleOrganizationDefaultLabelUpdate = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE,
  payload: { item },
});

export const handleOrganizationDefaultLabelDelete = (item) => ({
  type: ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE,
  payload: { item },
});
```

### 3.3 API Client

**Ficheiro:** `client/src/api/organization-default-labels.js`

```javascript
import socket from './socket';

export const fetchOrganizationDefaultLabels = () =>
  socket.get('/api/organization-default-labels');

export const createOrganizationDefaultLabel = (data) =>
  socket.post('/api/organization-default-labels', data);

export const updateOrganizationDefaultLabel = (id, data) =>
  socket.patch(`/api/organization-default-labels/${id}`, data);

export const deleteOrganizationDefaultLabel = (id) =>
  socket.delete(`/api/organization-default-labels/${id}`);

export const reorderOrganizationDefaultLabels = (order) =>
  socket.post('/api/organization-default-labels/reorder', { order });

export const bulkApplyOrganizationDefaultLabels = (projectIds, overwriteMode) =>
  socket.post('/api/organization-default-labels/bulk-apply', {
    projectIds,
    overwriteMode,
  });
```

### 3.4 Modelo Redux ORM

**Ficheiro:** `client/src/models/OrganizationDefaultLabel.js`

```javascript
import { attr, Model } from 'redux-orm';

import ActionTypes from '../constants/ActionTypes';

export default class OrganizationDefaultLabel extends Model {
  static modelName = 'OrganizationDefaultLabel';

  static fields = {
    id: attr(),
    name: attr(),
    color: attr(),
    description: attr(),
    position: attr(),
    createdAt: attr(),
    updatedAt: attr(),
  };

  static reducer({ type, payload }, OrganizationDefaultLabel) {
    switch (type) {
      case ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH__SUCCESS:
        payload.items.forEach((item) => {
          OrganizationDefaultLabel.upsert(item);
        });
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE_HANDLE:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE_HANDLE:
        OrganizationDefaultLabel.upsert(payload.item);
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE__SUCCESS:
      case ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE_HANDLE:
        if (OrganizationDefaultLabel.idExists(payload.item.id)) {
          OrganizationDefaultLabel.withId(payload.item.id).delete();
        }
        break;

      case ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER__SUCCESS:
        payload.items.forEach((item) => {
          OrganizationDefaultLabel.upsert(item);
        });
        break;

      default:
    }
  }
}
```

**⚠️ MODIFICAÇÃO:** Registar modelo em `client/src/orm.js`:

```javascript
// Adicionar import
import OrganizationDefaultLabel from './models/OrganizationDefaultLabel';

// Adicionar ao orm.register()
orm.register(
  // ... modelos existentes ...
  OrganizationDefaultLabel,
);
```

### 3.5 Saga

**Ficheiro:** `client/src/sagas/organization-default-labels.js`

```javascript
import { call, put, takeEvery } from 'redux-saga/effects';

import api from '../api';
import actions from '../actions';
import ActionTypes from '../constants/ActionTypes';

function* fetchOrganizationDefaultLabels() {
  console.log('🔵 [SAGA] Fetching organization default labels...');
  try {
    const response = yield call(api.fetchOrganizationDefaultLabels);
    console.log(`✅ [SAGA] Fetched ${response.items.length} organization default labels`);
    yield put(actions.fetchOrganizationDefaultLabels.success(response.items));
  } catch (error) {
    console.error('🔴 [SAGA] Error fetching organization default labels:', error);
    yield put(actions.fetchOrganizationDefaultLabels.failure(error));
  }
}

function* createOrganizationDefaultLabel(action) {
  console.log('🔵 [SAGA] Creating organization default label...', action.payload.data);
  try {
    const response = yield call(api.createOrganizationDefaultLabel, action.payload.data);
    console.log(`✅ [SAGA] Organization default label created: "${response.item.name}"`);
    yield put(actions.createOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error creating organization default label:', error);
  }
}

function* updateOrganizationDefaultLabel(action) {
  console.log('🔵 [SAGA] Updating organization default label...', action.payload);
  try {
    const response = yield call(
      api.updateOrganizationDefaultLabel,
      action.payload.id,
      action.payload.data
    );
    console.log(`✅ [SAGA] Organization default label updated (ID: ${action.payload.id})`);
    yield put(actions.updateOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error updating organization default label:', error);
  }
}

function* deleteOrganizationDefaultLabel(action) {
  console.log(`🔵 [SAGA] Deleting organization default label (ID: ${action.payload.id})...`);
  try {
    const response = yield call(api.deleteOrganizationDefaultLabel, action.payload.id);
    console.log(`✅ [SAGA] Organization default label deleted (ID: ${action.payload.id})`);
    yield put(actions.deleteOrganizationDefaultLabel.success(response.item));
  } catch (error) {
    console.error('🔴 [SAGA] Error deleting organization default label:', error);
  }
}

function* reorderOrganizationDefaultLabels(action) {
  console.log('🔵 [SAGA] Reordering organization default labels...', `${action.payload.order.length} items`);
  try {
    const response = yield call(api.reorderOrganizationDefaultLabels, action.payload.order);
    console.log(`✅ [SAGA] Labels reordered successfully`);
    yield put(actions.reorderOrganizationDefaultLabels.success(response.items));
  } catch (error) {
    console.error('🔴 [SAGA] Error reordering organization default labels:', error);
  }
}

function* bulkApplyOrganizationDefaultLabels(action) {
  console.log('🔵 [SAGA] Bulk applying organization default labels...', action.payload);
  try {
    const response = yield call(
      api.bulkApplyOrganizationDefaultLabels,
      action.payload.projectIds,
      action.payload.overwriteMode
    );
    console.log(`✅ [SAGA] Bulk apply completed: ${response.summary.successful}/${response.summary.total} projects successful`);
    yield put(
      actions.bulkApplyOrganizationDefaultLabels.success(
        response.results,
        response.summary
      )
    );
  } catch (error) {
    console.error('🔴 [SAGA] Error bulk applying organization default labels:', error);
  }
}

export default function* organizationDefaultLabelsSaga() {
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_FETCH,
    fetchOrganizationDefaultLabels
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_CREATE,
    createOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_UPDATE,
    updateOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABEL_DELETE,
    deleteOrganizationDefaultLabel
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_REORDER,
    reorderOrganizationDefaultLabels
  );
  yield takeEvery(
    ActionTypes.ORGANIZATION_DEFAULT_LABELS_BULK_APPLY,
    bulkApplyOrganizationDefaultLabels
  );
}
```

**⚠️ MODIFICAÇÃO:** Registar saga no root saga (ficheiro que agrega todas as sagas)

---

## 🎨 Fase 4: Frontend - Componentes UI

### 4.1 Componente Principal: DefaultLabelsPane

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/DefaultLabelsPane.jsx`

```jsx
import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Header, Table, Icon, Label } from 'semantic-ui-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import actions from '../../../../actions';
import selectors from '../../../../selectors';
import AddModal from './AddModal';
import EditModal from './EditModal';
import BulkApplyModal from './BulkApplyModal';

import styles from './DefaultLabelsPane.module.scss';

const DefaultLabelsPane = () => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  
  const labels = useSelector(state => {
    const all = state.orm.OrganizationDefaultLabel.all().toRefArray();
    return all.sort((a, b) => a.position - b.position);
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkApplyModalOpen, setIsBulkApplyModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);

  useEffect(() => {
    dispatch(actions.fetchOrganizationDefaultLabels());
  }, [dispatch]);

  const handleAddClick = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleAddSubmit = useCallback((data) => {
    dispatch(actions.createOrganizationDefaultLabel(data));
    setIsAddModalOpen(false);
  }, [dispatch]);

  const handleEditClick = useCallback((label) => {
    setEditingLabel(label);
  }, []);

  const handleEditSubmit = useCallback((id, data) => {
    dispatch(actions.updateOrganizationDefaultLabel(id, data));
    setEditingLabel(null);
  }, [dispatch]);

  const handleDeleteClick = useCallback((id) => {
    if (window.confirm(t('common.areYouSureYouWantToDeleteThisDefaultLabel'))) {
      dispatch(actions.deleteOrganizationDefaultLabel(id));
    }
  }, [dispatch, t]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const items = Array.from(labels);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const order = items.map((item, index) => ({
      id: item.id,
      position: index,
    }));

    dispatch(actions.reorderOrganizationDefaultLabels(order));
  }, [labels, dispatch]);

  const handleBulkApplyClick = useCallback(() => {
    setIsBulkApplyModalOpen(true);
  }, []);

  const handleBulkApplySubmit = useCallback((projectIds, overwriteMode) => {
    dispatch(actions.bulkApplyOrganizationDefaultLabels(projectIds, overwriteMode));
    setIsBulkApplyModalOpen(false);
  }, [dispatch]);

  return (
    <div className={styles.wrapper}>
      <Header as="h3">
        {t('common.defaultLabels')}
      </Header>
      
      <p className={styles.description}>
        {t('common.defaultLabelsDescription')}
      </p>

      <div className={styles.actions}>
        <Button primary icon labelPosition="left" onClick={handleAddClick}>
          <Icon name="plus" />
          {t('common.addLabel')}
        </Button>
        
        {labels.length > 0 && (
          <Button icon labelPosition="left" onClick={handleBulkApplyClick}>
            <Icon name="sync" />
            {t('common.applyToExistingProjects')}
          </Button>
        )}
      </div>

      {labels.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name="tags" size="huge" />
          <p>{t('common.noDefaultLabelsYet')}</p>
          <p>{t('common.addCommonLabelsForAllProjects')}</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="default-labels">
            {(provided) => (
              <Table celled {...provided.droppableProps} ref={provided.innerRef}>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell width={1}></Table.HeaderCell>
                    <Table.HeaderCell width={4}>{t('common.name')}</Table.HeaderCell>
                    <Table.HeaderCell width={2}>{t('common.color')}</Table.HeaderCell>
                    <Table.HeaderCell width={6}>{t('common.description')}</Table.HeaderCell>
                    <Table.HeaderCell width={2}>{t('common.actions')}</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {labels.map((label, index) => (
                    <Draggable key={label.id} draggableId={String(label.id)} index={index}>
                      {(provided) => (
                        <Table.Row
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <Table.Cell {...provided.dragHandleProps}>
                            <Icon name="bars" style={{ cursor: 'grab' }} />
                          </Table.Cell>
                          <Table.Cell>
                            <Label className={`background${label.color}`}>
                              {label.name}
                            </Label>
                          </Table.Cell>
                          <Table.Cell>
                            <code>{label.color}</code>
                          </Table.Cell>
                          <Table.Cell>{label.description || '-'}</Table.Cell>
                          <Table.Cell>
                            <Button
                              icon="edit"
                              size="mini"
                              onClick={() => handleEditClick(label)}
                            />
                            <Button
                              icon="trash"
                              size="mini"
                              color="red"
                              onClick={() => handleDeleteClick(label.id)}
                            />
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Table.Body>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {isAddModalOpen && (
        <AddModal
          onSubmit={handleAddSubmit}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {editingLabel && (
        <EditModal
          label={editingLabel}
          onSubmit={(data) => handleEditSubmit(editingLabel.id, data)}
          onClose={() => setEditingLabel(null)}
        />
      )}

      {isBulkApplyModalOpen && (
        <BulkApplyModal
          onSubmit={handleBulkApplySubmit}
          onClose={() => setIsBulkApplyModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DefaultLabelsPane;
```

### 4.2 Modal de Adição

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/AddModal.jsx`

```jsx
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Button, Dropdown } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

// ✅ Importar cores do Planka
import { COLORS } from '../../../models/Label';

const AddModal = ({ onSubmit, onClose }) => {
  const [t] = useTranslation();
  const [data, setData] = useState({
    name: '',
    color: COLORS[0],
    description: '',
  });

  const handleFieldChange = useCallback((e, { name, value }) => {
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!data.name.trim()) return;
    onSubmit(data);
  }, [data, onSubmit]);

  // ✅ Dropdown options com cores do Planka
  const colorOptions = COLORS.map(color => ({
    key: color,
    value: color,
    text: color,
    label: { className: `background${color}`, empty: true, circular: true },
  }));

  return (
    <Modal open onClose={onClose} size="small">
      <Modal.Header>{t('common.addDefaultLabel')}</Modal.Header>
      <Modal.Content>
        <Form>
          <Form.Input
            label={t('common.name')}
            name="name"
            value={data.name}
            onChange={handleFieldChange}
            maxLength={60}
            required
            autoFocus
          />

          <Form.Field>
            <label>{t('common.color')}</label>
            <Dropdown
              selection
              search
              name="color"
              value={data.color}
              options={colorOptions}
              onChange={handleFieldChange}
            />
          </Form.Field>

          <Form.TextArea
            label={`${t('common.description')} (${t('common.optional')})`}
            name="description"
            value={data.description}
            onChange={handleFieldChange}
            maxLength={280}
          />
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>{t('action.cancel')}</Button>
        <Button primary onClick={handleSubmit} disabled={!data.name.trim()}>
          {t('action.add')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

AddModal.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AddModal;
```

### 4.3 Modal de Edição

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/EditModal.jsx`

```jsx
import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Button, Dropdown } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { COLORS } from '../../../models/Label';

const EditModal = ({ label, onSubmit, onClose }) => {
  const [t] = useTranslation();
  const [data, setData] = useState({
    name: label.name,
    color: label.color,
    description: label.description || '',
  });

  const handleFieldChange = useCallback((e, { name, value }) => {
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!data.name.trim()) return;
    onSubmit(data);
  }, [data, onSubmit]);

  const colorOptions = COLORS.map(color => ({
    key: color,
    value: color,
    text: color,
    label: { className: `background${color}`, empty: true, circular: true },
  }));

  return (
    <Modal open onClose={onClose} size="small">
      <Modal.Header>{t('common.editDefaultLabel')}</Modal.Header>
      <Modal.Content>
        <Form>
          <Form.Input
            label={t('common.name')}
            name="name"
            value={data.name}
            onChange={handleFieldChange}
            maxLength={60}
            required
            autoFocus
          />

          <Form.Field>
            <label>{t('common.color')}</label>
            <Dropdown
              selection
              search
              name="color"
              value={data.color}
              options={colorOptions}
              onChange={handleFieldChange}
            />
          </Form.Field>

          <Form.TextArea
            label={`${t('common.description')} (${t('common.optional')})`}
            name="description"
            value={data.description}
            onChange={handleFieldChange}
            maxLength={280}
          />
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>{t('action.cancel')}</Button>
        <Button primary onClick={handleSubmit} disabled={!data.name.trim()}>
          {t('action.save')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

EditModal.propTypes = {
  label: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EditModal;
```

### 4.4 Modal de Bulk Apply

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/BulkApplyModal.jsx`

```jsx
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Button, List, Checkbox, Dropdown } from 'semantic-ui-react';

import selectors from '../../../../selectors';

const OVERWRITE_MODES = [
  { key: 'skip', value: 'skip', text: 'Ignorar etiquetas duplicadas' },
  { key: 'merge', value: 'merge-by-name', text: 'Atualizar etiquetas com mesmo nome' },
  { key: 'rename', value: 'rename-on-conflict', text: 'Renomear em caso de conflito' },
];

const BulkApplyModal = ({ onSubmit, onClose }) => {
  const [t] = useTranslation();
  const projects = useSelector(selectors.selectProjects);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [overwriteMode, setOverwriteMode] = useState('skip');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleProjectToggle = useCallback((projectId) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  }, [projects, selectedProjectIds]);

  const handleContinue = useCallback(() => {
    if (selectedProjectIds.length === 0) return;
    setShowConfirmation(true);
  }, [selectedProjectIds]);

  const handleConfirm = useCallback(() => {
    onSubmit(selectedProjectIds, overwriteMode);
  }, [selectedProjectIds, overwriteMode, onSubmit]);

  if (showConfirmation) {
    return (
      <Modal open onClose={onClose} size="small">
        <Modal.Header>{t('common.confirmApplication')}</Modal.Header>
        <Modal.Content>
          <p>
            {t('common.areYouSureApplyToProjects', { count: selectedProjectIds.length })}
          </p>
          <p>{t('common.thisWillApplyAllDefaultLabels')}</p>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setShowConfirmation(false)}>{t('action.back')}</Button>
          <Button primary onClick={handleConfirm}>
            {t('action.confirm')}
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="small">
      <Modal.Header>{t('common.applyToExistingProjects')}</Modal.Header>
      <Modal.Content scrolling>
        <Form>
          <Form.Field>
            <label>{t('common.applicationMode')}</label>
            <Dropdown
              selection
              options={OVERWRITE_MODES}
              value={overwriteMode}
              onChange={(e, { value }) => setOverwriteMode(value)}
            />
          </Form.Field>

          <Form.Field>
            <label>
              {t('common.projects')} ({selectedProjectIds.length} {t('common.of')} {projects.length} {t('common.selected')})
            </label>
            <Checkbox
              label={t('common.selectAll')}
              checked={selectedProjectIds.length === projects.length}
              onChange={handleSelectAll}
            />
          </Form.Field>

          <List divided selection>
            {projects.map((project) => (
              <List.Item
                key={project.id}
                onClick={() => handleProjectToggle(project.id)}
              >
                <Checkbox
                  checked={selectedProjectIds.includes(project.id)}
                  label={project.name}
                />
              </List.Item>
            ))}
          </List>
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={onClose}>{t('action.cancel')}</Button>
        <Button
          primary
          onClick={handleContinue}
          disabled={selectedProjectIds.length === 0}
        >
          {t('action.continue')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

BulkApplyModal.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BulkApplyModal;
```

### 4.5 Estilos

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/DefaultLabelsPane.module.scss`

```scss
.wrapper {
  padding: 20px;
}

.description {
  color: rgba(230, 237, 243, 0.7);
  margin-bottom: 20px;
}

.actions {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.emptyState {
  text-align: center;
  padding: 60px 20px;
  color: rgba(230, 237, 243, 0.5);

  i.icon {
    color: rgba(230, 237, 243, 0.3);
    margin-bottom: 20px;
  }

  p {
    margin: 10px 0;
  }
}
```

### 4.6 Index

**Ficheiro:** `client/src/components/common/AdministrationModal/DefaultLabelsPane/index.js`

```javascript
export { default } from './DefaultLabelsPane';
```

### 4.7 Integrar no AdministrationModal

**Ficheiro:** `client/src/components/common/AdministrationModal/AdministrationModal.jsx`

**⚠️ MODIFICAÇÕES:**

```jsx
// 1. Adicionar import
import DefaultLabelsPane from './DefaultLabelsPane';

// 2. Modificar array de panes (linha ~33)
const panes = [
  {
    menuItem: t('common.users', { context: 'title' }),
    render: () => <UsersPane />,
  },
  // 🆕 ADICIONAR:
  {
    menuItem: t('common.defaultLabels', { context: 'title' }),
    render: () => <DefaultLabelsPane />,
  },
];

// 3. Ajustar lógica de tamanho do modal (linha ~42)
const isUsersPaneActive = activeTabIndex === 0;
const isDefaultLabelsActive = activeTabIndex === 1; // 🆕

// 4. Modificar size do modal (linha ~47)
<ClosableModal
  closeIcon
  size={isUsersPaneActive || isDefaultLabelsActive ? 'large' : 'small'}
  centered={false}
  className={classNames(isUsersPaneActive && styles.wrapperUsers)}
  onClose={handleClose}
>
```

---

## 🌐 Fase 5: Traduções

### 5.1 Português (pt-PT)

**Ficheiro:** `client/src/locales/pt-PT/core.js`

**⚠️ ADICIONAR ao objeto:**

```javascript
// Organization Default Labels
defaultLabels: 'Etiquetas Padrão',
defaultLabelsDescription: 'Estas etiquetas são automaticamente adicionadas a todos os novos boards.',
addDefaultLabel: 'Adicionar Etiqueta Padrão',
editDefaultLabel: 'Editar Etiqueta Padrão',
applyToExistingProjects: 'Aplicar a Projetos Existentes',
applicationMode: 'Modo de Aplicação',
confirmApplication: 'Confirmar Aplicação',
areYouSureApplyToProjects: 'Tem a certeza que deseja aplicar as etiquetas padrão a {{count}} projeto(s)?',
thisWillApplyAllDefaultLabels: 'Esta ação irá adicionar todas as etiquetas padrão aos projetos selecionados.',
areYouSureYouWantToDeleteThisDefaultLabel: 'Tem a certeza que deseja eliminar esta etiqueta padrão?',
noDefaultLabelsYet: 'Ainda não tem etiquetas padrão.',
addCommonLabelsForAllProjects: 'Adicione etiquetas comuns que deseja usar em todos os projetos.',
of: 'de',
selected: 'selecionados',
selectAll: 'Selecionar todos',
optional: 'opcional',
```

### 5.2 Inglês (en-US)

**Ficheiro:** `client/src/locales/en-US/core.js`

**⚠️ ADICIONAR ao objeto:**

```javascript
// Organization Default Labels
defaultLabels: 'Default Labels',
defaultLabelsDescription: 'These labels are automatically added to all new boards.',
addDefaultLabel: 'Add Default Label',
editDefaultLabel: 'Edit Default Label',
applyToExistingProjects: 'Apply to Existing Projects',
applicationMode: 'Application Mode',
confirmApplication: 'Confirm Application',
areYouSureApplyToProjects: 'Are you sure you want to apply default labels to {{count}} project(s)?',
thisWillApplyAllDefaultLabels: 'This action will add all default labels to the selected projects.',
areYouSureYouWantToDeleteThisDefaultLabel: 'Are you sure you want to delete this default label?',
noDefaultLabelsYet: 'No default labels yet.',
addCommonLabelsForAllProjects: 'Add common labels you want to use in all projects.',
of: 'of',
selected: 'selected',
selectAll: 'Select all',
optional: 'optional',
```

---

## ⏸️ PAUSA 3: Validar Frontend Completo

**📊 O que foi feito até aqui:**
- ✅ Backend completo e testado (PAUSA 1 + 2)
- ✅ Redux actions, selectors, sagas
- ✅ Componentes UI (DefaultLabelsPane, BulkApplyModal, etc.)
- ✅ Tab no AdministrationModal

**🔍 Testes de Validação:**

### Teste 1: Abrir Tab "Etiquetas Padrão"
**Passos:**
1. Login como ADMIN ou PROJECT_OWNER
2. Clicar no botão de administração no header
3. Verificar que tab "Etiquetas Padrão" aparece
4. Clicar na tab

**Logs esperados (Browser Console - F12):**
```
🔵 [SAGA] Fetching organization default labels...
🔵 [ACTION] ORGANIZATION_DEFAULT_LABELS_FETCH_REQUESTED
✅ [SAGA] Fetched 4 organization default labels
```

### Teste 2: Criar Etiqueta Nova
**Passos:**
1. Clicar "Adicionar Etiqueta"
2. Preencher: Nome="Bloqueado", Cor="berry-red", Descrição="Item bloqueado"
3. Clicar "Salvar"

**Logs esperados (Browser Console):**
```
🔵 [SAGA] Creating organization default label...
🔵 [ACTION] ORGANIZATION_DEFAULT_LABEL_CREATE_REQUESTED
✅ [SAGA] Organization default label created: "Bloqueado"
✅ [REDUCER] Label added to state (ID: X)
```

### Teste 3: Criar Board Novo e Verificar Labels
**Passos:**
1. Ir a Projects → qualquer projeto
2. Criar novo board: "Test Board"
3. Abrir board
4. Verificar que aparecem **5 etiquetas** (4 seeds + "Bloqueado")

**Logs esperados (Backend - docker logs):**
```
🔵 [HOOK] Novo board criado (ID), a verificar default labels...
🔵 [HOOK] A aplicar 5 default labels ao board ID
✅ [HOOK] 5 default labels aplicados ao board ID
```

### Teste 4: Bulk Apply
**Passos:**
1. Voltar ao modal de administração → tab "Etiquetas Padrão"
2. Clicar "Aplicar a Projetos Existentes"
3. Selecionar 1 projeto
4. Escolher modo "Ignorar etiquetas duplicadas"
5. Clicar "Aplicar"

**Logs esperados (Browser Console):**
```
🔵 [SAGA] Bulk applying organization default labels...
🔵 [ACTION] ORGANIZATION_DEFAULT_LABELS_BULK_APPLY_REQUESTED
✅ [SAGA] Bulk apply completed: 1/1 projects successful
```

**Logs esperados (Backend):**
```
🔵 [CONTROLLER] POST /api/organization-default-labels/bulk-apply
🔵 [HELPER] applyToBoards: project 1, mode: skip
✅ [CONTROLLER] Bulk apply concluído: 1/1 projetos
```

### Teste 5: Drag & Drop (Reordenar)
**Passos:**
1. Na lista de etiquetas, arrastar "Bloqueado" para primeira posição

**Logs esperados (Browser Console):**
```
🔵 [SAGA] Reordering organization default labels...
🔵 [ACTION] ORGANIZATION_DEFAULT_LABELS_REORDER_REQUESTED
✅ [SAGA] Labels reordered successfully
```

### Teste 6: Permissões (Utilizador Normal)
**Passos:**
1. Logout
2. Login como utilizador normal (não admin nem project owner)
3. Verificar que botão de administração **NÃO aparece** no header

**✅ Checklist de Validação:**
- [ ] Tab "Etiquetas Padrão" aparece no AdministrationModal
- [ ] Dropdown de cores mostra cores do Planka (não HEX livre)
- [ ] Criar etiqueta funciona + logs aparecem (browser + backend)
- [ ] Editar etiqueta funciona
- [ ] Drag & drop funciona + logs aparecem
- [ ] Eliminar etiqueta funciona
- [ ] **Novos boards recebem labels automaticamente** (CRÍTICO!)
- [ ] Bulk apply funciona + logs aparecem (browser + backend)
- [ ] Utilizadores não-admin não têm acesso
- [ ] Todos os logs aparecem no browser console (F12)
- [ ] Todos os logs aparecem no backend (`docker logs boards-server | tail -50`)

**💬 Feedback:**  
Testa **todos os 6 cenários** e confirma que os logs aparecem no browser E no backend. O Teste 3 é crítico!

---

## ✅ Checklist Final de Implementação

### **Backend:**
- [ ] Migração executada (`npm run db:migrate`)
- [ ] 4 labels padrão criadas na BD
- [ ] Modelo `OrganizationDefaultLabel` criado
- [ ] Query methods criados
- [ ] 6 controllers criados (list, create, update, delete, reorder, bulk-apply)
- [ ] Helper `apply-to-boards.js` criado
- [ ] Helper `boards/create-one.js` modificado (aplicação automática)
- [ ] 6 rotas adicionadas em `routes.js`
- [ ] Feature flag `PLANKA_FEATURE_ORG_DEFAULT_LABELS=true` configurado
- [ ] API responde corretamente para admin/project owner
- [ ] API retorna 403 para utilizadores normais
- [ ] Logs aparecem com `[ORG_DEFAULT_LABELS]`

### **Frontend:**
- [ ] Action types adicionados
- [ ] Actions criadas
- [ ] API client criado
- [ ] Modelo Redux ORM criado e registado em `orm.js`
- [ ] Saga criada e registada
- [ ] Componente `DefaultLabelsPane` criado
- [ ] Modals (Add, Edit, BulkApply) criados
- [ ] Estilos CSS criados
- [ ] Tab adicionada ao `AdministrationModal`
- [ ] Traduções adicionadas (pt-PT + en-US)
- [ ] Dropdown usa cores do Planka (não HEX)

### **Integração:**
- [ ] Novos boards recebem labels automaticamente
- [ ] Bulk apply funciona corretamente
- [ ] WebSocket updates funcionam
- [ ] Permissões verificadas (admin/project owner only)
- [ ] Feature pode ser desativada via flag
- [ ] Sem erros no console
- [ ] Performance aceitável

---

## 🎯 Feature Flag

**Variável de Ambiente:**
```bash
# .env ou docker-compose.yml
PLANKA_FEATURE_ORG_DEFAULT_LABELS=true
```

**Para desativar:**
```bash
PLANKA_FEATURE_ORG_DEFAULT_LABELS=false
```

Quando desativada:
- ✅ Rotas retornam 404
- ✅ Tab não aparece no modal
- ✅ Labels não são aplicadas a novos boards
- ✅ Dados na BD permanecem intactos

---

## 📊 Métricas de Implementação

| Métrica | Valor |
|---------|-------|
| **Tempo Estimado** | 5-7 horas |
| **Ficheiros Criados** | 14 (8 backend + 6 frontend) |
| **Ficheiros Modificados** | 6 |
| **Linhas de Código** | ~1200 |
| **Complexidade** | Média |
| **Risco** | Muito Baixo |

**Redução vs Plano Original:**
- Código: -40%
- Tempo: -37%
- Complexidade: Média (vs Média-Alta)

---

## 🎉 Conclusão

Este plano implementa um sistema completo e robusto de Organization Default Labels para o Planka, com:

✅ **Aplicação automática** em novos boards  
✅ **Bulk apply** para boards existentes  
✅ **UI integrada** no AdministrationModal existente  
✅ **Permissões corretas** (ADMIN + PROJECT_OWNER)  
✅ **Cores do Planka** (70+ cores pré-definidas)  
✅ **Feature flag** para fácil ativação/desativação  
✅ **Drag & drop** para reordenação  
✅ **WebSocket** para updates em tempo real  
✅ **i18n** completo (pt-PT + en-US)  

**Status:** ✅ Pronto para Implementação  
**Próximo Passo:** Executar Fase 1 (Backend - Migração)

