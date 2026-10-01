import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const LAYERS = ["_app", "_pages", "widgets", "features", "entities", "shared"];
const SEGMENTS = new Set(["ui", "model", "api", "lib", "config"]);
// Client-safe `index.ts` and server-only `index.server.ts` are the only public APIs.
const PUBLIC_API = /^index(\.server)?\.(ts|tsx)$/;
const SERVER_API = /^index\.server\.(ts|tsx)$/;
function walk(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const name = path.join(dir, entry.name);
        return entry.isDirectory()
          ? walk(name)
          : /\.(tsx?|css)$/.test(name)
            ? [name]
            : [];
      })
    : [];
}
function resolveFile(target) {
  return [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
  ].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
}
function address(root, file) {
  const parts = path.relative(path.join(root, "src"), file).split(path.sep);
  const [layer, slice] = parts;
  return {
    layer,
    slice,
    parts,
    scope: ["_app", "shared"].includes(layer) ? layer : `${layer}/${slice}`,
  };
}
export function checkArchitecture(root) {
  const errors = [];
  const files = [
    ...walk(path.join(root, "src")),
    ...walk(path.join(root, "app")),
  ];
  const graph = new Map();
  const fail = (file, message) =>
    errors.push(`${path.relative(root, file)}: ${message}`);
  for (const file of files) {
    if (file.endsWith(".css")) continue;
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const route = file.startsWith(path.join(root, "app") + path.sep);
    const from = address(root, file);
    if (route) {
      if (
        source.statements.length !== 1 ||
        !ts.isExportDeclaration(source.statements[0]) ||
        !source.statements[0].exportClause
      ) {
        fail(
          file,
          "Next routes must contain one explicit public-API re-export.",
        );
      }
    } else {
      if (!LAYERS.includes(from.layer))
        fail(file, `Unknown FSD layer ${from.layer}.`);
      if (
        !["_app", "shared"].includes(from.layer) &&
        !SEGMENTS.has(from.parts[2]) &&
        !PUBLIC_API.test(from.parts[2] ?? "")
      ) {
        fail(
          file,
          "Slices need purpose-based segments and an explicit index.ts public API.",
        );
      }
      if (from.layer === "shared" && !SEGMENTS.has(from.parts[1]))
        fail(file, "Shared contains purpose-based segments, not slices.");
    }
    const client = source.statements.some(
      (statement) =>
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use client",
    );
    if (
      SERVER_API.test(path.basename(file)) &&
      !source.statements.some(
        (statement) =>
          ts.isImportDeclaration(statement) &&
          ts.isStringLiteral(statement.moduleSpecifier) &&
          statement.moduleSpecifier.text === "server-only",
      )
    )
      fail(file, 'Server public APIs must import "server-only".');
    const dependencies = [];
    function visit(node) {
      if (ts.isExportDeclaration(node) && !node.exportClause)
        fail(file, "Wildcard re-exports are forbidden.");
      let specifier;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specifier = node.moduleSpecifier.text;
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        specifier = node.arguments[0].text;
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        specifier = node.argument.literal.text;
      }
      if (
        specifier &&
        (specifier.startsWith("@/") || specifier.startsWith("."))
      ) {
        const target = resolveFile(
          specifier.startsWith("@/")
            ? path.join(root, "src", specifier.slice(2))
            : path.resolve(path.dirname(file), specifier),
        );
        if (!target) fail(file, `Unresolved internal import ${specifier}.`);
        else {
          dependencies.push(target);
          const to = address(root, target);
          if (client && SERVER_API.test(path.basename(target)))
            fail(file, "Client modules must not import a server public API.");
          if (!target.startsWith(path.join(root, "src") + path.sep))
            fail(file, "Product modules may only import from src.");
          else if (route) {
            if (
              !["_app", "_pages"].includes(to.layer) ||
              !PUBLIC_API.test(path.basename(target))
            )
              fail(file, "Routes must use an app segment or page public API.");
          } else if (from.scope === to.scope) {
            if (
              specifier.startsWith("@/") &&
              !["_app", "shared"].includes(from.layer)
            )
              fail(
                file,
                "Use relative imports within a slice; never its own public API.",
              );
          } else {
            if (LAYERS.indexOf(to.layer) <= LAYERS.indexOf(from.layer))
              fail(
                file,
                `Forbidden layer/sibling dependency ${from.scope} -> ${to.scope}.`,
              );
            if (!PUBLIC_API.test(path.basename(target)))
              fail(file, `Import ${specifier} bypasses the public API.`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    graph.set(file, dependencies);
  }
  const done = new Set();
  const active = new Set();
  function checkCycle(file) {
    if (active.has(file)) {
      fail(file, "Circular module dependency.");
      return;
    }
    if (done.has(file)) return;
    active.add(file);
    for (const child of graph.get(file) ?? []) checkCycle(child);
    active.delete(file);
    done.add(file);
  }
  for (const file of graph.keys()) checkCycle(file);
  return errors;
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const errors = checkArchitecture(process.cwd());
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
  else
    console.log(
      "FSD boundaries, route adapters, public APIs, and module cycles: passed.",
    );
}
