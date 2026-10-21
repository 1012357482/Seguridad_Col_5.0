import { analyzeLocal } from "@itf/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { KpiCounter } from "./charts/KpiCounter";
import { Resultado } from "./Resultado/Resultado";

// Los gráficos usan ECharts/ResizeObserver, que jsdom no implementa: se sustituyen por su texto alternativo.
vi.mock("./charts/RiskGauge", () => ({ RiskGauge: ({ puntaje }: { puntaje: number }) => <p>medidor {puntaje}</p> }));
vi.mock("./charts/SignalBreakdown", () => ({ SignalBreakdown: () => <p>desglose</p> }));

describe("componentes", () => {
  it("KpiCounter expone el valor completo a lectores de pantalla", () => {
    render(<KpiCounter valor={0} etiqueta="casos registrados" />);
    expect(screen.getByText(/casos registrados/)).toBeTruthy();
  });

  it("Resultado muestra los pasos urgentes antes del veredicto y comunica el nivel con texto", () => {
    const v = analyzeLocal({
      tipo: "relato_llamada",
      texto: "",
      relato: { quienDijoSer: "Banco", quePidio: ["codigo"], huboPresion: true, entregoAlgo: "datos", notas: "" },
    });
    const { container } = render(
      <MemoryRouter>
        <Resultado veredicto={v} provisional={false} aviso={null} evidencia={null} consentId={null} />
      </MemoryRouter>,
    );
    const urgente = screen.getByRole("heading", { name: "Haz esto ahora" });
    const titulo = screen.getByRole("heading", { name: "Riesgo alto" });
    expect(urgente.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".veredicto.alto")).toBeTruthy();
    expect(screen.getByText(/no reemplaza a tu entidad financiera/)).toBeTruthy();
  });
});
