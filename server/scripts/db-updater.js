/*!
 * Database Updater - Atualização Segura da Base de Dados
 * Script para corrigir problemas e adicionar novas funcionalidades à base de dados
 */

const { Client } = require('pg');

async function dbUpdater() {
  const client = new Client({
    host: 'postgres', // Nome do serviço no Docker Compose
    port: 5432,
    user: 'postgres',
    password: '', // Sem password (trust authentication)
    database: 'planka'
  });

  try {
    console.log('🚀 Conectando à base de dados PostgreSQL no Docker...');
    await client.connect();
    console.log('✅ Conectado com sucesso');

    // ========================================
    // 1. CRIAR TABELA file_reference SE NÃO EXISTIR
    // ========================================
    console.log('\n📁 Verificando tabela file_reference...');
    
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'file_reference'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('   → Criando tabela file_reference...');
      
      // Criar extensão pg_trgm se não existir
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      
      // Criar sequência next_id_seq se não existir
      const seqExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.sequences 
          WHERE sequence_name = 'next_id_seq'
        );
      `);
      
      if (!seqExists.rows[0].exists) {
        await client.query(`
          CREATE SEQUENCE next_id_seq;
          CREATE OR REPLACE FUNCTION next_id(OUT id BIGINT) AS $$
            DECLARE
              shard INT := 1;
              epoch BIGINT := 1567191600000;
              sequence BIGINT;
              milliseconds BIGINT;
            BEGIN
              SELECT nextval('next_id_seq') % 1024 INTO sequence;
              SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO milliseconds;
              id := (milliseconds - epoch) << 23;
              id := id | (shard << 10);
              id := id | (sequence);
            END;
          $$ LANGUAGE PLPGSQL;
        `);
      }

      // Criar tabela file_reference
      await client.query(`
        CREATE TABLE file_reference (
          id BIGINT PRIMARY KEY DEFAULT next_id(),
          total INTEGER,
          created_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX ON file_reference (total);
      `);
      
      console.log('   ✅ Tabela file_reference criada com sucesso');
    } else {
      console.log('   ✅ Tabela file_reference já existe');
    }

    // ========================================
    // 2. CORRIGIR ATTACHMENTS ÓRFÃOS
    // ========================================
    console.log('\n🔧 Verificando attachments órfãos...');
    
    const orphanedAttachments = await client.query(`
      SELECT DISTINCT a.id, a.data->>'fileReferenceId' as file_ref_id
      FROM attachment a 
      WHERE a.type = 'file' 
      AND a.data->>'fileReferenceId' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM file_reference fr 
        WHERE fr.id = (a.data->>'fileReferenceId')::bigint
      );
    `);
    
    if (orphanedAttachments.rows.length > 0) {
      console.log(`   ⚠️  Encontrados ${orphanedAttachments.rows.length} attachments órfãos`);
      
      for (const attachment of orphanedAttachments.rows) {
        const fileRefId = attachment.file_ref_id;
        
        await client.query(`
          INSERT INTO file_reference (id, total, created_at, updated_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING;
        `, [fileRefId, 1, new Date().toISOString(), new Date().toISOString()]);
        
        console.log(`   ✅ Criado file_reference ${fileRefId} para attachment ${attachment.id}`);
      }
    } else {
      console.log('   ✅ Nenhum attachment órfão encontrado');
    }

    // ========================================
    // 3. RELATÓRIO FINAL
    // ========================================
    console.log('\n📊 Relatório Final:');
    
    const fileRefCount = await client.query('SELECT COUNT(*) as count FROM file_reference');
    const attachmentCount = await client.query("SELECT COUNT(*) as count FROM attachment WHERE type = 'file'");
    
    console.log(`   📁 file_reference: ${fileRefCount.rows[0].count} registos`);
    console.log(`   📎 attachments (file): ${attachmentCount.rows[0].count} registos`);
    
    console.log('\n🎉 Problema fileReferenceNotFound corrigido com sucesso!');
    console.log('💡 Agora podes tentar carregar o vídeo novamente.');
    
  } catch (error) {
    console.error('\n❌ Erro durante a correção:');
    console.error('   Mensagem:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  dbUpdater();
}

module.exports = { dbUpdater };
