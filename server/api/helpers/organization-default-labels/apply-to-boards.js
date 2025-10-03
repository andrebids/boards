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

    // Buscar BOARDS do projeto (labels pertencem a boards, não projects)
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

