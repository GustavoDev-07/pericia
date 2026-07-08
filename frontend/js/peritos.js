async function cadastro_usuario(event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const dataNascimento = document.getElementById('data').value;
    const cpfCnpj = document.getElementById('cpf').value;
    const senha = document.getElementById('senha').value;
    const confirmacaoSenha = document.getElementById('confirmar').value;
    const telefone = typeof montarTelefoneCompleto === 'function' ? montarTelefoneCompleto() : '';

    if (senha !== confirmacaoSenha) {
        alert("As senhas não coincidem!")
        return;
    }

    const payload = {
        nome: nome,
        email: email,
        dataNascimento: dataNascimento,
        cpfCnpj: cpfCnpj,
        telefone: telefone,
        senha: senha,
        confirmacaoSenha: confirmacaoSenha
    };


    try {
        const resposta = await fetch('http://127.0.0.1:3000/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.insertId) {
            localStorage.setItem('usuarioLogado', JSON.stringify(resultado.usuario))
            alert("Usuário cadastrado com sucesso! ID: " + resultado.insertId);
            window.location.replace("http://127.0.0.1:5500/frontend/html/inicio.html");
            document.getElementById("form_card").reset();
        } else {
            alert(resultado.mensagem || "O servidor processou a requisição, mas falhou ao salvar no banco.")
        }
    } catch (erro) {
        console.error("Erro na comunicação com a API:", erro);
        alert("Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando na porta 3000.");
    }
};

window.addEventListener('DOMContentLoaded', () => {

    document.getElementById('form_card').addEventListener('submit', cadastro_usuario);
})

async function loginUsuario(event) {

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    console.log(email, senha)

    if (!email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const payload = {
        email: email,
        senha: senha
    };

    try {
        const resposta = await fetch('http://127.0.0.1:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.token) {
            alert("Login realizado com sucesso!");
            localStorage.setItem('token', resultado.token);
            window.location.href = "../html/inicio.html";
        }else {
            alert(resultado.mensagem || "Erro ao realizar login.");
        }
    } catch(erro) {
        console.error("Erro de comunicação com a API do login", erro);
        alert("Não foi possível conectar com servidor.")
    }
}