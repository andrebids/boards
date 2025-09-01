# 🧪 Guia de Testes: Compatibilidade Sharp + FFmpeg

## 📋 **Objetivo**
Testar se Sharp e FFmpeg funcionam juntos sem conflitos no ambiente Planka.

---

## 🚀 **FASE 1: TESTES LOCAIS (Desenvolvimento)**

### **1.1 Preparar Ambiente**
```bash
# Navegar para o diretório do servidor
cd boards/server

# Verificar versão atual do Sharp
npm list sharp

# Verificar se fluent-ffmpeg já está instalado
npm list fluent-ffmpeg
```

### **1.2 Instalar fluent-ffmpeg (Se necessário)**
```bash
# Instalar fluent-ffmpeg
npm install fluent-ffmpeg --save

# Verificar instalação
npm list fluent-ffmpeg
```

### **1.3 Verificar FFmpeg no Sistema**
```bash
# Verificar se FFmpeg está instalado
ffmpeg -version

# Verificar se ffprobe está disponível
ffprobe -version

# Se não estiver instalado (Windows):
# Baixar de: https://ffmpeg.org/download.html

# Se não estiver instalado (macOS):
brew install ffmpeg

# Se não estiver instalado (Ubuntu/Debian):
sudo apt update && sudo apt install ffmpeg
```

### **1.4 Executar Script de Teste**
```bash
# Navegar para o diretório raiz
cd boards

# Executar teste básico
node test-sharp-ffmpeg-compatibility.js

# Executar teste com vídeo específico
node test-sharp-ffmpeg-compatibility.js /path/to/video.mp4
```

### **1.5 Interpretar Resultados**
```bash
# Resultado esperado:
✅ Sharp carregado com sucesso
✅ fluent-ffmpeg carregado com sucesso
✅ FFmpeg encontrado no sistema
✅ ffprobe encontrado no sistema
✅ Integração Sharp + FFmpeg funcionando perfeitamente!
```

---

## 🐳 **FASE 2: TESTES DOCKER**

### **2.1 Testar Build Atual (Baseline)**
```bash
# Navegar para o diretório raiz
cd boards

# Build atual (sem FFmpeg)
docker build -t planka-baseline .

# Verificar se Sharp funciona
docker run --rm planka-baseline node -e "
const sharp = require('sharp');
console.log('Sharp OK:', !!sharp.versions);
"
```

### **2.2 Testar Instalação FFmpeg**
```bash
# Testar se FFmpeg pode ser instalado
docker run --rm node:18-alpine sh -c "
apk add ffmpeg --no-cache
ffmpeg -version
ffprobe -version
"
```

### **2.3 Testar Sharp + FFmpeg Juntos**
```bash
# Testar compatibilidade
docker run --rm node:18-alpine sh -c "
apk add ffmpeg --no-cache
npm install sharp fluent-ffmpeg
node -e \"
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
console.log('Sharp OK:', !!sharp.versions);
console.log('FFmpeg OK:', !!ffmpeg);
\"
"
```

### **2.4 Testar Build com FFmpeg**
```bash
# Criar Dockerfile temporário para teste
cat > Dockerfile.test << 'EOF'
FROM node:18-alpine

RUN apk add ffmpeg --no-cache

WORKDIR /app

COPY server/package.json ./
RUN npm install

COPY test-sharp-ffmpeg-compatibility.js ./

CMD ["node", "test-sharp-ffmpeg-compatibility.js"]
EOF

# Build e teste
docker build -f Dockerfile.test -t planka-ffmpeg-test .

# Executar teste
docker run --rm planka-ffmpeg-test
```

---

## 🔧 **FASE 3: TESTES DE INTEGRAÇÃO**

### **3.1 Testar Helper de Vídeo**
```bash
# Criar arquivo de teste para o helper
cat > test-video-helper.js << 'EOF'
const generateVideoThumbnails = require('./server/api/helpers/attachments/video-thumbnail-generator');

async function testHelper() {
  try {
    const result = await generateVideoThumbnails({
      videoPath: 'test-video.mp4',
      outputDir: './test-output',
      filename: 'test.mp4'
    });

    console.log('✅ Helper funcionando:', result);
  } catch (error) {
    console.error('❌ Erro no helper:', error.message);
  }
}

testHelper();
EOF

# Executar teste
node test-video-helper.js
```

### **3.2 Testar Processamento de Upload**
```bash
# Criar teste de upload simulado
cat > test-upload-processing.js << 'EOF'
const processUploadedFile = require('./server/api/helpers/attachments/process-uploaded-file');

async function testUpload() {
  try {
    const result = await processUploadedFile({
      file: {
        fd: 'test-video.mp4',
        filename: 'test.mp4',
        type: 'video/mp4',
        size: 1024000
      }
    });

    console.log('✅ Upload processado:', result);
  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
  }
}

testUpload();
EOF

# Executar teste
node test-upload-processing.js
```

---

## 🧪 **FASE 4: TESTES DE PERFORMANCE**

### **4.1 Testar Memória**
```bash
# Monitorar uso de memória durante processamento
node -e "
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

console.log('Memória inicial:', process.memoryUsage());

// Simular processamento
sharp('test-image.jpg')
  .resize(360, 360)
  .toBuffer()
  .then(() => {
    console.log('Memória após Sharp:', process.memoryUsage());

    ffmpeg('test-video.mp4')
      .screenshots({
        timestamps: ['00:00:01'],
        filename: 'test-frame.png'
      })
      .on('end', () => {
        console.log('Memória após FFmpeg:', process.memoryUsage());
      });
  });
"
```

### **4.2 Testar Concorrência**
```bash
# Testar múltiplos processamentos simultâneos
node -e "
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

async function processVideo(i) {
  console.log('Processando vídeo', i);

  // Simular processamento
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Vídeo', i, 'processado');
}

// Processar 3 vídeos simultaneamente
Promise.all([
  processVideo(1),
  processVideo(2),
  processVideo(3)
]).then(() => {
  console.log('Todos os vídeos processados');
});
"
```

---

## 🚨 **FASE 5: TESTES DE FALHA**

### **5.1 Testar Sem FFmpeg**
```bash
# Remover FFmpeg temporariamente
docker run --rm node:18-alpine sh -c "
npm install sharp fluent-ffmpeg
node -e \"
const ffmpeg = require('fluent-ffmpeg');
ffmpeg('test-video.mp4')
  .screenshots({ timestamps: ['00:00:01'] })
  .on('error', (err) => console.log('Erro esperado:', err.message));
\"
"
```

### **5.2 Testar Sem Sharp**
```bash
# Testar se o sistema funciona sem Sharp
docker run --rm node:18-alpine sh -c "
apk add ffmpeg --no-cache
npm install fluent-ffmpeg
node -e \"
const ffmpeg = require('fluent-ffmpeg');
ffmpeg('test-video.mp4')
  .screenshots({ timestamps: ['00:00:01'] })
  .on('end', () => console.log('FFmpeg funciona sem Sharp'));
\"
"
```

### **5.3 Testar Arquivos Corrompidos**
```bash
# Criar arquivo corrompido
echo "fake video data" > fake-video.mp4

# Testar processamento
node test-sharp-ffmpeg-compatibility.js fake-video.mp4
```

---

## 📊 **FASE 6: ANÁLISE DE RESULTADOS**

### **6.1 Checklist de Sucesso**
- [ ] ✅ Sharp carrega sem erros
- [ ] ✅ fluent-ffmpeg carrega sem erros
- [ ] ✅ FFmpeg está no PATH do sistema
- [ ] ✅ ffprobe está disponível
- [ ] ✅ Integração Sharp + FFmpeg funciona
- [ ] ✅ Processamento de vídeo real funciona
- [ ] ✅ Thumbnails são gerados corretamente
- [ ] ✅ Memória não vaza durante processamento
- [ ] ✅ Múltiplos processamentos simultâneos funcionam
- [ ] ✅ Sistema falha graciosamente sem FFmpeg

### **6.2 Métricas de Performance**
```bash
# Tempo de processamento
time node test-sharp-ffmpeg-compatibility.js test-video.mp4

# Uso de memória
node -e "
const memUsage = process.memoryUsage();
console.log('RSS:', Math.round(memUsage.rss / 1024 / 1024), 'MB');
console.log('Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
"

# Tamanho dos thumbnails gerados
ls -la test-thumbnail-*.png
```

---

## 🔄 **FASE 7: ROLLBACK E RECUPERAÇÃO**

### **7.1 Procedimento de Rollback**
```bash
# Se algo der errado, desinstalar fluent-ffmpeg
cd boards/server
npm uninstall fluent-ffmpeg

# Remover FFmpeg do Dockerfile
# Editar Dockerfile e remover a linha: && apk add ffmpeg --no-cache

# Rebuild sem FFmpeg
docker build -t planka-rollback .

# Verificar se Sharp ainda funciona
docker run --rm planka-rollback node -e "
const sharp = require('sharp');
console.log('Sharp OK:', !!sharp.versions);
"
```

### **7.2 Verificação Pós-Rollback**
```bash
# Testar funcionalidades existentes
docker run --rm planka-rollback node -e "
const sharp = require('sharp');
console.log('Sharp version:', sharp.versions);

// Testar processamento de imagem
sharp('test-image.jpg')
  .resize(360, 360)
  .toBuffer()
  .then(() => console.log('Processamento de imagem OK'))
  .catch(err => console.error('Erro:', err.message));
"
```

---

## 📝 **RELATÓRIO DE TESTES**

### **Template de Relatório**
```markdown
# Relatório de Testes: Sharp + FFmpeg

## Data: [DATA]
## Ambiente: [LOCAL/DOCKER]
## Versões: Node.js [VERSÃO], Sharp [VERSÃO], FFmpeg [VERSÃO]

## Resultados:
- [ ] Sharp: ✅/❌
- [ ] fluent-ffmpeg: ✅/❌
- [ ] FFmpeg sistema: ✅/❌
- [ ] Integração: ✅/❌
- [ ] Performance: ✅/❌
- [ ] Concorrência: ✅/❌

## Problemas Encontrados:
[LISTAR PROBLEMAS]

## Soluções Aplicadas:
[LISTAR SOLUÇÕES]

## Recomendação:
[PROSSEGUIR/AGUARDAR/ROLLBACK]
```

---

## 🎯 **CRITÉRIOS DE APROVAÇÃO**

### **Mínimos para Prosseguir:**
1. ✅ Sharp funciona isoladamente
2. ✅ fluent-ffmpeg carrega sem erros
3. ✅ FFmpeg está disponível no sistema
4. ✅ Integração básica Sharp + FFmpeg funciona
5. ✅ Thumbnails são gerados corretamente

### **Ideais para Produção:**
1. ✅ Todos os testes de performance passam
2. ✅ Concorrência funciona sem problemas
3. ✅ Rollback funciona corretamente
4. ✅ Sistema falha graciosamente
5. ✅ Documentação completa

---

**📅 Timeline de Testes:** 1-2 dias
**👥 Recursos:** 1 desenvolvedor
**🔧 Ferramentas:** Script de teste, Docker, arquivos de vídeo de teste

**🚨 IMPORTANTE:** Execute todos os testes antes de prosseguir com a implementação. Se algum teste crítico falhar, corrija o problema antes de continuar.
