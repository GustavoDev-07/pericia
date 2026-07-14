// ==========================================================================
// login.js
// Lógica de autenticação da tela de Login. Antes esse código vivia em
// pericia.js (que tinha um conflito de merge não resolvido e quebrava a
// página inteira). Agora fica isolado aqui, no arquivo com o nome certo.
//
// Rota real do backend: POST /api/auth/login  (montada em app.js como
// app.use("/api/auth", rotasUsuarios))
// ==========================================================================

const API_BASE = "http://127.0.0.1:3000/api";

async function loginUsuario(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const payload = { email, senha };

    try {
        const resposta = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const resultado = await resposta.json();

        if (resposta.ok && resultado.token) {
            localStorage.setItem("token", resultado.token);
            if (resultado.usuario) {
                localStorage.setItem("usuarioLogado", JSON.stringify(resultado.usuario));
            }
            alert("Login realizado com sucesso!");
            window.location.href = "../html/inicio.html";
        } else {
            alert(resultado.mensagem || "Erro ao realizar login.");
        }
    } catch (erro) {
        console.error("Erro de comunicação com a API do login:", erro);
        alert("Não foi possível conectar com o servidor. Verifique se o backend está rodando na porta 3000.");
    }
}
