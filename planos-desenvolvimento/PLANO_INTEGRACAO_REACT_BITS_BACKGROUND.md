# Plano de Integração: Fundo Animado LiquidEther (react-bits)

Este documento descreve os passos necessários para integrar o componente de fundo animado `LiquidEther` da biblioteca `react-bits` no Planka, permitindo que seja selecionado como um fundo de projeto.

---

## 1. Instalação do Componente (Frontend)

A integração dos componentes `react-bits` é feita através de uma CLI, que adiciona o código do componente diretamente ao nosso projeto.

### 1.1. Inicialização do `shadcn-ui`
O `react-bits` utiliza a mesma infraestrutura CLI que o `shadcn/ui`. O primeiro passo é inicializar o `shadcn` no nosso diretório do cliente.

**Ação:**
- Navegue para o diretório `planka-personalizado/client`.
- Execute o seguinte comando e siga as instruções, aceitando as opções por defeito:
  ```bash
  npx shadcn-ui@latest init
  ```

### 1.2. Adicionar o Componente `LiquidEther`
Com o `shadcn` inicializado, podemos agora adicionar o componente específico.

**Ação:**
- No mesmo diretório (`planka-personalizado/client`), execute o comando:
  ```bash
  npx shadcn-ui@latest add https://reactbits.dev/r/LiquidEther-JS-CSS
  ```
- Este comando irá criar os ficheiros do componente, provavelmente em `planka-personalizado/client/src/components/ui/`.

---

## 2. Alterações no Backend

Para que a seleção do fundo seja persistente, precisamos de uma pequena alteração na base de dados.

### 2.1. Modificar o Modelo do Projeto
**Ficheiro a modificar:** `planka-personalizado/server/api/models/Project.js`

**Ação:**
- Adicionar um novo atributo `backgroundAnimated: { type: 'string' }` ao modelo. Isto irá criar uma nova coluna na tabela de projetos para guardar o identificador do fundo animado selecionado (ex: `'liquidEther'`).

---

## 3. Alterações no Frontend

Agora, vamos integrar o componente na interface e lógica do Planka.

### 3.1. Adicionar Novo Tipo de Fundo
**Ficheiro a modificar:** `planka-personalizado/client/src/constants/Enums.js`

**Ação:**
- Adicionar `ANIMATED: 'animated'` ao objeto `ProjectBackgroundTypes`.

### 3.2. Criar Componente de Seleção e Lógica de Atualização
Vamos criar o componente que mostra a opção "Liquid Ether" no painel de configurações.

**Ação:**
- Criar um novo ficheiro: `planka-personalizado/client/src/components/projects/ProjectSettingsModal/BackgroundPane/Animated/Animated.jsx`.
- **Lógica do Componente:**
  - Renderizar uma miniatura e o nome do fundo `LiquidEther`.
  - Ao ser clicado, deve fazer o dispatch da ação para atualizar o projeto, enviando os novos dados para o backend:
    ```javascript
    dispatch(entryActions.updateCurrentProject({
      backgroundType: ProjectBackgroundTypes.ANIMATED,
      backgroundAnimated: 'liquidEther', 
    }));
    ```

### 3.3. Integrar no Painel de Seleção
Vamos adicionar o botão "Animado" ao seletor de tipos de fundo.

**Ficheiro a modificar:** `planka-personalizado/client/src/components/projects/ProjectSettingsModal/BackgroundPane/BackgroundPane.jsx`

**Ações:**
1.  Importar o novo tipo `ProjectBackgroundTypes.ANIMATED` e o novo componente `Animated`.
2.  Adicionar `ANIMATED` ao array de tipos no `Button.Group`.
3.  Adicionar uma nova entrada ao objeto `TITLE_BY_TYPE` para o novo tipo (ex: `[ProjectBackgroundTypes.ANIMATED]: 'common.animated'`).
4.  Adicionar a renderização condicional para o componente `Animated`:
    ```jsx
    {activeType === ProjectBackgroundTypes.ANIMATED && <Animated />}
    ```

### 3.4. Implementar a Exibição do Fundo Animado
Finalmente, vamos modificar o componente que renderiza o fundo do projeto.

**Ficheiro a modificar:** `planka-personalizado/client/src/components/projects/ProjectBackground/ProjectBackground.jsx`

**Ações:**
1.  Importar o componente `LiquidEther` (ex: `import LiquidEther from '../../ui/LiquidEther'`).
2.  Obter o novo valor `backgroundAnimated` do estado do projeto (via `useSelector`).
3.  Adicionar uma renderização condicional no início do componente: se o `backgroundType` for `ANIMATED`, renderize o componente `<LiquidEther />` e interrompa a execução do resto do componente.
    ```jsx
    // ... imports

    const ProjectBackground = React.memo(() => {
      // ... hooks e selectors
      const { backgroundType, backgroundAnimated } = useSelector(selectors.selectCurrentProject);

      if (backgroundType === ProjectBackgroundTypes.ANIMATED) {
        if (backgroundAnimated === 'liquidEther') {
          return <LiquidEther />;
        }
        return <div className={styles.wrapper} />; // Fallback para outros fundos animados
      }
      
      // Lógica existente para GRADIENT e IMAGE (não será executada se o tipo for ANIMATED)
      return (
        <div ... />
      );
    });
    ```

---

## 4. Considerações Adicionais

- **Performance:** Fundos animados podem consumir mais recursos. Testar o impacto na performance.
- **Traduções:** Adicionar a chave `common.animated` aos ficheiros de localização em `planka-personalizado/client/src/locales/`.
