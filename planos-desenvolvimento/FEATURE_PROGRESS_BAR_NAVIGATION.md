# 🚀 Plano de Desenvolvimento: Barra de Navegação com Progresso

## 🎯 Visão Geral

**Objetivo:** Implementar uma barra de progresso personalizável sob o nome de cada quadro (board) na barra de navegação. Esta funcionalidade permitirá aos utilizadores visualizar rapidamente o andamento de cada quadro. A percentagem de progresso será definida manualmente pelos utilizadores nas configurações do quadro.

**Contexto Técnico:**
*   **Entidade Alvo:** Quadros (`Boards`).
*   **Localização na UI:** Abaixo do título de cada quadro, na barra de navegação dos quadros.
*   **Permissões:** A configuração será visível e editável apenas para utilizadores com perfil de **Administrador** ou **Editor**.
*   **Tecnologias:**
    *   **UI:** React com componentes da biblioteca **Semantic UI**.
    *   **Atualizações em Tempo Real:** **WebSockets** para propagar as alterações instantaneamente.

---

## 📝 Fases de Implementação

### Fase 1: Backend e Modelo de Dados

1.  **Modelo de Dados `Board`:**
    *   **Ação:** Localizar e modificar o modelo de dados do `Board` (provavelmente em `server/models/board.js`).
    *   **Alteração:** Adicionar dois novos campos à tabela `Boards`:
        *   `isProgressBarEnabled` (Tipo: `BOOLEAN`, Valor Padrão: `false`)
        *   `progressBarPercentage` (Tipo: `INTEGER`, Valor Padrão: `0`)
    *   **Validação:** Implementar validação no modelo para garantir que `progressBarPercentage` se mantenha sempre no intervalo de 0 a 100.

2.  **API e Permissões:**
    *   **Ação:** Encontrar e atualizar o endpoint de edição de quadros (provavelmente `PUT /api/boards/:id`).
    *   **Alteração:**
        *   Permitir que o endpoint receba e atualize os novos campos (`isProgressBarEnabled` e `progressBarPercentage`).
        *   Implementar uma verificação de permissão no *policy* correspondente para garantir que apenas Admins e Editores possam modificar estes campos.
    *   **Garantia:** Assegurar que os endpoints que listam os quadros (ex: `GET /api/projects/:id/boards`) retornem os novos campos na resposta.

3.  **Atualizações em Tempo Real (WebSockets):**
    *   **Ação:** Integrar com o serviço de WebSocket existente do Sails.js.
    *   **Alteração:** Após a atualização bem-sucedida de um quadro através da API, disparar um evento WebSocket (ex: `board:update`) para todos os clientes subscritos àquele projeto, enviando os dados atualizados do quadro.

---

### Fase 2: Frontend - Lógica e Estado (Redux)

1.  **Gestão de Estado:**
    *   **Ação:** Modificar o *reducer* e as *actions* relacionadas aos quadros (provavelmente em `client/src/sagas/`).
    *   **Alteração:** Adicionar as propriedades `isProgressBarEnabled` e `progressBarPercentage` ao estado de cada quadro no Redux store.
    *   **Sagas/Thunks:** Criar a lógica para chamar o endpoint da API de atualização do quadro, processar a resposta e atualizar o estado no Redux.

2.  **Receptor de WebSocket:**
    *   **Ação:** Localizar e atualizar o cliente WebSocket da aplicação.
    *   **Alteração:** Implementar um *listener* para o evento `board:update`. Ao receber este evento, a aplicação deverá atualizar o estado do quadro correspondente no Redux store, garantindo que a UI se atualize automaticamente sem necessidade de recarregar a página.

---

### Fase 3: Frontend - Componentes de UI (React & Semantic UI)

1.  **Barra de Navegação de Quadros:**
    *   **Ação:** Localizar o componente React que renderiza a lista de abas dos quadros (ex: `BoardTabs.jsx`).
    *   **Alteração:** Dentro do *loop* (`.map()`) que renderiza cada aba de quadro, adicionar uma lógica condicional: se `board.isProgressBarEnabled` for `true`, renderizar o novo componente `ProgressBar` por baixo do título do quadro.

2.  **Componente `ProgressBar` (Novo):**
    *   **Ação:** Criar um novo componente reutilizável (`client/src/components/common/ProgressBar.jsx`).
    *   **Funcionalidade:**
        *   Receberá as propriedades `percentage` e `color`.
        *   Utilizará o componente `Progress` do Semantic UI para renderizar uma barra com largura fixa. A cor será baseada na `color` recebida.
        *   Exibirá o valor da `percentage` como texto, alinhado à direita da barra, com um estilo visual subtil (fonte mais pequena e cor secundária).

3.  **Modal de Configurações do Quadro:**
    *   **Ação:** Localizar o modal onde as configurações de um quadro são editadas.
    *   **Alteração:** Adicionar uma nova secção neste modal, visível apenas para Admins/Editores:
        *   **Toggle:** Um componente `Checkbox` ou `Toggle` do Semantic UI com o rótulo "Mostrar barra de progresso".
        *   **Input Numérico:** Um componente `Input` do Semantic UI (com `type="number"`, `min="0"`, `max="100"`) para o utilizador definir a percentagem.
        *   **Lógica:** Vincular estes controlos ao estado local do componente e, ao guardar, chamar a *action* do Redux para persistir as alterações.

---

### Fase 4: Estilização e Design

1.  **Cores e Estilo:**
    *   **Ação:** Investigar como o estilo dos quadros (`list-color-*`) é definido atualmente para determinar a cor a ser passada para o componente `ProgressBar`.
    *   **Implementação:** A cor da barra de progresso (`color` prop do `Progress` do Semantic UI) deve derivar dinamicamente do tema/cor do próprio quadro para garantir consistência visual e bom contraste.
    *   **CSS:** Criar um novo ficheiro CSS Module (`ProgressBar.module.scss`) para estilizar o novo componente, garantindo que o alinhamento e o espaçamento sejam consistentes e visualmente agradáveis, independentemente do comprimento do nome do quadro.

---

## 🧪 Plano de Testes

1.  **Backend:**
    *   Testar o endpoint de atualização do quadro com e sem permissões adequadas.
    *   Verificar se os dados são corretamente guardados na base de dados.
    *   Confirmar que o evento WebSocket é emitido com os dados corretos.
2.  **Frontend:**
    *   Testar a exibição condicional da barra de progresso na navegação.
    *   Validar a atualização da UI em tempo real quando outro utilizador altera a percentagem.
    *   Testar os controlos no modal de configurações (toggle e input).
    *   Verificar a consistência visual em diferentes temas de quadros e comprimentos de título.
