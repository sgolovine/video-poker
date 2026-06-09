import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repoRoot, 'new_cards/PLAYING_CARD_BACKS.svg');
const outputDir = resolve(repoRoot, 'assets/cards/backs');
const source = readFileSync(sourcePath, 'utf8');

const defs = extractElement('defs');
const metadata = extractElement('metadata');
const topLevelGroups = findTopLevelGroups();
const groups = topLevelGroups
  .map((group) => ({ ...group, bounds: measureFirstRect(group.markup) }))
  .filter((group) => group.bounds && isCardSized(group.bounds));
const skippedGroupCount = topLevelGroups.length - groups.length;

mkdirSync(outputDir, { recursive: true });

groups.forEach((group, index) => {
  const bounds = group.bounds;
  if (!bounds) {
    return;
  }

  const fileName = `back-${String(index + 1).padStart(2, '0')}.svg`;
  const translateX = formatNumber(-bounds.minX);
  const translateY = formatNumber(-bounds.minY);
  const width = formatNumber(bounds.width);
  const height = formatNumber(bounds.height);
  const content = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<svg viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">`,
    '  <title>Vector Playing Cards - Extracted Card Back</title>',
    indent(defs, 2),
    indent(metadata, 2),
    `  <g id="${group.id}-extracted" transform="translate(${translateX} ${translateY})">`,
    indent(group.markup, 4),
    '  </g>',
    '</svg>',
    '',
  ].join('\n');

  writeFileSync(resolve(outputDir, fileName), content);
});

console.log(`Extracted ${groups.length} card backs to ${outputDir} (${skippedGroupCount} non-card groups skipped)`);

function extractElement(name) {
  const start = source.indexOf(`<${name}`);
  if (start < 0) {
    throw new Error(`Missing <${name}> in ${sourcePath}`);
  }
  return source.slice(start, findElementEnd(source, start, name));
}

function findTopLevelGroups() {
  const result = [];
  const tagPattern = /<\/?([A-Za-z_:][\w:.-]*)([^<>]*?)(\/?)>/g;
  const stack = [];
  let rootSeen = false;
  let depth = 0;

  for (let match = tagPattern.exec(source); match; match = tagPattern.exec(source)) {
    const [tag, name, attrs, selfClosingMarker] = match;
    const closing = tag.startsWith('</');
    const selfClosing = Boolean(selfClosingMarker) || tag.startsWith('<?') || tag.startsWith('<!');

    if (name === 'svg' && !closing && !rootSeen) {
      rootSeen = true;
      depth = 1;
      continue;
    }
    if (!rootSeen) {
      continue;
    }

    if (closing) {
      const top = stack.at(-1);
      if (name === 'g' && top?.depth === depth) {
        stack.pop();
        if (top.depth === 2) {
          result.push({
            id: top.id,
            markup: source.slice(top.start, tagPattern.lastIndex),
          });
        }
      }
      depth -= 1;
      continue;
    }

    if (name === 'g') {
      const group = {
        id: attrs.match(/\bid="([^"]+)"/)?.[1] ?? `group-${result.length + 1}`,
        start: match.index,
        depth: depth + 1,
      };
      if (selfClosing) {
        if (group.depth === 2) {
          result.push({
            id: group.id,
            markup: tag,
          });
        }
      } else {
        stack.push(group);
      }
    }
    if (!selfClosing) {
      depth += 1;
    }
  }

  return result;
}

function findElementEnd(text, start, name) {
  const tagPattern = new RegExp(`</?${name}\\b[^>]*>`, 'g');
  tagPattern.lastIndex = start;
  let depth = 0;

  for (let match = tagPattern.exec(text); match; match = tagPattern.exec(text)) {
    if (match[0].startsWith(`</${name}`)) {
      depth -= 1;
      if (depth === 0) {
        return tagPattern.lastIndex;
      }
    } else if (!match[0].endsWith('/>')) {
      depth += 1;
    }
  }

  throw new Error(`Could not find </${name}>`);
}

function measureFirstRect(groupMarkup) {
  const firstRect = groupMarkup.match(/<rect\b[^>]*>/);
  if (!firstRect) {
    return undefined;
  }

  const prefix = groupMarkup.slice(0, firstRect.index);
  const transform = [...prefix.matchAll(/\btransform="([^"]+)"/g)]
    .map((match) => parseTransform(match[1]))
    .reduce(multiplyMatrix, identityMatrix());

  const x = parseSvgNumber(attribute(firstRect[0], 'x') ?? '0');
  const y = parseSvgNumber(attribute(firstRect[0], 'y') ?? '0');
  const width = parseSvgNumber(attribute(firstRect[0], 'width') ?? '0');
  const height = parseSvgNumber(attribute(firstRect[0], 'height') ?? '0');
  const points = [
    transformPoint(transform, x, y),
    transformPoint(transform, x + width, y),
    transformPoint(transform, x, y + height),
    transformPoint(transform, x + width, y + height),
  ];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function isCardSized(bounds) {
  return bounds.width >= 55 && bounds.width <= 70 && bounds.height >= 80 && bounds.height <= 95;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
}

function parseSvgNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid SVG number: ${value}`);
  }
  return number;
}

function parseTransform(value) {
  return [...value.matchAll(/(matrix|translate|scale)\(([^)]*)\)/g)]
    .map((match) => {
      const numbers = match[2]
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(parseSvgNumber);
      if (match[1] === 'matrix') {
        return numbers;
      }
      if (match[1] === 'translate') {
        return [1, 0, 0, 1, numbers[0] ?? 0, numbers[1] ?? 0];
      }
      return [numbers[0] ?? 1, 0, 0, numbers[1] ?? numbers[0] ?? 1, 0, 0];
    })
    .reduce(multiplyMatrix, identityMatrix());
}

function identityMatrix() {
  return [1, 0, 0, 1, 0, 0];
}

function multiplyMatrix(left, right) {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ];
}

function transformPoint(matrix, x, y) {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

function formatNumber(value) {
  return Number(value.toFixed(6)).toString();
}

function indent(text, spaces) {
  const padding = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? `${padding}${line}` : line))
    .join('\n');
}
