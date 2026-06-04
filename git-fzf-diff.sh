#!/usr/bin/env bash

# Helper to resolve renamed paths from git's --stat output (e.g. "{src => dest}/file.js" -> "dest/file.js")
resolve_path() {
  local path="$1"
  if [[ "$path" == *" => "* ]]; then
    if [[ "$path" == *"{"* ]]; then
      echo "$path" | sed -E 's/\{.* => (.*)\}/\1/'
    else
      echo "$path" | sed -E 's/.* => (.*)/\1/'
    fi
  else
    echo "$path"
  fi
}

# Find the last git diff command specifying branches/revisions from bash history
find_last_git_diff_command() {
  local history_file="${HISTFILE:-$HOME/.bash_history}"
  if [ ! -f "$history_file" ]; then
    return 1
  fi

  # Read history backwards
  while read -r line; do
    # Trim whitespace
    line=$(echo "$line" | sed -e 's/^[[:space:]]*//; s/[[:space:]]*$//')
    
    # Check if the line is a git diff command
    if [[ "$line" =~ ^git[[:space:]]+diff ]]; then
      # Parse line into arguments to check for branches/references
      read -ra args <<< "$line"
      local has_ref=false
      
      # Check from index 2 onwards (after 'git' and 'diff')
      for arg in "${args[@]:2}"; do
        if [[ "$arg" == -* ]]; then
          continue
        fi
        if [[ "$arg" == "--" ]]; then
          break
        fi
        if git rev-parse "$arg" &>/dev/null; then
          has_ref=true
          break
        fi
      done
      
      if [ "$has_ref" = true ]; then
        echo "$line"
        return 0
      fi
    fi
  done < <(tac "$history_file" 2>/dev/null || tail -r "$history_file" 2>/dev/null || awk '{a[i++]=$0} END {for (j=i-1; j>=0; j--) print a[j]}' "$history_file")
  
  return 1
}

# Determine the base git diff command
if [ "$#" -gt 0 ]; then
  # If the user passed arguments, use them to form the base command
  base_cmd="git diff $*"
  echo "Using specified command: $base_cmd"
else
  # Otherwise, attempt to find the last git diff command with branches in history
  last_diff_cmd=$(find_last_git_diff_command)
  if [ -n "$last_diff_cmd" ]; then
    # Strip any formatting/stat flags from the command to get the base command
    base_cmd=$(echo "$last_diff_cmd" | sed -E 's/--(stat|numstat|shortstat|summary|name-only|name-status)(=[^[:space:]]+)?//g' | sed 's/[[:space:]]*$//')
    echo "Using last git diff command from history: $last_diff_cmd"
    echo "Base command: $base_cmd"
  else
    # Fallback: if no command is found in history, let user choose a branch to compare
    echo "No recent 'git diff' command specifying branch/revision found in history."
    echo "Let's select a branch to compare against HEAD (current branch: $(git branch --show-current))."
    
    if command -v fzf &>/dev/null; then
      selected_branch=$(git branch -a --format='%(refname:short)' | grep -v 'HEAD' | fzf --prompt="Select branch to compare: ")
      if [ -z "$selected_branch" ]; then
        echo "No branch selected. Exiting."
        exit 1
      fi
      selected_branch=${selected_branch#origin/}
      base_cmd="git diff $selected_branch"
    else
      echo "Error: fzf is not installed, cannot select fallback branch."
      exit 1
    fi
  fi
fi

# Ensure fzf is installed
if ! command -v fzf &>/dev/null; then
  echo "Error: fzf is required but not installed." >&2
  exit 1
fi

# Run the git diff stat rows and pass them to fzf
# Preview window position: 'top:60%:border-bottom' places it above the list
# We use standard POSIX-sh compliant 'case' statements for the preview script so that
# it executes flawlessly under any POSIX shell (like Ubuntu's default /bin/sh which is dash).
# We redirect stdout of fzf to /dev/null so that nothing is printed when exiting fzf.
eval "$base_cmd --stat" | grep '|' | fzf \
  --ansi \
  --header "Command: $base_cmd
[ctrl-d/u] Scroll Preview | [enter/q/esc] Exit" \
  --prompt "Select file: " \
  --preview-window "top:60%:border-bottom" \
  --bind "ctrl-d:preview-page-down,ctrl-u:preview-page-up" \
  --bind "q:abort" \
  --preview "
    line=\"{}\"
    # Extract file path and trim whitespace
    file=\$(echo \"\$line\" | cut -d'|' -f1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Resolve rename formats in POSIX-sh compliant 'case' syntax
    case \"\$file\" in
      *\" => \"*)
        case \"\$file\" in
          *\"{\"\*)
            file=\$(echo \"\$file\" | sed -E 's/\\\\{.* => (.*)\\\\}/\\\\1/')
            ;;
          *)
            file=\$(echo \"\$file\" | sed -E 's/.* => (.*)/\\\\1/')
            ;;
        esac
        ;;
    esac
    
    # Render rich diff of just the selected file
    $base_cmd --color=always -- \"\$file\"
  " >/dev/null
