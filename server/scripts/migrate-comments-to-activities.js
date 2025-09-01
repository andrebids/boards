/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const migrateCommentsToActivities = async () => {
  console.log('🔄 Iniciando migração de comentários para atividades');
  
  try {
    const comments = await Comment.findAll({
      include: [
        { model: Card, include: [{ model: Board }] },
        { model: User }
      ]
    });
    
    console.log(`📊 Encontrados ${comments.length} comentários para migrar`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const comment of comments) {
      try {
        // Verificar se já existe atividade para este comentário
        const existingActivity = await Action.findOne({
          where: {
            type: 'commentCreate',
            'data.commentId': comment.id
          }
        });
        
        if (!existingActivity) {
          // Extrair menções do texto do comentário
          const extractMentions = (text) => {
            const mentionRegex = /@(\w+)/g;
            const matches = text.match(mentionRegex) || [];
            return matches.map(match => match.substring(1));
          };
          
          // Determinar se é resposta a outro comentário
          const isReplyToComment = (text) => {
            return text.includes('@') && text.length > 0;
          };
          
          // Criar dados da atividade
          const activityData = {
            commentId: comment.id,
            commentText: comment.text.substring(0, 150), // Limitar a 150 chars
            cardName: comment.Card.name,
            cardId: comment.cardId,
            mentions: extractMentions(comment.text),
            isReply: isReplyToComment(comment.text),
            action: 'create'
          };
          
          // Criar atividade
          await Action.create({
            type: 'commentCreate',
            data: activityData,
            boardId: comment.Card.Board.id,
            cardId: comment.cardId,
            userId: comment.userId,
            createdAt: comment.createdAt
          });
          
          migrated++;
          console.log(`✅ Migrado comentário ${comment.id} (${migrated}/${comments.length})`);
        } else {
          skipped++;
          console.log(`⏭️ Comentário ${comment.id} já tem atividade, pulando`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Erro ao migrar comentário ${comment.id}:`, error.message);
      }
    }
    
    console.log('🎉 Migração concluída:', {
      total: comments.length,
      migrated,
      skipped,
      errors
    });
    
    return {
      total: comments.length,
      migrated,
      skipped,
      errors
    };
    
  } catch (error) {
    console.error('❌ Erro geral na migração:', error);
    throw error;
  }
};

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateCommentsToActivities()
    .then((result) => {
      console.log('✅ Migração finalizada com sucesso:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migração falhou:', error);
      process.exit(1);
    });
}

module.exports = migrateCommentsToActivities;
