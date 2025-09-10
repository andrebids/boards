# Plano de Integração de Notificações com Apprise (Versão Revista)

Este documento descreve o processo de investigação e ajuste do sistema de notificações existente no Planka, que utiliza o Apprise.

## Fases do Projeto

### 1. Investigação do Sistema Existente (Concluído)

-   **Análise do Frontend**: Identificação do componente React `NotificationServices.jsx` como a interface para configurar os serviços de notificação.
-   **Rastreamento da API**: Mapeamento do fluxo desde a interface do utilizador, passando pelas ações Redux e sagas, até à chamada da API do backend (`POST /api/users/:userId/notification-services`).
-   **Análise do Backend**: Descoberta do fluxo no backend, desde o `controller` (`notification-services/create-in-user.js`), passando por vários `helpers`, até ao `helper` final `utils/send-notifications.js` que executa o script Python `utils/send_notifications.py` para enviar as notificações via Apprise.

### 2. Centralização e Refatoração (Concluído)

-   **Centralização da Lógica**: A lógica de envio de notificações para eventos foi centralizada no `helper` `actions/create-one.js`.
-   **Remoção de Duplicação**: O código duplicado para envio de notificações no `helper` de criação de comentários foi removido.

### 3. Expansão dos Gatilhos de Notificação (Concluído)

-   **Identificação de Novos Eventos**: Foram adicionados múltiplos tipos de ações (como criação de cartões, adição de membros, etc.) à lista de eventos que despoletam notificações externas (`EXTERNAL_NOTIFIABLE_TYPES` no modelo `Action.js`).

### 4. Ajuste Fino dos Gatilhos (A Fazer)

-   **Modificar `EXTERNAL_NOTIFIABLE_TYPES`**: Com base no feedback, a lista de eventos será ajustada:
    -   **Adicionar**: `COMPLETE_TASK`
    -   **Remover**: `COMMENT_DELETE`

## Guia de Configuração de Notificações por E-mail

Esta secção serve como um guia para configurar o envio de notificações por e-mail através da interface do Apprise no Planka.

### Como funciona?

O Planka utiliza o Apprise para enviar notificações, o que permite uma grande flexibilidade. Para e-mails, isto é feito através da construção de uma URL especial no formato `mailto://`.

**Aviso de Segurança**: Este método implica colocar a sua password ou uma chave de acesso diretamente na URL de configuração. Tenha a certeza de que compreende os riscos de segurança associados, especialmente se a sua instância do Planka for partilhada. Para serviços como o Gmail, é altamente recomendável o uso de "App Passwords".

### Passos para a Configuração no Frontend

1.  **Construa a sua URL `mailto`**: A estrutura geral da URL é a seguinte:
    `mailto://<utilizador>:<password>@<servidor_smtp>:<porta>`

    -   `<utilizador>`: O seu endereço de e-mail ou nome de utilizador do servidor de e-mail.
    -   `<password>`: A sua password ou uma "App Password" gerada.
    -   `<servidor_smtp>`: O endereço do seu servidor de SMTP (ex: `smtp.gmail.com`).
    -   `<porta>`: A porta do servidor de SMTP (ex: `587` para TLS ou `465` para SSL).

2.  **Exemplo (Gmail)**:
    -   **Utilizador**: `omeuemail@gmail.com`
    -   **Password**: `abracadabra1234` (use uma App Password aqui!)
    -   **Servidor**: `smtp.gmail.com`
    -   **Porta**: `587`
    -   **URL Resultante**: `mailto://omeuemail@gmail.com:abracadabra1234@smtp.gmail.com:587`

3.  **Insira no Planka**:
    -   Navegue até ao ecrã de configuração de notificações (nas configurações de utilizador ou do quadro).
    -   No campo de texto que diz `service://hostname/token`, cole a sua URL `mailto` completa.
    -   Na caixa de seleção `dropdown`, escolha o formato de e-mail que deseja receber (`html` ou `markdown` são recomendados).
    -   Clique no botão `+` para adicionar o serviço.

Após estes passos, o serviço de notificação por e-mail estará configurado para receber atualizações com base nos eventos definidos na aplicação.

## Acompanhamento

O progresso será acompanhado através da lista de tarefas no chat do Cursor.
