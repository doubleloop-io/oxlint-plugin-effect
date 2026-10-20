#!/usr/bin/env bash
# Collega il checkout ai package di <consumer> che dipendono da @doubleloop-io/oxlint-plugin-effect,
# sostituendo i symlink di pnpm in node_modules: nessun file tracciato del consumer cambia.
# Un `pnpm install` nel consumer annulla il collegamento; `unlink` fa esattamente quello.
set -euo pipefail

package_dir="node_modules/@doubleloop-io/oxlint-plugin-effect"

if [[ $# -ne 2 || ($1 != link && $1 != unlink) ]]; then
    echo "uso: $0 link|unlink <consumer>" >&2
    exit 2
fi

command=$1
consumer=$2
if [[ ! -d $consumer ]]; then
    echo "errore: $consumer non è una directory" >&2
    exit 1
fi
consumer="$(cd "$consumer" && pwd -P)"

if [[ $command == unlink ]]; then
    cd "$consumer"
    pnpm install --frozen-lockfile
    exit 0
fi

checkout="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
if [[ ! -d $checkout/dist ]]; then
    echo "errore: $checkout/dist non esiste; esegui prima pnpm build" >&2
    exit 1
fi

targets=()
while IFS= read -r manifest; do
    target="$(dirname "$manifest")/$package_dir"
    if [[ -L $target ]]; then
        targets+=("$target")
    elif [[ -e $target ]]; then
        # node-linker=hoisted o un altro package manager: non è un symlink di pnpm da sostituire.
        echo "errore: $target esiste e non è un symlink" >&2
        exit 1
    fi
done < <(find "$consumer" \( -name node_modules -o -name .git \) -prune -o -name package.json -print)

if [[ ${#targets[@]} -eq 0 ]]; then
    echo "errore: nessun $package_dir in $consumer; esegui pnpm install nel consumer" >&2
    exit 1
fi

for target in "${targets[@]}"; do
    if [[ $(readlink "$target") == "$checkout" ]]; then
        echo "già collegato: $target"
        continue
    fi
    ln -sfn "$checkout" "$target"
    echo "collegato: $target -> $checkout"
done
echo "per scollegare: $0 unlink $consumer"
