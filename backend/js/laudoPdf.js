// ==========================================================================
// laudoPdf.js
// Gera o PDF do laudo técnico de perícia digital.
//
// O documento segue um ESCOPO/MODELO PADRÃO fixo (cabeçalho, objetivo,
// metodologia, cadeia de custódia, validade jurídica etc.) — o mesmo texto
// para todo laudo emitido pela empresa. Somente os campos abaixo variam de
// um laudo para o outro:
//   - protocolo, data de emissão
//   - nome do cliente
//   - nome do perito responsável
//   - tipo e modelo do dispositivo
//   - parecer técnico (o que o perito escreveu ao finalizar a perícia)
//
// Este módulo não decide QUEM pode acessar o laudo — isso é responsabilidade
// de quem chama gerarLaudoPdf() (ver rotas em dispositivos.js), que só deve
// chamá-lo depois de validar o código de acesso (fluxo público) ou o token
// do usuário autenticado (fluxo logado).
// ==========================================================================

import PDFDocument from 'pdfkit';

const COR_TITULO = '#0f2540';
const COR_TEXTO = '#1a1a1a';
const COR_SUBTITULO = '#3a5a80';
const COR_LINHA = '#c9d4e0';

// ----------------------------------------------------------------------
// Textos fixos do escopo padrão do laudo. Ficam centralizados aqui para
// que qualquer alteração no modelo (ex.: mudar o texto de metodologia)
// seja feita em um único lugar, sem mexer nas rotas.
// ----------------------------------------------------------------------
const TEXTO_OBJETIVO = `O presente laudo tem por objetivo registrar, de forma técnica e imparcial, ` +
    `os procedimentos periciais realizados sobre o dispositivo digital descrito neste documento, ` +
    `apresentando os métodos empregados, as observações relevantes e o parecer conclusivo do perito ` +
    `responsável, em atendimento à solicitação do cliente identificado abaixo.`;

const TEXTO_METODOLOGIA = `Os procedimentos foram conduzidos com observância das boas práticas de ` +
    `perícia forense digital, incluindo a preservação da cadeia de custódia desde o recebimento do ` +
    `dispositivo, o uso de ferramentas e métodos adequados ao tipo de exame solicitado (clonagem, ` +
    `análise ou recuperação de dados) e o registro detalhado de todas as etapas realizadas, conforme ` +
    `descrito na seção "Procedimento Realizado e Resultados" deste laudo.`;

const TEXTO_CADEIA_CUSTODIA = `O dispositivo permaneceu sob a guarda exclusiva da Perícia Fiducia desde o ` +
    `seu recebimento até a conclusão dos trabalhos periciais e posterior devolução ao cliente, não ` +
    `havendo, em nenhum momento, acesso de terceiros não autorizados ao material examinado.`;

const TEXTO_VALIDADE = `Este documento é gerado eletronicamente e sua autenticidade pode ser confirmada ` +
    `a qualquer momento mediante o número de protocolo e o código de acesso originalmente fornecidos ` +
    `no ato do cadastro do dispositivo. Este laudo é de uso exclusivo do solicitante identificado ` +
    `neste documento, sendo vedada sua reprodução ou divulgação a terceiros sem autorização.`;

// ----------------------------------------------------------------------
// gerarLaudoPdf(dadosLaudo, res)
// Monta o PDF e transmite diretamente na resposta HTTP (res), via stream.
// Não retorna Promise resolvida com o buffer completo — o PDF é escrito
// progressivamente no stream de resposta (mais eficiente para arquivos
// grandes e evita segurar tudo em memória).
//
// dadosLaudo esperado:
//   {
//     protocolo, tipoDispositivo, modeloDescricao, status,
//     parecer_tecnico, data_entrada, nome_cliente, nome_perito
//   }
// ----------------------------------------------------------------------
export function gerarLaudoPdf(dadosLaudo, res) {
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        info: {
            Title: `Laudo Técnico - Protocolo ${dadosLaudo.protocolo || ''}`,
            Author: 'Perícia Fiducia - Digital Forensics'
        }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `inline; filename="laudo-${sanitizarNomeArquivo(dadosLaudo.protocolo)}.pdf"`
    );

    doc.pipe(res);

    desenharCabecalho(doc, dadosLaudo);
    desenharIdentificacao(doc, dadosLaudo);
    desenharSecao(doc, '1. Objetivo da Perícia', TEXTO_OBJETIVO);
    desenharSecao(doc, '2. Metodologia Aplicada', TEXTO_METODOLOGIA);
    desenharSecao(doc, '3. Procedimento Realizado e Resultados', dadosLaudo.parecer_tecnico || 'Sem registro.');
    desenharSecao(doc, '4. Cadeia de Custódia', TEXTO_CADEIA_CUSTODIA);
    desenharSecao(doc, '5. Validade e Confidencialidade do Documento', TEXTO_VALIDADE);
    desenharRodape(doc, dadosLaudo);

    doc.end();
}

function sanitizarNomeArquivo(texto) {
    return String(texto || 'laudo').replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function desenharCabecalho(doc, dados) {
    doc
        .fillColor(COR_TITULO)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('PERÍCIA FIDUCIA', { align: 'center' })
        .fontSize(10)
        .font('Helvetica')
        .fillColor(COR_SUBTITULO)
        .text('DIGITAL FORENSICS — LAUDO TÉCNICO DE PERÍCIA DIGITAL', { align: 'center' })
        .moveDown(1);

    doc
        .strokeColor(COR_LINHA)
        .lineWidth(1)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke()
        .moveDown(1);
}

function desenharIdentificacao(doc, dados) {
    const linhas = [
        ['Protocolo', dados.protocolo || '—'],
        ['Data de Emissão', new Date().toLocaleDateString('pt-BR')],
        ['Data de Entrada do Dispositivo', dados.data_entrada || '—'],
        ['Cliente Solicitante', dados.nome_cliente || '—'],
        ['Perito Responsável', dados.nome_perito || '—'],
        ['Tipo de Dispositivo', dados.tipoDispositivo || '—'],
        ['Modelo / Descrição', dados.modeloDescricao || '—'],
        ['Status da Perícia', formatarStatus(dados.status)]
    ];

    doc.fontSize(11).fillColor(COR_TEXTO);

    linhas.forEach(([rotulo, valor]) => {
        doc
            .font('Helvetica-Bold')
            .text(`${rotulo}: `, { continued: true })
            .font('Helvetica')
            .text(String(valor));
    });

    doc.moveDown(1);
    doc
        .strokeColor(COR_LINHA)
        .lineWidth(1)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke()
        .moveDown(1);
}

function desenharSecao(doc, titulo, texto) {
    // Garante espaço mínimo antes de iniciar uma nova seção; se não couber,
    // pdfkit já quebra a página automaticamente durante o .text() longo.
    doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(COR_TITULO)
        .text(titulo)
        .moveDown(0.3);

    doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(COR_TEXTO)
        .text(String(texto), { align: 'justify', lineGap: 3 })
        .moveDown(1);
}

function desenharRodape(doc, dados) {
    doc
        .moveDown(1)
        .fontSize(9)
        .fillColor(COR_SUBTITULO)
        .text(
            `Documento gerado eletronicamente pela Perícia Fiducia. Autenticidade verificável através do protocolo ${dados.protocolo || '—'} e do código de acesso fornecido no cadastro do dispositivo.`,
            { align: 'center' }
        );
}

function formatarStatus(status) {
    const mapa = {
        aguardandoEnvio: 'Aguardando envio',
        recebidoNaEmpresa: 'Recebido na empresa',
        emAnalise: 'Em análise',
        concluida: 'Concluída',
        devolvida: 'Devolvida ao cliente'
    };
    return mapa[status] || status || '—';
}