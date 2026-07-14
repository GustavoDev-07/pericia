// ==========================================================================
// cadastro.js
// Lógica da tela de Cadastro: máscara de telefone + envio do formulário
// para o backend. Antes o envio ficava em pericia.js (que tinha um
// conflito de merge não resolvido e quebrava a página inteira). Agora
// fica isolado aqui, no arquivo com o nome certo.
//
// Rota real do backend: POST /api/auth/cadastro (montada em app.js como
// app.use("/api/auth", rotasUsuarios)). O backend espera exatamente os
// campos: nome, email, dataNascimento, cpfCnpj, senha.
// ==========================================================================

const API_BASE = "http://127.0.0.1:3000/api";

// ══════════════════════════════════════════════════════════
// TELEFONE: máscara (parênteses + traço), limpeza e código de país
// ══════════════════════════════════════════════════════════

// Aplica a máscara (DD) DDDDD-DDDD (ou (DD) DDDD-DDDD para fixo)
// enquanto o usuário digita, adaptando o formato conforme a quantidade
// de dígitos já informados.
function aplicarMascaraTelefone(valor) {
    valor = valor.replace(/\D/g, ''); // remove tudo que não é número
    valor = valor.slice(0, 11);       // limita a DDD + 9 dígitos (celular)

    if (valor.length > 10) {
        // Celular: (99) 99999-9999
        valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 6) {
        // Fixo: (99) 9999-9999
        valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (valor.length > 2) {
        // Ainda digitando o número, já fechando o DDD
        valor = valor.replace(/^(\d{2})(\d*)/, '($1) $2');
    } else if (valor.length > 0) {
        // Só o início do DDD
        valor = valor.replace(/^(\d*)/, '($1');
    }

    return valor;
}

// Remove parênteses, espaços, traços e qualquer caractere que não seja
// número, garantindo que o valor salvo no banco fique só com dígitos.
function limparTelefone(valor) {
    return (valor || '').replace(/\D/g, '');
}

// Retorna o código do país (DDI) atualmente selecionado no <select id="pais">
function obterCodigoPais() {
    const selectPais = document.getElementById('pais');
    return selectPais ? selectPais.value : '';
}

// Ajusta o placeholder do campo telefone de acordo com o país escolhido
function alterarCodigoPais() {
    const selectPais = document.getElementById('pais');
    const inputTelefone = document.getElementById('telefone');
    if (!selectPais || !inputTelefone) return;

    const opcaoSelecionada = selectPais.selectedOptions[0];
    const sigla = opcaoSelecionada ? opcaoSelecionada.dataset.sigla : null;

    if (sigla === 'BR') {
        inputTelefone.placeholder = '(00) 00000-0000';
    } else {
        inputTelefone.placeholder = '(00) 0000-0000';
    }

    // Reaplica a máscara em cima do que já foi digitado
    inputTelefone.value = aplicarMascaraTelefone(inputTelefone.value);
}

// Monta o telefone completo (código do país + número já limpo)
function montarTelefoneCompleto() {
    const inputTelefone = document.getElementById('telefone');
    if (!inputTelefone) return '';

    const ddi = obterCodigoPais();
    const numeroLimpo = limparTelefone(inputTelefone.value);

    return numeroLimpo ? `${ddi}${numeroLimpo}` : '';
}

// ══════════════════════════════════════════════════════════
// CADASTRO: envio do formulário para o backend
// ══════════════════════════════════════════════════════════

async function cadastro_usuario(event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const dataNascimento = document.getElementById('data').value;
    const cpfCnpj = document.getElementById('cpf').value.trim();
    const senha = document.getElementById('senha').value;
    const confirmacaoSenha = document.getElementById('confirmar').value;

    if (!nome || !email || !dataNascimento || !cpfCnpj || !senha || !confirmacaoSenha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    if (senha !== confirmacaoSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    // Campo telefone existe no formulário, mas o backend (rota /api/auth/cadastro)
    // ainda não tem uma coluna para ele — por isso não é enviado no payload.
    // Se um dia o backend passar a aceitar telefone, é só incluir aqui:
    // const telefone = montarTelefoneCompleto();

    const payload = {
        nome,
        email,
        dataNascimento,
        cpfCnpj,
        senha
    };

    try {
        const resposta = await fetch(`${API_BASE}/auth/cadastro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.insertId) {
            alert("Usuário cadastrado com sucesso! Faça login para continuar.");
            document.getElementById("form_card").reset();
            window.location.href = "../html/login.html";
        } else {
            alert(resultado.mensagem || "O servidor processou a requisição, mas falhou ao salvar no banco.");
        }
    } catch (erro) {
        console.error("Erro na comunicação com a API:", erro);
        alert("Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando na porta 3000.");
    }
}

// ══════════════════════════════════════════════════════════
// WIRING: liga os eventos assim que a página carrega
// ══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('telefone');
    const selectPais = document.getElementById('pais');
    const formCadastro = document.getElementById('form_card');

    if (inputTelefone) {
        inputTelefone.addEventListener('input', (evento) => {
            evento.target.value = aplicarMascaraTelefone(evento.target.value);
        });
    }

    if (selectPais) {
        selectPais.addEventListener('change', alterarCodigoPais);
    }

    if (formCadastro) {
        formCadastro.addEventListener('submit', cadastro_usuario);
    }
});
