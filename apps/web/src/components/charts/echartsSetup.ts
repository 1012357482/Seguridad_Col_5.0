/* Registro modular de ECharts: solo lo que usan los gráficos (se carga bajo demanda). */
import { BarChart, GaugeChart, LineChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";

echarts.use([GaugeChart, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, SVGRenderer]);

export default echarts;
