// Generate deterministic colorful identicon-style SVG avatar from wallet address.
export function avatarSvg(address: string, size = 64): string {
  const hash = simpleHash(address);
  // Earthy sage palette: 2 natural greens/clays + 1 soft cream base for contrast
  const palettes = [
    ["#5E8A5A", "#9CB07F", "#EFEDE0"],
    ["#4F7A52", "#B7C49A", "#F1EFE4"],
    ["#6B8E5A", "#A3B57E", "#ECEADD"],
    ["#7A9A65", "#C7B68A", "#F2F0E5"],
    ["#577D4E", "#A9BE86", "#EDEBDE"],
    ["#8AA06A", "#CBB98C", "#F0EEE2"],
  ];
  const palette = palettes[hash % palettes.length];
  const grid = 5;
  const cell = size / grid;
  let rects = `<rect width="${size}" height="${size}" fill="${palette[2]}"/>`;
  // mirrored pattern
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < Math.ceil(grid / 2); x++) {
      const bit = (hash >> (y * 3 + x)) & 1;
      if (bit) {
        const color = (x + y) % 2 === 0 ? palette[0] : palette[1];
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${color}"/>`;
        const mx = (grid - 1 - x) * cell;
        rects += `<rect x="${mx}" y="${y * cell}" width="${cell}" height="${cell}" fill="${color}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${rects}</svg>`;
}

export function avatarDataUri(address: string, size = 64): string {
  const svg = avatarSvg(address, size);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
