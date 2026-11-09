import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import en from "../apps/web/src/i18n/messages/en.json" with { type: "json" };
import zh from "../apps/web/src/i18n/messages/zh-CN.json" with { type: "json" };

const root = join(process.cwd(), "apps", "web", "src");
const entries = [];

function visitDirectory(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) visitDirectory(path);
    else if (/\.(ts|tsx)$/.test(name)) visitFile(path);
  }
}

function visitFile(path) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const file = relative(process.cwd(), path).replaceAll("\\", "/");
  const add = (node, text, kind) => {
    const value = text.replace(/\s+/g, " ").trim();
    if (!/[A-Za-z]/.test(value)) return;
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    entries.push({ file, line, kind, value });
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) add(node, node.getText(source), "jsx");
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(source);
      if (
        /^(aria-label|placeholder|title|alt|label|description|hint|detail|heading|content|valueLabel|name)$/.test(
          name,
        ) &&
        node.initializer
      ) {
        const initializer = node.initializer;
        if (ts.isStringLiteral(initializer)) add(node, initializer.text, name);
        else if (
          ts.isJsxExpression(initializer) &&
          initializer.expression &&
          ts.isStringLiteral(initializer.expression)
        )
          add(node, initializer.expression.text, name);
      }
    }
    if (
      ts.isNewExpression(node) &&
      node.expression.getText(source) === "Error" &&
      node.arguments?.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    )
      add(node, node.arguments[0].text, "error");
    if (
      ts.isCallExpression(node) &&
      /^(alert|confirm|prompt|setError|setFailure|setStatus)$/.test(
        node.expression.getText(source),
      ) &&
      node.arguments.length &&
      ts.isStringLiteral(node.arguments[0])
    )
      add(node, node.arguments[0].text, "feedback");
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "t" &&
      node.arguments.length &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const key = node.arguments[0].text;
      if (
        !Object.hasOwn(en.extracted, key) &&
        !Object.values(en).some(
          (namespace) => typeof namespace === "object" && Object.hasOwn(namespace, key),
        )
      )
        add(node, key, "missing-key");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

visitDirectory(root);
for (const key of Object.keys(en.extracted))
  if (!Object.hasOwn(zh.extracted, key))
    entries.push({ file: "zh-CN.json", line: 0, kind: "missing-key", value: key });
for (const key of Object.keys(zh.extracted))
  if (!Object.hasOwn(en.extracted, key))
    entries.push({ file: "en.json", line: 0, kind: "missing-key", value: key });
entries.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
console.log("| Source | Line | Kind | Text |");
console.log("| --- | ---: | --- | --- |");
for (const entry of entries)
  console.log(
    "| `" +
      entry.file +
      "` | " +
      entry.line +
      " | " +
      entry.kind +
      " | " +
      entry.value.replaceAll("|", "\\|") +
      " |",
  );
console.error(`\n${entries.length} candidate messages found.`);
