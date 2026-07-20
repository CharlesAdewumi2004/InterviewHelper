import type { Monaco } from '@monaco-editor/react';
import type { editor, languages, Position } from 'monaco-editor';
import type { EditorMode } from '../../../shared/protocol';

const SNIPPETS: { label: string; detail: string; insertText: string }[] = [
  {
    label: 'vec',
    detail: 'std::vector',
    insertText: 'vector<${1:int}> ${2:v};',
  },
  {
    label: 'umap',
    detail: 'std::unordered_map',
    insertText: 'unordered_map<${1:int}, ${2:int}> ${3:m};',
  },
  {
    label: 'pq',
    detail: 'std::priority_queue (max-heap)',
    insertText: 'priority_queue<${1:int}> ${2:pq};',
  },
  {
    label: 'pqmin',
    detail: 'std::priority_queue (min-heap)',
    insertText: 'priority_queue<${1:int}, vector<${1:int}>, greater<${1:int}>> ${2:pq};',
  },
  {
    label: 'forr',
    detail: 'range-for',
    insertText: 'for (const auto& ${1:x} : ${2:xs}) {\n\t$0\n}',
  },
  {
    label: 'fori',
    detail: 'index for loop',
    insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t$0\n}',
  },
  {
    label: 'lam',
    detail: 'lambda',
    insertText: 'auto ${1:f} = [&](${2:int x}) { return $0; };',
  },
  {
    label: 'cmpstruct',
    detail: 'struct with comparator',
    insertText: 'struct ${1:Cmp} {\n\tbool operator()(const ${2:T}& a, const ${2:T}& b) const {\n\t\treturn $0;\n\t}\n};',
  },
  {
    label: 'bsearch',
    detail: 'binary search template',
    insertText:
      'int lo = ${1:0}, hi = ${2:n};\nwhile (lo < hi) {\n\tint mid = lo + (hi - lo) / 2;\n\tif (${3:pred(mid)}) hi = mid;\n\telse lo = mid + 1;\n}$0',
  },
];

let snippetsRegistered = false;

export function setupMonaco(monaco: Monaco): void {
  if (snippetsRegistered) return;
  snippetsRegistered = true;

  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems(model: editor.ITextModel, position: Position): languages.CompletionList {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: SNIPPETS.map((s) => ({
          label: s.label,
          detail: s.detail,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}

export function editorOptions(mode: EditorMode): editor.IStandaloneEditorConstructionOptions {
  return {
    fontSize: 14,
    tabSize: 4,
    fontLigatures: false,
    minimap: { enabled: false },
    // Interview mode = what CoderPad/HackerRank give you: identifiers already
    // in the buffer, no type awareness. Study mode (clangd) is phase 3.
    wordBasedSuggestions: 'currentDocument',
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: mode === 'study',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    bracketPairColorization: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 8 },
  };
}
