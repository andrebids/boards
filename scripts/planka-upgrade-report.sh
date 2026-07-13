#!/usr/bin/env bash

# Shows the scope of an upstream Planka update. It never changes source files,
# creates branches, or runs migrations.
# Usage: ./scripts/planka-upgrade-report.sh [base-ref] [target-ref]
set -Eeuo pipefail

base_ref="${1:-main}"
target_ref="${2:-upstream/master}"
max_items="${UPGRADE_REPORT_MAX_ITEMS:-100}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Execute este script dentro do repositório Git." >&2
  exit 1
fi

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "Não existe o remoto 'upstream'. Adicione-o com:" >&2
  echo "  git remote add upstream https://github.com/plankanban/planka.git" >&2
  exit 1
fi

echo "A atualizar a referência oficial do Planka..."
git fetch --no-tags upstream master

for ref in "$base_ref" "$target_ref"; do
  if ! git rev-parse --verify --quiet "$ref^{commit}" >/dev/null; then
    echo "Referência Git inválida: $ref" >&2
    exit 1
  fi
done

echo
echo "Base:   $(git rev-parse --short "$base_ref") ($(git describe --tags --always "$base_ref"))"
echo "Destino: $(git rev-parse --short "$target_ref") ($(git describe --tags --always "$target_ref"))"
merge_base="$(git merge-base "$base_ref" "$target_ref" || true)"

if [[ -z "$merge_base" ]]; then
  echo "AVISO: as referências não têm ancestral Git comum. Não use 'git merge' para esta atualização."
  echo "       Crie uma base nova a partir do upstream e porte as personalizações de forma controlada."
else
  echo "Base comum: $(git rev-parse --short "$merge_base")"
fi

read -r commits_only_base commits_only_target < <(git rev-list --left-right --count "$base_ref...$target_ref")
echo "Divergência: $commits_only_target commits só no destino; $commits_only_base commits só na base."

if ! git diff --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo
  echo "AVISO: existem alterações locais. Não crie nem aplique uma atualização nesta árvore de trabalho."
fi

echo
echo "Resumo das alterações oficiais:"
git diff --shortstat "$base_ref..$target_ref"
git diff --stat "$base_ref..$target_ref" | sed -n "1,${max_items}p"

echo
echo "Commits oficiais a analisar:"
git log --oneline --no-merges "$base_ref..$target_ref" | sed -n "1,${max_items}p"

mapfile -t changed_upstream < <(git diff --name-only "$base_ref..$target_ref" | sort)
mapfile -t changed_local < <(git diff --name-only | sort)

if ((${#changed_local[@]})); then
  overlapping_files="$(comm -12 \
    <(printf '%s\n' "${changed_upstream[@]}") \
    <(printf '%s\n' "${changed_local[@]}"))"

  if [[ -n "$overlapping_files" ]]; then
    echo
    echo "Ficheiros modificados localmente que também mudaram no upstream:"
    printf '%s\n' "$overlapping_files"
  fi
fi

echo
echo "Próximo passo seguro: rever este relatório, escolher uma tag/release e criar uma branch de atualização numa árvore de trabalho limpa."
echo "Defina UPGRADE_REPORT_MAX_ITEMS para aumentar o limite de linhas mostrado."
