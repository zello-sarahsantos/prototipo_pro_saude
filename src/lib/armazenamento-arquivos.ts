/**
 * Armazenamento de arquivos do protótipo em **IndexedDB** (conteúdo binário) — usado pelo Módulo de
 * Negociações. Os metadados (id, nome, tipo…) continuam nos registros em `localStorage`; aqui só vive o
 * conteúdo, indexado pelo mesmo id.
 *
 * Por que não `localStorage`: a cota (~5 MB para todo o sistema) e a conversão em data URL obrigam a
 * descartar arquivos grandes em silêncio — o que deixaria a GERDAB sem poder abrir o que foi enviado.
 * IndexedDB comporta arquivos de dezenas de MB, é nativo do navegador (sem dependência) e é compartilhado
 * entre os ambientes (Admin e Associação) da mesma origem.
 *
 * LIMITAÇÕES DO PROTÓTIPO (não são regra de negócio): vale para o mesmo navegador/origem; em navegação
 * privada o espaço pode ser limitado. Nenhum limite artificial é imposto: o que decide é a cota real do
 * navegador (`navigator.storage.estimate()`), e uma falha é sempre reportada — nunca engolida.
 */

const NOME_BANCO = "prosaude-arquivos";
const NOME_STORE = "arquivos";

export class ErroArmazenamentoArquivo extends Error {}

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new ErroArmazenamentoArquivo("Este navegador não oferece armazenamento de arquivos (IndexedDB)."));
      return;
    }
    const req = indexedDB.open(NOME_BANCO, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(NOME_STORE)) req.result.createObjectStore(NOME_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new ErroArmazenamentoArquivo("Não foi possível abrir o armazenamento de arquivos."));
  });
}

async function transacao<T>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrirBanco();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(NOME_STORE, modo);
      const req = fn(tx.objectStore(NOME_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Espaço estimado (bytes) — `undefined` quando o navegador não informa. */
export async function estimarEspaco(): Promise<{ usado?: number; cota?: number }> {
  try {
    const e = await navigator.storage?.estimate?.();
    return { usado: e?.usage, cota: e?.quota };
  } catch {
    return {};
  }
}

/** Pede armazenamento persistente (evita limpeza automática pelo navegador); falha silenciosa é aceitável. */
export async function solicitarPersistencia(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* sem suporte */
  }
}

/** Grava o arquivo. Verifica a cota real antes e lança erro explícito se não couber. */
export async function salvarArquivo(id: string, arquivo: Blob): Promise<void> {
  const { usado, cota } = await estimarEspaco();
  if (cota !== undefined && usado !== undefined && arquivo.size > cota - usado) {
    throw new ErroArmazenamentoArquivo("Não há espaço suficiente no navegador para guardar este arquivo.");
  }
  try {
    await transacao("readwrite", (s) => s.put(arquivo, id));
  } catch (e) {
    if (e instanceof ErroArmazenamentoArquivo) throw e;
    throw new ErroArmazenamentoArquivo("Não foi possível guardar o arquivo no navegador (espaço insuficiente ou armazenamento bloqueado).");
  }
  void solicitarPersistencia();
}

export async function obterArquivo(id: string): Promise<Blob | undefined> {
  try {
    return (await transacao<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function removerArquivo(id: string): Promise<void> {
  try {
    await transacao("readwrite", (s) => s.delete(id));
  } catch {
    /* já ausente */
  }
}
