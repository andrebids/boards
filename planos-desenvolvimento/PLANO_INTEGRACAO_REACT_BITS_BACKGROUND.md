# Plano de Integração: Fundo Animado LiquidEther (react-bits)

Este documento descreve os passos necessários para integrar o componente de fundo animado `LiquidEther` da biblioteca `react-bits` no Planka, permitindo que seja selecionado como um fundo de projeto.

## 1. Instalação do Componente

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
- Este comando irá criar os ficheiros do componente (provavelmente em `planka-personalizado/client/src/components/ui/` ou similar).

## 2. Lógica de Integração no Planka

Agora que o componente faz parte do nosso código, precisamos de o integrar na lógica de seleção e exibição de fundos do Planka.

### 2.1. Adicionar Novo Tipo de Fundo

Precisamos de um novo tipo para representar os fundos animados.

**Ficheiro a modificar:** `planka-personalizado/client/src/constants/Enums.js`

**Ação:**
- Adicionar `ANIMATED: 'animated'` ao objeto `ProjectBackgroundTypes`.

### 2.2. Criar Componente de Seleção para Fundos Animados

Vamos criar um novo componente que irá apresentar a opção `LiquidEther` (e futuras opções animadas) no painel de configurações.

**Ação:**
- Criar um novo ficheiro: `planka-personalizado/client/src/components/projects/ProjectSettingsModal/BackgroundPane/Animated/Animated.jsx`.
- Este componente irá renderizar a miniatura e o nome do fundo `LiquidEther`. Ao ser clicado, deverá fazer o dispatch de uma ação para atualizar o projeto com o `backgroundType: 'animated'` e um identificador para o fundo específico, por exemplo, `backgroundAnimated: 'liquidEther'`.

### 2.3. Integrar no Painel de Seleção

Agora, vamos adicionar a opção "Animado" ao seletor de tipos de fundo.

**Ficheiro a modificar:** `planka-personalizado/client/src/components/projects/ProjectSettingsModal/BackgroundPane/BackgroundPane.jsx`

**Ações:**
1.  Importar o novo tipo `ProjectBackgroundTypes.ANIMATED` e o novo componente `Animated`.
2.  Adicionar o `ANIMATED` ao array de tipos no `Button.Group`.
3.  Adicionar uma nova entrada ao objeto `TITLE_BY_TYPE` para o novo tipo (ex: `[ProjectBackgroundTypes.ANIMATED]: 'common.animated'`). Será necessário também adicionar esta tradução nos ficheiros de internacionalização.
4.  Adicionar a renderização condicional para o componente `Animated`:
    ```jsx
    {activeType === ProjectBackgroundTypes.ANIMATED && <Animated />}
    ```

### 2.4. Implementar a Exibição do Fundo Animado

Finalmente, vamos modificar o componente principal que renderiza o fundo para que ele mostre o componente `LiquidEther` quando este estiver selecionado.

**Ficheiro a modificar:** `planka-personalizado/client/src/components/projects/ProjectBackground/ProjectBackground.jsx`

**Ações:**
1.  Importar o componente `LiquidEther` adicionado pelo CLI.
2.  Na lógica do componente, obter o novo valor `backgroundAnimated` do estado do projeto (via `useSelector`).
3.  Adicionar uma renderização condicional:
    - Se `backgroundType` for `ProjectBackgroundTypes.ANIMATED` e `backgroundAnimated` for `'liquidEther'`, renderize o componente `<LiquidEther />`.
    - Caso contrário, mantenha a lógica existente para gradientes e imagens.

    A estrutura pode parecer-se com isto:

    ```jsx
    // ... imports
    import LiquidEther from '../../ui/LiquidEther'; // O caminho pode variar

    const ProjectBackground = React.memo(() => {
      // ... hooks e selectors existentes
      const { ..., backgroundType, backgroundAnimated } = useSelector(selectors.selectCurrentProject);

      if (backgroundType === ProjectBackgroundTypes.ANIMATED) {
        if (backgroundAnimated === 'liquidEther') {
          return <LiquidEther />;
        }
        // Poderíamos ter um retorno padrão para outros fundos animados aqui
        return <div className={styles.wrapper} />;
      }
      
      // Lógica existente para GRADIENT e IMAGE
      return (
        <div
          className={...}
          style={...}
        />
      );
    });
    ```
## 3. Considerações Adicionais

- **Performance:** Fundos animados podem consumir mais recursos. Deve ser testado o impacto na performance, especialmente em sistemas menos potentes.
- **Traduções:** Adicionar as novas chaves de tradução (ex: `common.animated`) aos ficheiros de localização em `planka-personalizado/client/src/locales/`.
