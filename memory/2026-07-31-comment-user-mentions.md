# Menções de utilizadores nos comentários

## Sintoma

Ao escrever `@` no novo editor de comentários, era inserido apenas texto normal e não apareciam sugestões de utilizadores.

## Causa

A migração do campo de novo comentário de `react-mentions` para o `MarkdownEditor` removeu a ligação aos membros do quadro. O editor Gravity não tinha uma extensão de menções nem autocomplete configurado, embora o servidor continuasse a reconhecer apenas a sintaxe `@[nome](userId)`.

## Correção

- O compositor de comentários volta a fornecer os utilizadores do quadro ao editor.
- O modo visual ganhou autocomplete por `@`, pesquisa por username ou nome, navegação por teclado e seleção por clique.
- A menção é um nó atómico no editor e serializa para `@[nome](userId)`, preservando as notificações existentes.
- O modo markup ganhou autocomplete equivalente com a mesma sintaxe.

## Evidência

- No ambiente local com hot reload, `@` abriu os quatro utilizadores do quadro.
- A pesquisa `@so` filtrou para Sofia Martins e o clique inseriu um chip com o ID `1830428022247785930`, mantendo o editor aberto.
- A seleção por teclado com setas e Enter também inseriu corretamente o chip.
- O teste de regressão de filtragem e sintaxe passou com 2 testes.
- O lint direcionado passou nos ficheiros novos e alterados; no `MarkdownEditor.jsx`, a regra de Prettier foi desativada apenas na verificação para preservar a formatação já existente no worktree.

## Estado

DONE
