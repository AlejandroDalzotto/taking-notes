import { remark } from 'remark'
import { highlight } from 'remark-sugar-high'
import html from 'remark-html'
import gfm from 'remark-gfm'

/**
 * Generate a random unique code for files identification.
 * @returns An auto-generated unique code.
 */
export const generateRandomUniqueTag = (length = 20): string => {

  const characters = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
  let finalResult = "";

  for (let i = 0; i < length; i++) {
    const rand = Math.floor(Math.random() * characters.length)

    finalResult += characters.charAt(rand);
  }

  return finalResult;
}

export const getLocalDateString = (timestamp: number) => {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function remarkMarkdown(md: string): string {
  const blocks: string[] = [];
  let i = 0;

  // Escape all HTML first
  md = escapeHtml(md);

  // 1. Proteger bloques de código (``` ... ```
  md = md.replace(/```[\s\S]*?```/g, m => {
    blocks.push(`<span class="md-block-code">${m}</span>`);
    return `\u0000BLOCK${i++}\u0000`;
  });

  // 2. Proteger tags HTML (cualquier <...>)
  md = md.replace(/&lt;\/?[a-zA-Z][^&gt;\n]*&gt;/g, m => {
    blocks.push(`<span class="md-html-tag">${m}</span>`);
    return `\u0000BLOCK${i++}\u0000`;
  });
  // 2b. Proteger tags HTML incompletos (&lt; y &lt;/)
  md = md.replace(/&lt;\/?/g, m => `<span class="md-html-tag">${m}</span>`);

  // 3. Proteger negrita (**...**)
  md = md.replace(/\*\*[^*]+\*\*/g, m => {
    blocks.push(`<span class="md-bold">${m}</span>`);
    return `\u0000BLOCK${i++}\u0000`;
  });

  // 4. Proteger itálica (*...*)
  md = md.replace(/\*[^*]+\*/g, m => {
    blocks.push(`<span class="md-italic">${m}</span>`);
    return `\u0000BLOCK${i++}\u0000`;
  });

  // 5. Código en línea (`...`)
  md = md.replace(/`[^`]+`/g, m =>
    `<span class="md-inline-code">${m}</span>`
  );
  // 6. Títulos
  md = md.replace(/^### .*/gm, m =>
    `<span class="md-heading">${m}</span>`
  );
  md = md.replace(/^## .*/gm, m =>
    `<span class="md-heading">${m}</span>`
  );
  md = md.replace(/^# .*/gm, m =>
    `<span class="md-heading">${m}</span>`
  );
  // 7. Listas
  md = md.replace(/^\s*-\s+.*/gm, m =>
    `<span class="md-list">${m}</span>`
  );
  md = md.replace(/^\s*\d+\.\s+.*/gm, m =>
    `<span class="md-list">${m}</span>`
  );
  // 8. Enlaces: remarcar texto y url por separado
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, texto, url) =>
    `<span class="md-link-text">[${texto}]</span><span class="md-link-url">(${url})</span>`
  );
  // 9. Blockquote
  md = md.replace(/^&gt; .*/gm, m =>
    `<span class="md-blockquote">${m}</span>`
  );
  // 10. Tablas
  md = md.replace(/^\|.*\|$/gm, m =>
    `<span class="md-table">${m}</span>`
  );
  // 11. Separadores
  md = md.replace(/^---$/gm, m =>
    `<span class="md-hr">${m}</span>`
  );
  // 12. Comentarios HTML
  md = md.replace(/^&lt;!--.*--&gt;$/gm, m =>
    `<span class="md-html-comment">${m}</span>`
  );

  // Restaurar bloques protegidos
  md = md.replace(/\u0000BLOCK(\d+)\u0000/g, (_, n) => blocks[Number(n)]);

  return md;
}

// Escapa caracteres HTML para que los tags se vean como texto
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}