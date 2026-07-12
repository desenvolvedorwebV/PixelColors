const cores = {
    1: "#9b2f09",
    2: "#b54a12",
    3: "#6f2408",
    4: "#e00000",
    5: "#ff1010",
    6: "#ff9eb0",
    7: "#f00000",
    8: "#df0000",
    9: "#ff7f91",
    10: "#620000"
};

let niveis = [];
let nivelAtual = null;
let corSelecionada = null;
let restantes = {};

const board = document.getElementById("board");
const palette = document.getElementById("palette");
const menuNivel = document.getElementById("menuNivel");
const gameBoard = document.getElementById("gameBoard");

async function carregarNiveis() {
    try {
        const resposta = await fetch("levels/index.json");
        const arquivos = await resposta.json();

        niveis = [];

        for (const arquivo of arquivos) {
            const res = await fetch(`levels/${arquivo}`);
            const nivel = await res.json();
            niveis.push({ ...nivel, arquivo });
        }

        renderizarMenu();
    } catch (erro) {
        console.error(erro);
        menuNivel.innerHTML = "<p>Não foi possível carregar os níveis.</p>";
    }
}

function renderizarMenu() {
    menuNivel.innerHTML = "";
    menuNivel.classList.remove("hidden");
    menuNivel.classList.add("visible");
    gameBoard.classList.remove("visible");
    gameBoard.classList.add("hidden");

    niveis.forEach((nivel, index) => {
        const card = document.createElement("button");
        card.className = "nivelCard";
        card.type = "button";

        const miniatura = document.createElement("div");
        miniatura.className = "miniatura";
        miniatura.innerHTML = criarMiniatura(nivel.pixels);

        const titulo = document.createElement("strong");
        titulo.textContent = nivel.nome || `Nível ${index + 1}`;

        card.appendChild(miniatura);
        card.appendChild(titulo);
        card.onclick = () => abrirNivel(index);
        menuNivel.appendChild(card);
    });
}

function criarMiniatura(pixels) {
    const xs = pixels.map((p) => p.x);
    const ys = pixels.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const colunas = maxX - minX + 1;
    const linhas = maxY - minY + 1;

    let html = "";
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const pixel = pixels.find((p) => p.x === x && p.y === y);
            const cor = pixel ? cores[pixel.cor] : "";
            html += `<div class="cell" style="background:${cor};border-color:${cor ? "rgba(0,0,0,.15)" : "transparent"};"></div>`;
        }
    }

    return html;
}

function abrirNivel(index) {
    nivelAtual = index;
    carregarNivel(niveis[index]);

    menuNivel.classList.remove("visible");
    menuNivel.classList.add("hidden");
    gameBoard.classList.remove("hidden");
    gameBoard.classList.add("visible");
}

function carregarNivel(nivel) {
    if (!nivel) {
        return;
    }

    board.innerHTML = "";
    palette.innerHTML = "";
    corSelecionada = null;
    restantes = {};

    const xs = nivel.pixels.map((p) => p.x);
    const ys = nivel.pixels.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const colunas = maxX - minX + 1;
    const linhas = maxY - minY + 1;

    board.style.gridTemplateColumns = `repeat(${colunas}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${linhas}, 1fr)`;

    if (colunas >= linhas) {
        board.style.width = "min(96vw, 520px)";
        board.style.height = "auto";
        board.style.aspectRatio = `${colunas}/${linhas}`;
    } else {
        board.style.height = "min(70vh, 520px)";
        board.style.width = "auto";
        board.style.aspectRatio = `${colunas}/${linhas}`;
    }

    const pixelMap = new Map();

    nivel.pixels.forEach((p) => {
        const key = `${p.x},${p.y}`;
        pixelMap.set(key, p.cor);

        if (p.cor !== null && p.cor !== undefined) {
            restantes[p.cor] = (restantes[p.cor] || 0) + 1;
        }
    });

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const key = `${x},${y}`;
            const cor = pixelMap.has(key) ? pixelMap.get(key) : null;

            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (cor === null || cor === undefined) {
                cell.classList.add("blank");
                cell.dataset.valor = "";
            } else {
                cell.textContent = cor;
                cell.dataset.valor = cor;
                cell.addEventListener("click", pintarCelula);
            }

            board.appendChild(cell);
        }
    }

    criarPaleta();
}

function criarPaleta() {
    palette.innerHTML = "";

    Object.keys(restantes)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((numero) => {
            if (restantes[numero] <= 0) {
                return;
            }

            const btn = document.createElement("button");
            btn.className = "colorBtn";
            btn.style.background = cores[numero];
            btn.dataset.cor = numero;

            btn.innerHTML = `
                <span>${numero}</span>
                <small>${restantes[numero]}</small>
            `;

            btn.onclick = () => selecionarCor(numero);

            palette.appendChild(btn);
        });
}

function selecionarCor(numero) {
    corSelecionada = numero;

    document.querySelectorAll(".colorBtn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.cor === numero);
    });

    document.querySelectorAll(".cell").forEach((cell) => {
        cell.classList.remove("hint");

        if (cell.dataset.valor === numero && !cell.classList.contains("painted")) {
            cell.classList.add("hint");
        }
    });
}

function pintarCelula() {
    if (!corSelecionada) {
        return;
    }

    if (this.classList.contains("painted")) {
        return;
    }

    const correto = this.dataset.valor;

    if (correto !== corSelecionada) {
        erroLeve(this);
        return;
    }

    this.style.background = cores[corSelecionada];
    this.classList.remove("hint");
    this.classList.add("painted");

    restantes[corSelecionada]--;

    if (restantes[corSelecionada] <= 0) {
        corSelecionada = null;
        criarPaleta();

        document.querySelectorAll(".cell.hint").forEach((cell) => {
            cell.classList.remove("hint");
        });
    } else {
        criarPaleta();
        selecionarCor(corSelecionada);
    }

    verificarFim();
}

function erroLeve(cell) {
    cell.classList.remove("wrong");
    void cell.offsetWidth;
    cell.classList.add("wrong");

    if (navigator.vibrate) {
        navigator.vibrate(70);
    }
}

function verificarFim() {
    const terminou = Object.values(restantes).every((v) => v <= 0);

    if (terminou) {
        setTimeout(() => {
            alert("Desenho concluído!");
        }, 200);
    }
}

carregarNiveis();
