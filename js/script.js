const input = document.getElementById("pdfInput");
const uploadArea = document.getElementById("uploadArea");
const questionsContainer = document.getElementById("questions");
const checkResultsBtn = document.getElementById("checkResultsBtn");
const resultsDisplay = document.getElementById("results");
const newSimuladoBtn = document.getElementById("newSimuladoBtn");

let parsedText = ""; // Armazena o texto extraído do PDF

// Botão "Iniciar Novo Simulado" recarrega a página
newSimuladoBtn.addEventListener("click", () => {
  location.reload();
});

// Eventos de Drag and Drop para a área de upload
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault(); // Necessário para permitir o drop
  uploadArea.style.borderColor = "#2980b9"; // Altera a cor da borda ao arrastar sobre
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "#d0d0d0"; // Restaura a cor da borda ao sair
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault(); // Necessário para processar o drop
  uploadArea.style.borderColor = "#d0d0d0"; // Restaura a cor da borda
  const file = e.dataTransfer.files[0]; // Pega o arquivo arrastado
  if (file && file.type === "application/pdf") {
    // Verifica se é um PDF
    input.files = e.dataTransfer.files; // Define o arquivo no input file
    input.dispatchEvent(new Event("change")); // Dispara o evento change do input
  }
});

// Evento quando um arquivo é selecionado no input (seja por clique ou drag/drop)
input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return; // Sai se nenhum arquivo for selecionado

  const reader = new FileReader(); // Cria um leitor de arquivos
  reader.onload = async function () {
    const typedarray = new Uint8Array(this.result); // Converte o resultado para array de bytes
    // Carrega o PDF usando pdf.js
    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

    let text = "";
    // Itera por todas as páginas do PDF para extrair o texto
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      text += strings.join(" ") + "\n"; // Concatena o texto de cada página
    }
    parsedText = text; // Armazena o texto completo

    // Esconde a área de upload e mostra os botões de ação
    uploadArea.style.display = "none";
    newSimuladoBtn.style.display = "block";
    checkResultsBtn.style.display = "block";

    // Processa o texto extraído para criar as perguntas
    processText(parsedText);
  };
  reader.readAsArrayBuffer(file); // Lê o arquivo como um ArrayBuffer
});

// Função para processar o texto do PDF e criar as perguntas no HTML
function processText(text) {
  // Regex para encontrar perguntas no formato específico: Número. Pergunta A) B) C) D) E) Resposta: X
  const regex =
    /\d+\.\s+(.+?)\s+A\)\s+(.+?)\s+B\)\s+(.+?)\s+C\)\s+(.+?)\s+D\)\s+(.+?)\s+E\)\s+(.+?)\s+Resposta:\s+([A-E])/gs;
  let match;
  let index = 1; // Contador para o número das perguntas

  questionsContainer.innerHTML = ""; // Limpa o container de perguntas antes de adicionar novas

  // Loop para encontrar todas as perguntas que correspondem à regex
  while ((match = regex.exec(text))) {
    const [_, enunciado, A, B, C, D, E, resposta] = match; // Desestrutura os grupos da regex
    const alternativas = { A, B, C, D, E }; // Objeto com as alternativas

    const div = document.createElement("div"); // Cria a div da pergunta
    div.className = "question";
    div.dataset.correct = resposta; // Armazena a resposta correta no dataset
    div.dataset.answered = "false"; // Marca a pergunta como não respondida

    const title = document.createElement("div"); // Título da pergunta (ex: "Pergunta 1")
    title.className = "question-title";
    title.innerText = `Pergunta ${index}`;
    div.appendChild(title);

    const texto = document.createElement("p"); // Enunciado da pergunta
    texto.innerText = enunciado;
    div.appendChild(texto);

    const group = document.createElement("div"); // Grupo para as opções de resposta
    group.className = "option-group";

    // Loop para criar cada opção de resposta
    Object.entries(alternativas).forEach(([letra, texto]) => {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${index}`; // Nome do grupo de rádio para que apenas uma opção seja selecionada

      // Lógica de clique na opção
      input.onclick = function () {
        if (div.dataset.answered === "true") return; // Evita que a resposta seja alterada se já respondida

        div.dataset.answered = "true"; // Marca a pergunta como respondida
        if (letra === resposta) {
          // Verifica se a opção selecionada é a correta
          label.classList.add("correct");
          div.classList.add("correct-border");
        } else {
          label.classList.add("wrong");
          div.classList.add("wrong-border");
          // Destaca a resposta correta em verde se o usuário errou
          group.querySelectorAll(".option").forEach((opt) => {
            // Verifica se o texto da opção começa com a letra da resposta correta
            if (opt.innerText.trim().startsWith(`${resposta})`)) {
              opt.classList.add("correct");
            }
          });
        }
        // Desabilita todas as opções da pergunta após a seleção
        group.querySelectorAll("input").forEach((inp) => (inp.disabled = true));
      };

      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${letra}) ${texto}`)); // Adiciona a letra e o texto da alternativa
      group.appendChild(label);
    });

    div.appendChild(group);
    questionsContainer.appendChild(div); // Adiciona a pergunta ao container
    index++; // Incrementa o contador de perguntas
  }
}

// Evento do botão "Verificar Rendimento"
checkResultsBtn.addEventListener("click", () => {
  const questions = document.querySelectorAll(".question");
  let acertos = 0;
  let erros = 0;
  let naoRespondidas = 0;
  let total = questions.length;

  resultsDisplay.innerHTML = ""; // Limpa a área de resultados
  resultsDisplay.style.display = "block"; // Mostra a área de resultados

  const percentDiv = document.createElement("div");
  percentDiv.className = "results-summary"; // Nova classe para estilização

  const gridContainer = document.createElement("div");
  gridContainer.className = "grid-container"; // Nova classe para o grid de boxes

  questions.forEach((q, index) => {
    const box = document.createElement("div");
    box.innerText = index + 1; // Número da questão
    box.className = "grid-box"; // Nova classe para as caixas do grid

    // Lógica para colorir as caixas do grid de resultados
    if (q.classList.contains("correct-border")) {
      box.classList.add("correct");
      acertos++;
    } else if (q.classList.contains("wrong-border")) {
      box.classList.add("wrong");
      erros++;
    } else {
      box.classList.add("unanswered");
      naoRespondidas++;
    }
    gridContainer.appendChild(box);
  });

  const porcentagem = total > 0 ? ((acertos / total) * 100).toFixed(0) : 0; // Evita divisão por zero

  // Preenche a div de percentuais e contadores
  percentDiv.innerHTML = `
    <h3 style="font-size: 36px; margin: 0">${porcentagem}%</h3>
    <p style="margin: 4px 0; font-size: 18px;">
      <span style="color: #2ecc71;">${acertos} Acerto${
    acertos !== 1 ? "s" : ""
  }</span> /
      <span style="color: #e74c3c;">${erros} Erro${
    erros !== 1 ? "s" : ""
  }</span>
    </p>
    ${
      naoRespondidas > 0
        ? `<p style="color: #888; font-size: 14px;">${naoRespondidas} não respondida${
            naoRespondidas !== 1 ? "s" : ""
          }</p>`
        : ""
    }
  `;
  uploadArea.style.display = "none"; // Esconde a área de upload
  newSimuladoBtn.style.display = "block"; // Mostra o botão "Adicionar Novo Simulado"
  checkResultsBtn.style.display = "block"; // Mostra o botão "Verificar Rendimento"

  resultsDisplay.appendChild(percentDiv);
  resultsDisplay.appendChild(gridContainer);
});
