#!/usr/bin/env bash
# Links the checkout into the packages of <consumer> that depend on @doubleloop-io/oxlint-plugin-effect,
# replacing pnpm's symlinks in node_modules: no tracked file of the consumer changes.
# A `pnpm install` in the consumer undoes the link; `unlink` does exactly that.
set -euo pipefail

package_dir="node_modules/@doubleloop-io/oxlint-plugin-effect"

if [[ $# -ne 2 || ($1 != link && $1 != unlink) ]]; then
    echo "usage: $0 link|unlink <consumer>" >&2
    exit 2
fi

command=$1
consumer=$2
if [[ ! -d $consumer ]]; then
    echo "error: $consumer is not a directory" >&2
    exit 1
fi
consumer="$(cd "$consumer" && pwd -P)"

if [[ $command == unlink ]]; then
    cd "$consumer"
    pnpm install --frozen-lockfile
    exit 0
fi

checkout="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ ! -d $checkout/dist ]]; then
    echo "error: $checkout/dist does not exist; run pnpm build first" >&2
    exit 1
fi

targets=()
while IFS= read -r manifest; do
    target="$(dirname "$manifest")/$package_dir"
    if [[ -L $target ]]; then
        targets+=("$target")
    elif [[ -e $target ]]; then
        # node-linker=hoisted or another package manager: not a pnpm symlink to replace.
        echo "error: $target exists and is not a symlink" >&2
        exit 1
    fi
done < <(find "$consumer" \( -name node_modules -o -name .git \) -prune -o -name package.json -print)

if [[ ${#targets[@]} -eq 0 ]]; then
    echo "error: no $package_dir in $consumer; run pnpm install in the consumer" >&2
    exit 1
fi

for target in "${targets[@]}"; do
    if [[ $(readlink "$target") == "$checkout" ]]; then
        echo "already linked: $target"
        continue
    fi
    ln -sfn "$checkout" "$target"
    echo "linked: $target -> $checkout"
done

# The symlink alone is not enough: the consumer must resolve the plugin to the checkout's dist.
for target in "${targets[@]}"; do
    package="$(dirname "$(dirname "$(dirname "$target")")")"
    resolved="$(cd "$package" && node -p 'require.resolve("@doubleloop-io/oxlint-plugin-effect")' 2>&1)" || true
    if [[ $resolved != "$checkout/dist/index.js" ]]; then
        echo "error: from $package the plugin does not resolve to $checkout/dist/index.js: $resolved" >&2
        exit 1
    fi
done
echo "to unlink: $0 unlink $consumer"
