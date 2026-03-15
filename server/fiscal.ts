import type { Company, Client, Order, OrderItem, Product } from "@shared/schema";

interface NFeItem {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  unidade_tributavel: string;
  quantidade_tributavel: number;
  valor_unitario_tributavel: number;
  codigo_ncm: string;
  icms_origem: number;
  icms_situacao_tributaria: string;
  icms_aliquota?: number;
  icms_base_calculo?: number;
  icms_valor?: number;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
}

interface NFePayload {
  natureza_operacao: string;
  forma_pagamento: string;
  tipo_documento: string;
  finalidade_emissao: string;
  consumidor_final: string;
  presenca_comprador: string;
  numero: number;
  serie: number;
  cnpj_emitente: string;
  inscricao_estadual_emitente?: string;
  regime_tributario: number;
  nome_destinatario: string;
  cpf_destinatario?: string;
  cnpj_destinatario?: string;
  endereco_destinatario?: string;
  bairro_destinatario?: string;
  municipio_destinatario?: string;
  uf_destinatario?: string;
  cep_destinatario?: string;
  indicador_inscricao_estadual_destinatario: string;
  items: NFeItem[];
  valor_produtos: number;
  valor_total: number;
  modalidade_frete: string;
  informacoes_adicionais_contribuinte?: string;
  formas_pagamento: Array<{
    forma_pagamento: string;
    valor_pagamento: number;
  }>;
}

function getICMSSituacaoTributaria(regimeTributario: number): string {
  if (regimeTributario === 1 || regimeTributario === 2) {
    return "102";
  }
  return "00";
}

function getPISSituacaoTributaria(regimeTributario: number): string {
  if (regimeTributario === 1 || regimeTributario === 2) {
    return "49";
  }
  return "01";
}

function getCOFINSSituacaoTributaria(regimeTributario: number): string {
  if (regimeTributario === 1 || regimeTributario === 2) {
    return "49";
  }
  return "01";
}

export function buildNFePayload(
  company: Company,
  client: Client,
  order: Order,
  items: OrderItem[],
  products: Product[],
  numero: number,
  serie: number
): NFePayload {
  const regimeTributario = company.regimeTributario || 1;
  const icmsSituacao = getICMSSituacaoTributaria(regimeTributario);
  const pisSituacao = getPISSituacaoTributaria(regimeTributario);
  const cofinsSituacao = getCOFINSSituacaoTributaria(regimeTributario);

  const nfeItems: NFeItem[] = items.map((item, idx) => {
    const product = products.find(p => p.id === item.productId);
    const unitPrice = parseFloat(item.unitPrice || "0");
    const quantity = item.quantity;
    const valorBruto = unitPrice * quantity;

    return {
      numero_item: idx + 1,
      codigo_produto: product?.sku || String(item.productId),
      descricao: product?.name || `Produto #${item.productId}`,
      cfop: product?.cfop || "5102",
      unidade_comercial: product?.unidade || "UN",
      quantidade_comercial: quantity,
      valor_unitario_comercial: unitPrice,
      valor_bruto: parseFloat(valorBruto.toFixed(2)),
      unidade_tributavel: product?.unidade || "UN",
      quantidade_tributavel: quantity,
      valor_unitario_tributavel: unitPrice,
      codigo_ncm: product?.ncm || "00000000",
      icms_origem: product?.icmsOrigem || 0,
      icms_situacao_tributaria: icmsSituacao,
      pis_situacao_tributaria: pisSituacao,
      cofins_situacao_tributaria: cofinsSituacao,
    };
  });

  const valorProdutos = nfeItems.reduce((sum, i) => sum + i.valor_bruto, 0);
  const valorTotal = parseFloat(order.totalValue || "0") || valorProdutos;

  const cnpjClean = (company.cnpj || "").replace(/\D/g, "");
  const docClean = (client.document || "").replace(/\D/g, "");

  const payload: NFePayload = {
    natureza_operacao: "Venda de mercadoria",
    forma_pagamento: "0",
    tipo_documento: "1",
    finalidade_emissao: "1",
    consumidor_final: "1",
    presenca_comprador: "1",
    numero,
    serie,
    cnpj_emitente: cnpjClean,
    regime_tributario: regimeTributario,
    nome_destinatario: client.name,
    indicador_inscricao_estadual_destinatario: "9",
    items: nfeItems,
    valor_produtos: parseFloat(valorProdutos.toFixed(2)),
    valor_total: parseFloat(valorTotal.toFixed(2)),
    modalidade_frete: "9",
    formas_pagamento: [{
      forma_pagamento: "99",
      valor_pagamento: parseFloat(valorTotal.toFixed(2)),
    }],
  };

  if (company.inscricaoEstadual) {
    payload.inscricao_estadual_emitente = company.inscricaoEstadual;
  }

  if (docClean.length === 11) {
    payload.cpf_destinatario = docClean;
  } else if (docClean.length === 14) {
    payload.cnpj_destinatario = docClean;
  }

  if (client.address) payload.endereco_destinatario = client.address;
  if (client.neighborhood) payload.bairro_destinatario = client.neighborhood;
  if (client.city) payload.municipio_destinatario = client.city;
  if (client.state) payload.uf_destinatario = client.state;

  return payload;
}

export class FocusNFeService {
  private baseUrl: string;
  private token: string;

  constructor(token: string, ambiente: string = "homologacao") {
    this.token = token;
    this.baseUrl = ambiente === "producao"
      ? "https://api.focusnfe.com.br/v2"
      : "https://homologacao.focusnfe.com.br/v2";
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": `Basic ${Buffer.from(this.token + ":").toString("base64")}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok && res.status !== 422) {
      throw new Error(data.mensagem || data.message || `API error ${res.status}: ${text}`);
    }

    return data;
  }

  async emitirNFe(ref: string, payload: NFePayload): Promise<any> {
    return this.request("POST", `/nfe?ref=${ref}`, payload);
  }

  async consultarNFe(ref: string): Promise<any> {
    return this.request("GET", `/nfe/${ref}`);
  }

  async cancelarNFe(ref: string, justificativa: string): Promise<any> {
    return this.request("DELETE", `/nfe/${ref}`, { justificativa });
  }

  async downloadDANFE(ref: string): Promise<string | null> {
    try {
      const result = await this.consultarNFe(ref);
      return result.caminho_danfe || result.url_danfe || null;
    } catch {
      return null;
    }
  }

  async downloadXML(ref: string): Promise<string | null> {
    try {
      const result = await this.consultarNFe(ref);
      return result.caminho_xml_nota_fiscal || result.url_xml || null;
    } catch {
      return null;
    }
  }
}

export function createFiscalService(token: string, ambiente: string): FocusNFeService {
  return new FocusNFeService(token, ambiente);
}
