# Debug report: deteção automática de idioma

- **Sintoma:** utilizadores franceses foram criados com `pt-PT` e a opção “Detetar automaticamente” continuava a resolver para português.
- **Causa raiz:** o formulário de criação pré-selecionava e persistia `pt-PT`; em paralelo, `i18n.detectLanguage()` colocava `pt-PT` antes dos idiomas devolvidos pelo browser.
- **Correção:** a deteção usa agora diretamente a ordem devolvida pelo browser e mantém `pt-PT` apenas como fallback. O formulário de criação deixou de pré-selecionar um idioma e exige uma escolha explícita para o primeiro email.
- **Evidência:** os módulos alterados e `/api/config` respondem com HTTP 200 através do servidor de hot reload. Os cinco testes direcionados passam.
- **Testes de regressão:** `client/src/utils/language-detection.test.js` e `client/src/reducers/ui/user-create-form.test.js`.
- **Relacionado:** um domínio genérico como `.com` não fornece um país fiável; o idioma do email de boas-vindas tem de ser escolhido antes de o browser do destinatário estar disponível.
- **Limitações conhecidas:** a suite completa tem 66 testes a passar e um ficheiro de teste antigo que não é transformado por falta de preset JSX. O lint integral de `i18n.js` contém problemas anteriores a esta correção. A validação visual foi bloqueada pela política de URLs do navegador integrado.
- **Estado:** DONE_WITH_CONCERNS
