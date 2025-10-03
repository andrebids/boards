/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const MAX_PROJECTS_PER_BULK = 100; // Limite de projetos por operação em massa

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  TOO_MANY_PROJECTS: {
    tooManyProjects: 'Too many projects in bulk operation',
  },
  INVALID_PROJECT_IDS: {
    invalidProjectIds: 'Invalid project IDs provided',
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
    tooManyProjects: {
      responseType: 'badRequest',
    },
    invalidProjectIds: {
      responseType: 'badRequest',
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

    // Validar número de projetos
    if (inputs.projectIds.length > MAX_PROJECTS_PER_BULK) {
      console.log(`🔴 [CONTROLLER] Demasiados projetos: ${inputs.projectIds.length} (máx: ${MAX_PROJECTS_PER_BULK})`);
      throw Errors.TOO_MANY_PROJECTS;
    }

    // Validar que os IDs são únicos
    const uniqueIds = [...new Set(inputs.projectIds)];
    if (uniqueIds.length !== inputs.projectIds.length) {
      console.log('🔴 [CONTROLLER] IDs de projetos duplicados');
      throw Errors.INVALID_PROJECT_IDS;
    }

    // Verificar se os projetos existem e se o utilizador tem acesso
    const projects = await Project.find({ id: uniqueIds });
    if (projects.length !== uniqueIds.length) {
      console.log(`🔴 [CONTROLLER] Alguns projetos não existem ou sem acesso (${projects.length}/${uniqueIds.length})`);
      throw Errors.INVALID_PROJECT_IDS;
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
    
    // Auditoria: registar aplicação em massa
    sails.log.warn(`[AUDIT] User ${currentUser.email} (${currentUser.id}) bulk applied default labels to ${results.length} projects (${results.filter(r => r.success).length} successful)`);
    
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

